"""
AI 코칭 서비스 — 6블록 생성 (AI + 규칙 폴백), 예산 게이팅, 피드백
FE api/coaching.ts 매핑: getCoachings, getLatestCoaching, submitFeedback
DogCoach coach/service.py + ai_recommendations/service.py 통합
Parity: AI-001
"""
import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.features.coaching import budget, prompts, rule_engine, schemas
from app.shared.clients.openai_client import OpenAIError, openai_client
from app.shared.models import AICoaching, BehaviorLog, Dog, DogEnv
from app.shared.utils.ownership import verify_dog_ownership

logger = logging.getLogger(__name__)


async def generate_coaching(
    db: AsyncSession, request: schemas.CoachingRequest,
) -> schemas.CoachingResponse:
    """6블록 코칭 생성 (캐시 → 예산 확인 → AI/규칙)"""
    dog_id = UUID(request.dog_id)

    # 1. Dog + DogEnv 조회
    dog_result = await db.execute(select(Dog).where(Dog.id == dog_id))
    dog = dog_result.scalar_one_or_none()
    if not dog:
        raise NotFoundException("Dog not found")

    env_result = await db.execute(select(DogEnv).where(DogEnv.dog_id == dog_id))
    env = env_result.scalar_one_or_none()

    # 2. 최근 로그 수집
    logs_q = (
        select(BehaviorLog)
        .where(BehaviorLog.dog_id == dog_id)
        .order_by(desc(BehaviorLog.occurred_at))
        .limit(50)
    )
    logs_result = (await db.execute(logs_q)).scalars().all()

    issues = _extract_list(env.chronic_issues if env else None, "top_issues")
    triggers = _extract_list(env.triggers if env else None, "ids")

    total_logs = len(logs_result)
    avg_intensity = (
        sum(l.intensity for l in logs_result if l.intensity) / total_logs
        if total_logs > 0 else 5.0
    )

    # 3. 예산 모드 + 설문 게이트 확인
    budget_mode = await budget.get_budget_mode(db)
    coaching_gate = _check_coaching_gate(env)

    # 4. 블록 생성
    blocks: schemas.CoachingBlocks
    ai_tokens_used = 0

    # 이전 코칭 요약 (연속성 — 최근 5회)
    prev_summary = await _build_previous_coaching_summary(db, dog_id)

    # onboarding_context 추출 (Stage별 프롬프트 품질 차등)
    onboarding_ctx = _build_onboarding_context(env)

    if budget_mode == "rule_only" or not settings.OPENAI_API_KEY or not coaching_gate:
        # 규칙 기반 폴백 (예산 초과 or API 키 없음 or Stage 1)
        blocks = rule_engine.generate_rule_based_blocks(
            dog.name, issues, triggers, total_logs, avg_intensity,
        )
        try:
            await budget.record_cost(db, 0, 0, 0, is_rule=True)
        except Exception as e:
            logger.warning("budget.record_cost (rule fallback) failed: %s", e)
        analytics_metadata = {"log_count": total_logs, "analysis_days": 30, "top_behavior": None}
    else:
        # AI 생성 시도
        try:
            behavior_analytics_text, analytics_metadata = await _build_behavior_analytics_text(db, dog_id, logs_result)
            age_months = 0
            if dog.birth_date:
                age_months = int((date.today() - dog.birth_date).days / 30)

            user_prompt = prompts.build_user_prompt(
                dog.name, dog.breed or "믹스", age_months,
                issues, triggers, behavior_analytics_text, request.report_type,
                previous_coaching_summary=prev_summary,
                onboarding_context=onboarding_ctx,
            )
            result = await openai_client.generate(
                prompts.SYSTEM_PROMPT_6BLOCK, user_prompt,
                model=settings.AI_COACHING_MODEL,
            )

            parsed = _parse_ai_response(result["content"])
            blocks = schemas.CoachingBlocks(**parsed)
            blocks = _apply_safety_filter(blocks)  # 앱인토스 AI 심사 필수: 위험 콘텐츠 사후 필터
            ai_tokens_used = result["input_tokens"] + result["output_tokens"]

            await budget.record_cost(
                db, result["input_tokens"], result["output_tokens"], result["cost_usd"],
            )
        except (OpenAIError, json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning("AI coaching failed, falling back to rules: %s", e)
            blocks = rule_engine.generate_rule_based_blocks(
                dog.name, issues, triggers, total_logs, avg_intensity,
            )
            try:
                await budget.record_cost(db, 0, 0, 0, is_rule=True)
            except Exception as e:
                logger.warning("budget.record_cost (AI fallback) failed: %s", e)
            analytics_metadata = {"log_count": total_logs, "analysis_days": 30, "top_behavior": None}

    # 5. DB 저장
    coaching = AICoaching(
        dog_id=dog_id,
        report_type=request.report_type,
        blocks=blocks.model_dump(),
        ai_tokens_used=ai_tokens_used,
    )
    db.add(coaching)
    await db.flush()

    # 6. 훈련 후보 품질 태깅 (비동기 — 실패해도 코칭 응답에 영향 없음)
    try:
        from app.features.coaching.training import tag_training_candidate
        await tag_training_candidate(db, coaching)
    except Exception as e:
        logger.warning("training candidate tagging failed: %s", e)

    await db.commit()
    await db.refresh(coaching)

    return schemas.CoachingResponse(
        id=coaching.id,
        dog_id=coaching.dog_id,
        report_type=coaching.report_type,
        blocks=blocks,
        feedback_score=coaching.feedback_score,
        ai_tokens_used=ai_tokens_used,
        created_at=coaching.created_at,
        analytics_metadata=analytics_metadata,
    )


async def get_coaching_list(
    db: AsyncSession, dog_id: UUID, limit: int = 10,
) -> List[schemas.CoachingResponse]:
    """코칭 목록 조회"""
    q = (
        select(AICoaching)
        .where(AICoaching.dog_id == dog_id)
        .order_by(desc(AICoaching.created_at))
        .limit(limit)
    )
    results = (await db.execute(q)).scalars().all()
    return [_to_response(c) for c in results]


async def get_latest_coaching(
    db: AsyncSession, dog_id: UUID,
) -> Optional[schemas.CoachingResponse]:
    """최신 코칭 결과 조회"""
    q = (
        select(AICoaching)
        .where(AICoaching.dog_id == dog_id)
        .order_by(desc(AICoaching.created_at))
        .limit(1)
    )
    result = (await db.execute(q)).scalars().first()
    if not result:
        return None
    return _to_response(result)


async def submit_feedback(
    db: AsyncSession, coaching_id: UUID, score: int, user_id: str,
) -> schemas.FeedbackResponse:
    """코칭 피드백 제출 (1-5점) — dog 소유권 검증 포함"""
    q = select(AICoaching).where(AICoaching.id == coaching_id)
    result = (await db.execute(q)).scalars().first()
    if not result:
        raise NotFoundException("Coaching not found")

    await verify_dog_ownership(db, result.dog_id, user_id=user_id)

    result.feedback_score = score
    await db.commit()

    return schemas.FeedbackResponse(coaching_id=coaching_id, feedback_score=score)


async def toggle_action_item(
    db: AsyncSession,
    coaching_id: UUID,
    action_item_id: str,
    is_completed: bool,
) -> schemas.ActionTrackerResponse:
    """액션 아이템 완료 토글 (upsert)"""
    from app.shared.models import ActionTracker

    q = select(ActionTracker).where(
        ActionTracker.coaching_id == coaching_id,
        ActionTracker.action_item_id == action_item_id,
    )
    result = (await db.execute(q)).scalars().first()

    now = datetime.now(timezone.utc)

    if result:
        result.is_completed = is_completed
        result.completed_at = now if is_completed else None
    else:
        result = ActionTracker(
            coaching_id=coaching_id,
            action_item_id=action_item_id,
            is_completed=is_completed,
            completed_at=now if is_completed else None,
        )
        db.add(result)

    await db.commit()
    await db.refresh(result)

    return schemas.ActionTrackerResponse(
        id=result.id,
        coaching_id=result.coaching_id,
        action_item_id=result.action_item_id,
        is_completed=result.is_completed,
        completed_at=result.completed_at,
    )


async def get_cost_status(db: AsyncSession) -> schemas.CostStatusResponse:
    """AI 비용 현황"""
    from app.shared.models import AICostUsageDaily, AICostUsageMonthly

    today = date.today()
    first_of_month = today.replace(day=1)

    daily_q = select(AICostUsageDaily).where(AICostUsageDaily.usage_date == today)
    daily = (await db.execute(daily_q)).scalar_one_or_none()

    monthly_q = select(AICostUsageMonthly).where(AICostUsageMonthly.usage_month == first_of_month)
    monthly = (await db.execute(monthly_q)).scalar_one_or_none()

    budget_mode = await budget.get_budget_mode(db)

    return schemas.CostStatusResponse(
        daily_calls=daily.total_calls if daily else 0,
        daily_cost_usd=float(daily.total_cost_usd) if daily else 0.0,
        daily_budget_usd=settings.AI_DAILY_BUDGET_USD,
        monthly_cost_usd=float(monthly.total_cost_usd) if monthly else 0.0,
        monthly_budget_usd=settings.AI_MONTHLY_BUDGET_USD,
        budget_mode=budget_mode,
    )


# 헬퍼 함수

def _to_response(coaching: AICoaching) -> schemas.CoachingResponse:
    blocks_data = coaching.blocks or {}
    return schemas.CoachingResponse(
        id=coaching.id,
        dog_id=coaching.dog_id,
        report_type=coaching.report_type,
        blocks=schemas.CoachingBlocks(**blocks_data) if blocks_data else schemas.CoachingBlocks(),
        feedback_score=coaching.feedback_score,
        ai_tokens_used=coaching.ai_tokens_used or 0,
        created_at=coaching.created_at,
        analytics_metadata=None,
    )


def _build_logs_summary(logs: list) -> str:
    """최근 로그를 텍스트 요약으로 변환"""
    lines = []
    for log in logs[:20]:
        dt = log.occurred_at.strftime("%Y-%m-%d") if log.occurred_at else "N/A"
        behavior = log.behavior or log.quick_category or "unknown"
        lines.append(f"- [{dt}] {behavior} (intensity: {log.intensity})")
    return "\n".join(lines) if lines else "No recent logs"


def _parse_ai_response(content: str) -> dict:
    """AI 응답에서 JSON 추출"""
    # 마크다운 코드 펜스 제거
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(cleaned)


async def _build_previous_coaching_summary(db: AsyncSession, dog_id: UUID) -> str | None:
    """최근 5회 코칭의 trend, key_patterns를 요약 (AI 프롬프트 연속성)"""
    q = (
        select(AICoaching)
        .where(AICoaching.dog_id == dog_id)
        .order_by(desc(AICoaching.created_at))
        .limit(5)
    )
    results = (await db.execute(q)).scalars().all()
    if not results:
        return None

    lines = []
    for c in results:
        blocks = c.blocks or {}
        insight = blocks.get("insight", {})
        trend = insight.get("trend", "unknown")
        patterns = insight.get("key_patterns", [])
        dt = c.created_at.strftime("%Y-%m-%d") if c.created_at else "N/A"
        lines.append(f"- [{dt}] Trend: {trend}, Patterns: {', '.join(patterns[:3])}")

    return "\n".join(lines) if lines else None


def _check_coaching_gate(env: Optional[DogEnv]) -> bool:
    """Stage 2 이상이어야 AI 코칭 활성화. Stage 1은 규칙 기반 폴백."""
    if not env or not env.onboarding_survey:
        return False
    stage = int(env.onboarding_survey.get("completion_stage", 1))
    return stage >= 2


def _build_onboarding_context(env: Optional[DogEnv]) -> dict | None:
    """DogEnv.onboarding_survey → prompts.build_user_prompt용 context dict"""
    if not env or not env.onboarding_survey:
        return None
    survey = env.onboarding_survey
    stage = int(survey.get("completion_stage", 1))
    if stage < 2:
        return None

    ctx: dict = {"stage": stage}

    # Stage 2 응답 우선, 없으면 기존 DogEnv 필드 fallback
    s2 = survey.get("stage2_response")
    if s2:
        ctx["stage2"] = s2
    else:
        ctx["stage2"] = {
            "household_info": env.household_info,
            "chronic_issues": env.chronic_issues,
            "triggers": env.triggers,
            "past_attempts": env.past_attempts,
        }

    if stage >= 3:
        s3 = survey.get("stage3_response")
        if s3:
            ctx["stage3"] = s3
        else:
            ctx["stage3"] = {
                "temperament": env.temperament,
                "health_meta": env.health_meta,
                "activity_meta": env.activity_meta,
                "rewards_meta": env.rewards_meta,
            }

    return ctx


def _extract_list(data, key: str) -> list:
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get(key, [])
    return []


# 위험 키워드 — 인간 안전 (앱인토스 AI 서비스 심사 필수 요건)
# "자해" / "혐오"는 반려견 행동 문맥에서 정상 사용됨(자해 행동, 혐오 반응 훈련) → 제외
_HUMAN_SAFETY_KEYWORDS: list[str] = [
    "자살", "자살방법", "죽는방법",
    "마약", "약물남용", "코카인", "헤로인", "필로폰",
    "살인", "살해", "범죄방법", "폭발물",
    "인종차별",
]

# 위험 키워드 — 반려견 학대 (긍정 강화 금지 행동 직접 지시 패턴만)
# 동사 활용형 포함: "때리" + "때려" (때려서/때려라), "굶겨" 등
_DOG_ABUSE_KEYWORDS: list[str] = [
    "굶기", "굶겨", "굶어", "체벌", "때리", "때려", "발로차", "학대",
    "전기충격", "쇼크칼라", "목조르", "묶어두",
]

# 부정 표현 — 키워드 주변 25자 이내에 있으면 false positive로 무시
_NEGATION_MARKERS: list[str] = [
    "마세요", "하지마", "하지 마", "면 안", "면안", "하면안",
    "않습니다", "안됩니다", "역효과", "절대", "금지", "피하세요",
]

# 키워드 직후 조건/원인 어미 — 지시가 아닌 묘사 문맥으로 판단
_CONDITIONAL_SUFFIXES: tuple[str, ...] = ("면", "으면", "아서", "어서", "면서")

_SAFETY_RECOMMENDATION = "즉시 수의사 또는 전문 훈련사와 상담하세요. 이 내용은 AI가 생성한 제안이며 전문적인 조언을 대체하지 않습니다."
_SAFETY_SIGNAL = {
    "type": "SAFETY_FILTER_TRIGGERED",
    "description": "AI 안전 필터가 적용되었습니다. 전문가 상담을 권장합니다.",
    "severity": "high",
    "recommendation": _SAFETY_RECOMMENDATION,
}


def _keyword_matches_affirmative(text: str, kw: str) -> bool:
    """키워드가 부정/조건 표현 없이 긍정/지시 문맥에서 등장하면 True."""
    start = 0
    while True:
        idx = text.find(kw, start)
        if idx == -1:
            return False
        suffix = text[idx + len(kw): idx + len(kw) + 3]
        if any(suffix.startswith(s) for s in _CONDITIONAL_SUFFIXES):
            start = idx + 1
            continue
        window = text[max(0, idx - 25): idx + len(kw) + 15]
        if not any(neg in window for neg in _NEGATION_MARKERS):
            return True
        start = idx + 1


def _contains_unsafe_content(text: str) -> tuple[bool, str]:
    """텍스트에서 위험 키워드 감지. 부정 표현 주변은 무시한다."""
    for kw in _HUMAN_SAFETY_KEYWORDS:
        if _keyword_matches_affirmative(text, kw):
            return True, "human_safety"
    for kw in _DOG_ABUSE_KEYWORDS:
        if _keyword_matches_affirmative(text, kw):
            return True, "dog_abuse"
    return False, ""


def _collect_all_block_text(blocks: schemas.CoachingBlocks) -> str:
    """CoachingBlocks 전체 텍스트 필드 수집."""
    parts: list[str] = []
    if blocks.insight:
        parts += [blocks.insight.title, blocks.insight.summary] + blocks.insight.key_patterns
    if blocks.action_plan:
        parts.append(blocks.action_plan.title)
        parts += [item.description for item in blocks.action_plan.items]
    if blocks.dog_voice:
        parts.append(blocks.dog_voice.message)
    if blocks.next_7_days:
        for day in blocks.next_7_days.days:
            parts.append(day.focus)
            parts += day.tasks
    if blocks.risk_signals:
        parts += [s.description for s in blocks.risk_signals.signals]
    if blocks.consultation_questions:
        parts += blocks.consultation_questions.questions
    return " ".join(p for p in parts if p)


def _apply_safety_filter(blocks: schemas.CoachingBlocks) -> schemas.CoachingBlocks:
    """AI 응답 사후 안전 필터 — 위험 콘텐츠 감지 시 전체 블록 교체."""
    combined = _collect_all_block_text(blocks)
    flagged, category = _contains_unsafe_content(combined)
    if not flagged:
        return blocks

    logger.warning("Safety filter triggered (category=%s) — replacing all blocks", category)

    # 유해 텍스트를 그대로 두지 않고 전체 블록을 안전한 내용으로 교체
    return schemas.CoachingBlocks(
        insight=schemas.InsightBlock(
            title="전문가 상담 안내",
            summary="안전한 훈련을 위해 전문 훈련사 또는 수의사 상담을 권장합니다.",
            key_patterns=[],
            trend="stable",
        ),
        action_plan=schemas.ActionPlanBlock(
            title="전문가 상담",
            items=[
                schemas.ActionItem(
                    id="safety_1",
                    description="수의사 또는 공인 훈련사와 직접 상담하세요.",
                    priority="high",
                )
            ],
        ),
        dog_voice=schemas.DogVoiceBlock(
            message="저는 전문가의 도움이 필요해요. 함께 올바른 방법을 찾아봐요.",
            emotion="hopeful",
        ),
        next_7_days=schemas.Next7DaysBlock(days=[]),
        risk_signals=schemas.RiskSignalsBlock(
            signals=[schemas.RiskSignal(**_SAFETY_SIGNAL)],
            overall_risk="critical",
        ),
        consultation_questions=schemas.ConsultationQuestionsBlock(
            questions=["전문 훈련사 또는 수의 행동학 전문의 상담을 받아보세요."],
            recommended_specialist="trainer",
        ),
    )


async def _build_behavior_analytics_text(
    db: AsyncSession, dog_id: UUID, logs: list
) -> tuple[str, dict]:
    """behavior_logs 기반 구조화된 분석 텍스트 생성 (프롬프트 주입용)"""
    if not logs:
        return "No recent behavior logs", {"log_count": 0, "analysis_days": 30, "top_behavior": None}

    # behavior 집계
    behavior_groups: dict[str, list] = {}
    hour_counts: dict[int, int] = {}

    from datetime import datetime, timedelta, timezone
    cutoff_30 = datetime.now(timezone.utc) - timedelta(days=30)

    for log in logs[:50]:  # 최대 50개
        key = log.behavior or log.quick_category or "unknown"
        behavior_groups.setdefault(key, []).append(log)
        if log.occurred_at:
            h = log.occurred_at.hour
            hour_counts[h] = hour_counts.get(h, 0) + 1

    total = len(logs)
    lines = [f"[행동 패턴 분석 (최근 30일)] 총 {total}회 기록"]

    top_behavior = None
    for behavior, blogs in sorted(behavior_groups.items(), key=lambda x: len(x[1]), reverse=True):
        intensities = [l.intensity for l in blogs if l.intensity is not None]
        avg_int = round(sum(intensities) / len(intensities), 1) if intensities else 0.0

        # peak hour for this behavior
        bh: dict[int, int] = {}
        for l in blogs:
            if l.occurred_at:
                bh[l.occurred_at.hour] = bh.get(l.occurred_at.hour, 0) + 1
        peak = max(bh, key=lambda h: bh[h]) if bh else None
        peak_str = f", {peak:02d}시 집중" if peak is not None else ""

        lines.append(f"- {behavior}: {len(blogs)}회, 평균 강도 {avg_int}/10{peak_str}")

        if top_behavior is None:
            top_behavior = behavior

    # weekly trend (이번주 vs 지난주)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)
    trend_lines = []

    def safe_dt(l):
        if l.occurred_at is None:
            return None
        if l.occurred_at.tzinfo is None:
            return l.occurred_at.replace(tzinfo=timezone.utc)
        return l.occurred_at

    for behavior, blogs in list(behavior_groups.items())[:3]:
        this_w = [
            l.intensity
            for l in blogs
            if safe_dt(l) and safe_dt(l) >= week_ago and l.intensity is not None
        ]
        last_w = [
            l.intensity
            for l in blogs
            if safe_dt(l) and two_weeks_ago <= safe_dt(l) < week_ago and l.intensity is not None
        ]

        if this_w and last_w:
            ta = sum(this_w) / len(this_w)
            la = sum(last_w) / len(last_w)
            delta = ta - la
            arrow = "▲ 악화" if delta >= 0.5 else ("▼ 개선" if delta <= -0.5 else "→ 유지")
            trend_lines.append(f"{behavior}: 지난주 {la:.1f} → 이번주 {ta:.1f} ({arrow})")

    if trend_lines:
        lines.append("[추이] " + ", ".join(trend_lines))

    # peak hour overall
    if hour_counts:
        peak_h = max(hour_counts, key=lambda h: hour_counts[h])
        lines.append(f"[피크 시간대] {peak_h:02d}시")

    # 메모 컨텍스트 섹션 — 로그 10개 이상 + 메모 있는 로그 3개 이상일 때만 포함 (토큰 절감)
    memo_logs_count = sum(1 for log in logs[:50] if log.memo and isinstance(log.memo, str) and log.memo.strip())
    if total >= 10 and memo_logs_count >= 3:
        memo_contexts: dict[str, list[str]] = {}
        for log in logs[:50]:
            if log.memo and isinstance(log.memo, str) and log.memo.strip():
                key = log.quick_category or log.behavior or "other"
                if key not in memo_contexts:
                    memo_contexts[key] = []
                trimmed = log.memo.strip()[:80]
                if trimmed not in memo_contexts[key] and len(memo_contexts[key]) < 3:
                    memo_contexts[key].append(trimmed)
        if memo_contexts:
            lines.append("\n[행동 발생 상황 메모]")
            for behavior, contexts in list(memo_contexts.items())[:3]:
                lines.append(f"- {behavior}: {', '.join(contexts)}")

    analytics_text = "\n".join(lines)
    metadata = {
        "log_count": total,
        "analysis_days": 30,
        "top_behavior": top_behavior,
    }
    return analytics_text, metadata


# ── Phase 3: AI 코치 1:1 질문 (Pro 전용) ────────────────────────────────────

async def ask_coach(
    db: AsyncSession,
    user_id: str,
    dog_id: UUID,
    request: schemas.CoachingQuestionRequest,
) -> schemas.CoachingQuestionResponse:
    """Pro 전용 AI 코치 1:1 질문 — Dog+DogEnv+로그 100건 풀 컨텍스트"""
    from app.shared.models import CoachingQuestion, Subscription

    # 1. Pro 구독 확인
    sub_q = select(Subscription).where(Subscription.user_id == UUID(user_id))
    sub = (await db.execute(sub_q)).scalar_one_or_none()
    is_pro = (
        sub is not None
        and sub.plan_type.value in ("PRO_MONTHLY", "PRO_YEARLY")
        and sub.is_active
    )
    if not is_pro:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("AI 코치 질문은 Pro 구독 전용 기능이에요")

    # 2. Dog + DogEnv 조회 (소유권 포함)
    dog = (await db.execute(select(Dog).where(Dog.id == dog_id))).scalar_one_or_none()
    if not dog or str(dog.user_id) != user_id:
        raise NotFoundException("Dog not found")

    env = (await db.execute(select(DogEnv).where(DogEnv.dog_id == dog_id))).scalar_one_or_none()

    # 3. 최근 로그 100건 수집
    logs_q = (
        select(BehaviorLog)
        .where(BehaviorLog.dog_id == dog_id)
        .order_by(desc(BehaviorLog.occurred_at))
        .limit(100)
    )
    logs = (await db.execute(logs_q)).scalars().all()

    # 4. 최근 코칭 1건 (컨텍스트 보강)
    latest_coaching = await get_latest_coaching(db, dog_id)

    # 5. 프롬프트 구성
    issues = _extract_list(env.chronic_issues if env else None, "top_issues")
    triggers = _extract_list(env.triggers if env else None, "ids")
    age_months = 0
    if dog.birth_date:
        age_months = int((date.today() - dog.birth_date).days / 30)

    behavior_text = _build_logs_summary(list(logs))
    onboarding_ctx = _build_onboarding_context(env)

    coaching_summary = None
    if latest_coaching:
        insight = latest_coaching.blocks.insight
        coaching_summary = (
            f"최근 코칭 트렌드: {insight.trend}, "
            f"주요 패턴: {', '.join(insight.key_patterns[:3])}"
        )

    base_context = prompts.build_user_prompt(
        dog.name, dog.breed or "믹스", age_months,
        issues, triggers, behavior_text, "INSIGHT",
        previous_coaching_summary=coaching_summary,
        onboarding_context=onboarding_ctx,
    )

    user_question_prompt = (
        f"{base_context}\n\n"
        f"보호자 질문:\n{request.question}"
    )
    if request.context:
        user_question_prompt += f"\n\n추가 상황 설명:\n{request.context}"
    user_question_prompt += "\n\n위 질문에 대해 전문적이고 따뜻하게 답변해 주세요. JSON 형식 없이 자연스러운 한국어(존댓말, 요체) 텍스트로 답변하세요."

    # 6. AI 호출
    try:
        result = await openai_client.generate(
            prompts.SYSTEM_PROMPT_6BLOCK, user_question_prompt,
            model=settings.AI_COACHING_MODEL,
        )
        answer = result["content"].strip()
        ai_tokens_used = result["input_tokens"] + result["output_tokens"]
        await budget.record_cost(db, result["input_tokens"], result["output_tokens"], result["cost_usd"])
    except OpenAIError as e:
        logger.error("ask_coach AI call failed: %s", e)
        raise BadRequestException("AI 답변 생성에 실패했어요. 잠시 후 다시 시도해 주세요.")

    # 7. 저장
    from datetime import date as _date
    billing_period = _date.today().strftime("%Y-%m")
    question_record = CoachingQuestion(
        user_id=UUID(user_id),
        dog_id=dog_id,
        question=request.question,
        context=request.context,
        answer=answer,
        billing_period=billing_period,
        ai_tokens_used=ai_tokens_used,
    )
    db.add(question_record)
    await db.commit()
    await db.refresh(question_record)

    return schemas.CoachingQuestionResponse(
        id=question_record.id,
        dog_id=question_record.dog_id,
        question=question_record.question,
        answer=question_record.answer,
        billing_period=question_record.billing_period,
        ai_tokens_used=question_record.ai_tokens_used,
        created_at=question_record.created_at,
    )


async def get_question_history(
    db: AsyncSession,
    user_id: str,
    dog_id: UUID,
    limit: int = 20,
) -> list[schemas.CoachingQuestionResponse]:
    """이 강아지의 질문 이력 조회 (최신순)"""
    from app.shared.models import CoachingQuestion

    q = (
        select(CoachingQuestion)
        .where(
            CoachingQuestion.user_id == UUID(user_id),
            CoachingQuestion.dog_id == dog_id,
        )
        .order_by(desc(CoachingQuestion.created_at))
        .limit(limit)
    )
    records = (await db.execute(q)).scalars().all()
    return [
        schemas.CoachingQuestionResponse(
            id=r.id,
            dog_id=r.dog_id,
            question=r.question,
            answer=r.answer,
            billing_period=r.billing_period or "",
            ai_tokens_used=r.ai_tokens_used or 0,
            created_at=r.created_at,
        )
        for r in records
    ]
