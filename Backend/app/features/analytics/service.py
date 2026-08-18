"""행동 분석 서비스 — behavior_logs 직접 집계 (training_behavior_snapshots 미사용)
SCHEMA-ISSUE-1: training_behavior_snapshots UNIQUE 제약으로 추이 분석 불가
→ behavior_logs 직접 집계 + idx_logs_dog_occurred 인덱스 활용
"""
import re
from datetime import datetime, timedelta, timezone
from time import perf_counter
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, case, func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.models import BehaviorLog, TrainingStepAttempt
from . import schemas

_STOPWORDS = {
    '에서','때','중','이','가','을','를','의','은','는','도','로','에','와','과',
    '도','만','까지','부터','이나','이라','라','한','하는','하고','하면','하여',
    '그','이','저','것','수','더','또','및','등','나','너','우리','아','어',
}

def _extract_keywords(text: str) -> List[str]:
    """메모 텍스트에서 의미 있는 단어 추출 (2자 이상, 조사 제외)"""
    words = re.split(r'[\s,·\(\)\.\!\?\-\/]+', text)
    return [w for w in words if len(w) >= 2 and w not in _STOPWORDS]


def _record_timing(timings: Optional[Dict[str, float]], key: str, started_at: float) -> None:
    if timings is not None:
        timings[key] = (perf_counter() - started_at) * 1000


async def get_behavior_analytics(
    db: AsyncSession,
    dog_id: UUID,
    days: int = 30,
    timings: Optional[Dict[str, float]] = None,
) -> schemas.BehaviorAnalyticsResponse:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    week_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    prev_week_cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    behavior_key = func.coalesce(
        func.nullif(BehaviorLog.behavior, ""),
        func.nullif(BehaviorLog.quick_category, ""),
        literal("unknown"),
    )
    base_filters = (
        BehaviorLog.dog_id == dog_id,
        BehaviorLog.occurred_at >= cutoff,
    )

    count_expr = func.count(BehaviorLog.id)
    aggregate_q = (
        select(
            behavior_key.label("behavior"),
            count_expr.label("count"),
            func.avg(BehaviorLog.intensity).label("avg_intensity"),
            func.avg(
                case((BehaviorLog.occurred_at >= week_cutoff, BehaviorLog.intensity))
            ).label("this_week_avg"),
            func.avg(
                case(
                    (
                        and_(
                            BehaviorLog.occurred_at >= prev_week_cutoff,
                            BehaviorLog.occurred_at < week_cutoff,
                        ),
                        BehaviorLog.intensity,
                    )
                )
            ).label("last_week_avg"),
        )
        .where(*base_filters)
        .group_by(behavior_key)
        .order_by(count_expr.desc())
    )
    started_at = perf_counter()
    aggregate_rows = (await db.execute(aggregate_q)).all()
    _record_timing(timings, "aggregate_ms", started_at)

    started_at = perf_counter()
    total_logs = sum(int(row.count or 0) for row in aggregate_rows)

    if total_logs == 0:
        response = schemas.BehaviorAnalyticsResponse(
            dog_id=str(dog_id),
            analysis_days=days,
            total_logs=0,
            top_behaviors=[],
            avg_intensity_by_behavior={},
            weekly_trend={},
            peak_hour=None,
            stats=[],
            memo_keywords={},
        )
        _record_timing(timings, "serialize_ms", started_at)
        return response

    top_behaviors = [row.behavior for row in aggregate_rows]
    avg_intensity_by_behavior: dict[str, float] = {
        row.behavior: round(
            float(row.avg_intensity) if row.avg_intensity is not None else 5.0,
            1,
        )
        for row in aggregate_rows
    }
    weekly_trend: dict[str, str] = {}
    for row in aggregate_rows:
        if row.this_week_avg is None or row.last_week_avg is None:
            weekly_trend[row.behavior] = "stable"
            continue
        delta = float(row.this_week_avg) - float(row.last_week_avg)
        if delta <= -0.5:
            weekly_trend[row.behavior] = "improving"
        elif delta >= 0.5:
            weekly_trend[row.behavior] = "worsening"
        else:
            weekly_trend[row.behavior] = "stable"
    _record_timing(timings, "compute_ms", started_at)

    hour_expr = func.extract("hour", BehaviorLog.occurred_at)
    peak_q = (
        select(hour_expr.label("hour"), func.count(BehaviorLog.id).label("count"))
        .where(*base_filters, BehaviorLog.occurred_at.is_not(None))
        .group_by(hour_expr)
        .order_by(func.count(BehaviorLog.id).desc(), hour_expr.asc())
        .limit(1)
    )
    started_at = perf_counter()
    peak_row = (await db.execute(peak_q)).first()
    _record_timing(timings, "peak_ms", started_at)
    peak_hour = int(peak_row.hour) if peak_row and peak_row.hour is not None else None

    started_at = perf_counter()
    stats = [
        schemas.BehaviorStat(
            behavior=row.behavior,
            count=int(row.count or 0),
            avg_intensity=avg_intensity_by_behavior[row.behavior],
            trend=weekly_trend.get(row.behavior, "stable"),
        )
        for row in aggregate_rows
    ]

    memo_q = (
        select(behavior_key.label("behavior"), BehaviorLog.memo.label("memo"))
        .where(*base_filters, BehaviorLog.memo.is_not(None), BehaviorLog.memo != "")
    )
    started_at = perf_counter()
    memo_rows = (await db.execute(memo_q)).all()
    _record_timing(timings, "memo_ms", started_at)

    started_at = perf_counter()
    memo_keywords: Dict[str, List[str]] = {}
    word_freq_by_behavior: Dict[str, Dict[str, int]] = {}
    for row in memo_rows:
        if row.memo and isinstance(row.memo, str) and row.memo.strip():
            word_freq = word_freq_by_behavior.setdefault(row.behavior, {})
            for word in _extract_keywords(row.memo[:100]):
                word_freq[word] = word_freq.get(word, 0) + 1
    for behavior, word_freq in word_freq_by_behavior.items():
        sorted_words = sorted(word_freq, key=lambda w: word_freq[w], reverse=True)
        memo_keywords[behavior] = sorted_words[:5]
    _record_timing(timings, "keywords_ms", started_at)

    started_at = perf_counter()
    response = schemas.BehaviorAnalyticsResponse(
        dog_id=str(dog_id),
        analysis_days=days,
        total_logs=total_logs,
        top_behaviors=top_behaviors,
        avg_intensity_by_behavior=avg_intensity_by_behavior,
        weekly_trend=weekly_trend,
        peak_hour=peak_hour,
        stats=stats,
        memo_keywords=memo_keywords,
    )
    _record_timing(timings, "serialize_ms", started_at)
    return response


