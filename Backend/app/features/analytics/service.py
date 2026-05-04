"""행동 분석 서비스 — behavior_logs 직접 집계 (training_behavior_snapshots 미사용)
SCHEMA-ISSUE-1: training_behavior_snapshots UNIQUE 제약으로 추이 분석 불가
→ behavior_logs 직접 집계 + idx_logs_dog_occurred 인덱스 활용
"""
import re
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Dict, List, Optional

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


async def get_behavior_analytics(
    db: AsyncSession,
    dog_id: UUID,
    days: int = 30,
) -> schemas.BehaviorAnalyticsResponse:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # 전체 로그 조회 (인덱스 활용)
    q = (
        select(BehaviorLog)
        .where(
            BehaviorLog.dog_id == dog_id,
            BehaviorLog.occurred_at >= cutoff,
        )
        .order_by(BehaviorLog.occurred_at)
    )
    logs = (await db.execute(q)).scalars().all()

    total_logs = len(logs)

    if total_logs == 0:
        return schemas.BehaviorAnalyticsResponse(
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

    # behavior 집계
    behavior_groups: dict[str, list[BehaviorLog]] = {}
    for log in logs:
        key = log.behavior or log.quick_category or "unknown"
        behavior_groups.setdefault(key, []).append(log)

    # avg_intensity per behavior
    avg_intensity_by_behavior: dict[str, float] = {}
    for behavior, blogs in behavior_groups.items():
        intensities = [l.intensity for l in blogs if l.intensity is not None]
        avg_intensity_by_behavior[behavior] = round(
            sum(intensities) / len(intensities) if intensities else 5.0, 1
        )

    # 빈도순 top_behaviors
    top_behaviors = sorted(
        behavior_groups.keys(),
        key=lambda b: len(behavior_groups[b]),
        reverse=True,
    )

    # weekly trend (이번주 vs 지난주 avg_intensity 비교)
    week_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    prev_week_cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    weekly_trend: dict[str, str] = {}
    for behavior, blogs in behavior_groups.items():
        this_week = [
            l.intensity
            for l in blogs
            if l.occurred_at and l.occurred_at >= week_cutoff and l.intensity is not None
        ]
        last_week = [
            l.intensity
            for l in blogs
            if l.occurred_at
            and prev_week_cutoff <= l.occurred_at < week_cutoff
            and l.intensity is not None
        ]
        if not this_week or not last_week:
            weekly_trend[behavior] = "stable"
            continue
        this_avg = sum(this_week) / len(this_week)
        last_avg = sum(last_week) / len(last_week)
        delta = this_avg - last_avg
        if delta <= -0.5:
            weekly_trend[behavior] = "improving"
        elif delta >= 0.5:
            weekly_trend[behavior] = "worsening"
        else:
            weekly_trend[behavior] = "stable"

    # peak_hour (가장 많이 발생한 시간대)
    hour_counts: dict[int, int] = {}
    for log in logs:
        if log.occurred_at:
            h = log.occurred_at.hour
            hour_counts[h] = hour_counts.get(h, 0) + 1
    peak_hour = max(hour_counts, key=lambda h: hour_counts[h]) if hour_counts else None

    # stats 조합
    stats = [
        schemas.BehaviorStat(
            behavior=behavior,
            count=len(blogs),
            avg_intensity=avg_intensity_by_behavior[behavior],
            trend=weekly_trend.get(behavior, "stable"),
        )
        for behavior, blogs in sorted(
            behavior_groups.items(), key=lambda x: len(x[1]), reverse=True
        )
    ]

    # memo 키워드 집계 (behavior별 최대 5개 키워드, 빈도순)
    memo_keywords: Dict[str, List[str]] = {}
    for behavior, blogs in behavior_groups.items():
        word_freq: Dict[str, int] = {}
        for log in blogs:
            if log.memo and isinstance(log.memo, str) and log.memo.strip():
                for word in _extract_keywords(log.memo[:100]):
                    word_freq[word] = word_freq.get(word, 0) + 1
        if word_freq:
            sorted_words = sorted(word_freq, key=lambda w: word_freq[w], reverse=True)
            memo_keywords[behavior] = sorted_words[:5]

    return schemas.BehaviorAnalyticsResponse(
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
