"""
AI 비용 관리 — 일일/월간 예산, 사용자 버스트 제한, 캐시 중복제거
DogCoach ai_recommendations/budget.py 마이그레이션
Parity: AI-001
"""
import hashlib
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.shared.models import AICostUsageDaily, AICostUsageMonthly, AIRecommendationSnapshot


def compute_dedupe_key(dog_id: str, window_days: int, issue: str, summary_hash: str) -> str:
    """중복제거 키 생성 (SHA-256)"""
    raw = f"{dog_id}:{window_days}:{issue}:{summary_hash}"
    return hashlib.sha256(raw.encode()).hexdigest()


def compute_summary_hash(logs_text: str) -> str:
    """로그 요약 해시"""
    return hashlib.sha256(logs_text.encode()).hexdigest()


async def get_budget_mode(db: AsyncSession) -> str:
    """예산 모드 결정: normal (0-80%), saving_mode (80-100%), rule_only (100%)"""
    today = date.today()
    first_of_month = today.replace(day=1)

    # 월간 비용 조회
    monthly_q = select(AICostUsageMonthly).where(
        AICostUsageMonthly.usage_month == first_of_month,
    )
    result = await db.execute(monthly_q)
    monthly = result.scalar_one_or_none()

    if not monthly:
        return "normal"

    monthly_cost = float(monthly.total_cost_usd or 0)
    budget = settings.AI_MONTHLY_BUDGET_USD

    if monthly_cost >= budget:
        return "rule_only"
    if monthly_cost >= budget * 0.8:
        return "saving_mode"
    return "normal"


async def check_user_burst_limit(db: AsyncSession, user_id: str) -> bool:
    """사용자 버스트 제한 확인 (10분 내 2회 초과 시 False)"""
    window_start = datetime.now(timezone.utc) - timedelta(minutes=settings.AI_USER_BURST_WINDOW_MIN)
    burst_q = (
        select(func.count())
        .select_from(AIRecommendationSnapshot)
        .where(
            AIRecommendationSnapshot.user_id == user_id,
            AIRecommendationSnapshot.created_at >= window_start,
        )
    )
    result = await db.execute(burst_q)
    count = result.scalar() or 0
    return count < settings.AI_USER_BURST_LIMIT


async def check_user_daily_limit(db: AsyncSession, user_id: str) -> tuple[bool, int, int]:
    """사용자 일일 제한 확인 — 구독 차등 적용.
    Returns: (is_allowed, used_count, daily_limit)
    FREE: 3회/일 (토큰팩 잔여 시 추가 가능)
    PRO: 10회/일 (서버 비용 보호)
    """
    from app.shared.models import Subscription

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    # 사용량 조회
    daily_q = (
        select(func.count())
        .select_from(AIRecommendationSnapshot)
        .where(
            AIRecommendationSnapshot.user_id == user_id,
            AIRecommendationSnapshot.created_at >= today_start,
        )
    )
    result = await db.execute(daily_q)
    count = result.scalar() or 0

    # 구독 상태 조회 → 제한 분기
    sub_q = select(Subscription).where(Subscription.user_id == user_id)
    sub_result = await db.execute(sub_q)
    sub = sub_result.scalar_one_or_none()

    is_pro = sub and sub.plan_type.value in ("PRO_MONTHLY", "PRO_YEARLY") and sub.is_active
    has_tokens = sub and (sub.ai_tokens_remaining or 0) > 0

    if is_pro:
        daily_limit = 10
    elif has_tokens:
        # FREE + 토큰팩 보유: 기본 3 + 토큰 잔여 허용
        daily_limit = 3 + min((sub.ai_tokens_remaining or 0), 7)
    else:
        daily_limit = 3

    return count < daily_limit, count, daily_limit


async def record_cost(
    db: AsyncSession,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    is_rule: bool = False,
) -> None:
    """비용 기록 (일일 + 월간)"""
    today = date.today()
    first_of_month = today.replace(day=1)

    # 일일 upsert
    daily_q = select(AICostUsageDaily).where(AICostUsageDaily.usage_date == today)
    result = await db.execute(daily_q)
    daily = result.scalar_one_or_none()
    if daily:
        daily.total_calls = (daily.total_calls or 0) + 1
        daily.total_input_tokens = (daily.total_input_tokens or 0) + input_tokens
        daily.total_output_tokens = (daily.total_output_tokens or 0) + output_tokens
        daily.total_cost_usd = float(daily.total_cost_usd or 0) + cost_usd
        if is_rule:
            daily.rule_fallback_count = (daily.rule_fallback_count or 0) + 1
    else:
        daily = AICostUsageDaily(
            usage_date=today,
            total_calls=1,
            total_input_tokens=input_tokens,
            total_output_tokens=output_tokens,
            total_cost_usd=cost_usd,
            rule_fallback_count=1 if is_rule else 0,
        )
        db.add(daily)

    # 월간 upsert
    monthly_q = select(AICostUsageMonthly).where(AICostUsageMonthly.usage_month == first_of_month)
    m_result = await db.execute(monthly_q)
    monthly = m_result.scalar_one_or_none()
    if monthly:
        monthly.total_calls = (monthly.total_calls or 0) + 1
        monthly.total_cost_usd = float(monthly.total_cost_usd or 0) + cost_usd
    else:
        monthly = AICostUsageMonthly(
            usage_month=first_of_month,
            total_calls=1,
            total_cost_usd=cost_usd,
        )
        db.add(monthly)

    await db.flush()
