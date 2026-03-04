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

    # 3. 예산 모드 확인
    budget_mode = await budget.get_budget_mode(db)

    # 4. 블록 생성
    blocks: schemas.CoachingBlocks
    ai_tokens_used = 0

    # 이전 코칭 요약 (연속성 제공)
    prev_summary = await _build_previous_coaching_summary(db, dog_id)

    if budget_mode == "rule_only" or not settings.OPENAI_API_KEY:
        # 규칙 기반 폴백
        blocks = rule_engine.generate_rule_based_blocks(
            dog.name, issues, triggers, total_logs, avg_intensity,
        )
        await budget.record_cost(db, 0, 0, 0, is_rule=True)
    else:
        # AI 생성 시도
        try:
            logs_summary = _build_logs_summary(logs_result)
            age_months = 0
            if dog.birth_date:
                age_months = int((date.today() - dog.birth_date).days / 30)

            user_prompt = prompts.build_user_prompt(
                dog.name, dog.breed or "믹스", age_months,
                issues, triggers, logs_summary, request.report_type,
                previous_coaching_summary=prev_summary,
            )
            result = await openai_client.generate(
                prompts.SYSTEM_PROMPT_6BLOCK, user_prompt,
            )

            parsed = _parse_ai_response(result["content"])
            blocks = schemas.CoachingBlocks(**parsed)
            ai_tokens_used = result["input_tokens"] + result["output_tokens"]

            await budget.record_cost(
                db, result["input_tokens"], result["output_tokens"], result["cost_usd"],
            )
        except (OpenAIError, json.JSONDecodeError, Exception) as e:
            logger.warning("AI coaching failed, falling back to rules: %s", e)
            blocks = rule_engine.generate_rule_based_blocks(
                dog.name, issues, triggers, total_logs, avg_intensity,
            )
            await budget.record_cost(db, 0, 0, 0, is_rule=True)

    # 5. DB 저장
    coaching = AICoaching(
        dog_id=dog_id,
        report_type=request.report_type,
        blocks=blocks.model_dump(),
        ai_tokens_used=ai_tokens_used,
    )
    db.add(coaching)
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
    db: AsyncSession, coaching_id: UUID, score: int,
) -> schemas.FeedbackResponse:
    """코칭 피드백 제출 (1-5점)"""
    q = select(AICoaching).where(AICoaching.id == coaching_id)
    result = (await db.execute(q)).scalars().first()
    if not result:
        raise NotFoundException("Coaching not found")

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
    """최근 2~3회 코칭의 trend, key_patterns를 요약 (AI 프롬프트 연속성)"""
    q = (
        select(AICoaching)
        .where(AICoaching.dog_id == dog_id)
        .order_by(desc(AICoaching.created_at))
        .limit(3)
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


def _extract_list(data, key: str) -> list:
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get(key, [])
    return []