async def get_step_attempts(
    db: AsyncSession,
    dog_id: UUID,
    step_id: Optional[str] = None,
    limit: int = 20,
) -> List[schemas.StepAttemptResponse]:
    """시행착오 기록 조회 — training_step_attempts"""
    q = (
        select(TrainingStepAttempt)
        .where(TrainingStepAttempt.dog_id == dog_id)
        .order_by(TrainingStepAttempt.created_at.desc())
        .limit(limit)
    )
    if step_id:
        q = q.where(TrainingStepAttempt.step_id == step_id)

    result = await db.execute(q)
    rows = result.scalars().all()

    return [
        schemas.StepAttemptResponse(
            id=str(r.id),
            dog_id=str(r.dog_id),
            step_id=r.step_id,
            curriculum_id=r.curriculum_id,
            day_number=r.day_number,
            attempt_number=r.attempt_number,
            reaction=r.reaction,
            situation_tags=r.situation_tags,
            method_used=r.method_used,
            what_worked=r.what_worked,
            what_didnt_work=r.what_didnt_work,
            recorded_by=str(r.recorded_by) if r.recorded_by else None,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


async def create_step_attempt(
    db: AsyncSession,
    dog_id: UUID,
    data: schemas.StepAttemptCreate,
    recorded_by: str,
) -> schemas.StepAttemptResponse:
    """시행착오 기록 저장 — router에서 dog ownership 검증 후 호출."""
    row = TrainingStepAttempt(
        dog_id=dog_id,
        step_id=data.step_id,
        curriculum_id=data.curriculum_id,
        day_number=data.day_number,
        attempt_number=data.attempt_number,
        reaction=data.reaction,
        situation_tags=data.situation_tags,
        method_used=data.method_used,
        what_worked=data.what_worked,
        what_didnt_work=data.what_didnt_work,
        recorded_by=UUID(recorded_by),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return schemas.StepAttemptResponse(
        id=str(row.id),
        dog_id=str(row.dog_id),
        step_id=row.step_id,
        curriculum_id=row.curriculum_id,
        day_number=row.day_number,
        attempt_number=row.attempt_number,
        reaction=row.reaction,
        situation_tags=row.situation_tags,
        method_used=row.method_used,
        what_worked=row.what_worked,
        what_didnt_work=row.what_didnt_work,
        recorded_by=str(row.recorded_by) if row.recorded_by else None,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )
