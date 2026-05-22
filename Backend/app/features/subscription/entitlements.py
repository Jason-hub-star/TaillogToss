"""Effective PRO entitlement helpers.

Parity: IAP-001, GROWTH-001
"""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.models import PlanType, Subscription, UserEntitlement

PRO_DAY_PASS = "PRO_DAY_PASS"
CONTACTS_VIRAL_SOURCE = "contacts_viral"
EFFECTIVE_SOURCE_PAID = "paid_subscription"
EFFECTIVE_SOURCE_DAY_PASS = "pro_day_pass"


@dataclass(frozen=True)
class EffectiveProState:
    is_pro: bool
    source: Optional[str] = None
    expires_at: Optional[datetime] = None
    entitlement: Optional[UserEntitlement] = None


def _user_uuid(user_id: str | UUID) -> UUID:
    return user_id if isinstance(user_id, UUID) else UUID(str(user_id))


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def is_paid_subscription_pro(subscription: Subscription | None) -> bool:
    if not subscription or not subscription.is_active:
        return False
    plan_type = subscription.plan_type.value if isinstance(subscription.plan_type, PlanType) else subscription.plan_type
    return plan_type in (PlanType.PRO_MONTHLY.value, PlanType.PRO_YEARLY.value)


async def get_active_pro_day_pass(
    db: AsyncSession,
    user_id: str | UUID,
    now: datetime | None = None,
) -> UserEntitlement | None:
    now = now or _now_utc()
    q = (
        select(UserEntitlement)
        .where(
            UserEntitlement.user_id == _user_uuid(user_id),
            UserEntitlement.type == PRO_DAY_PASS,
            UserEntitlement.source == CONTACTS_VIRAL_SOURCE,
            UserEntitlement.starts_at <= now,
            UserEntitlement.expires_at > now,
        )
        .order_by(desc(UserEntitlement.expires_at))
        .limit(1)
    )
    return (await db.execute(q)).scalar_one_or_none()


async def resolve_effective_pro(
    db: AsyncSession,
    user_id: str | UUID,
    subscription: Subscription | None = None,
    now: datetime | None = None,
) -> EffectiveProState:
    if is_paid_subscription_pro(subscription):
        return EffectiveProState(
            is_pro=True,
            source=EFFECTIVE_SOURCE_PAID,
            expires_at=subscription.next_billing_date,
        )

    entitlement = await get_active_pro_day_pass(db, user_id, now=now)
    if entitlement:
        return EffectiveProState(
            is_pro=True,
            source=EFFECTIVE_SOURCE_DAY_PASS,
            expires_at=entitlement.expires_at,
            entitlement=entitlement,
        )

    return EffectiveProState(is_pro=False)


async def find_contacts_viral_day_pass_for_day(
    db: AsyncSession,
    user_id: str | UUID,
    module_id: str,
    now: datetime | None = None,
) -> UserEntitlement | None:
    """Find the same user/module grant for the current KST calendar day."""
    now = now or _now_utc()
    kst = timezone(timedelta(hours=9))
    today_kst = now.astimezone(kst).date()
    q = (
        select(UserEntitlement)
        .where(
            UserEntitlement.user_id == _user_uuid(user_id),
            UserEntitlement.type == PRO_DAY_PASS,
            UserEntitlement.source == CONTACTS_VIRAL_SOURCE,
            UserEntitlement.source_module_id == module_id,
            func.date(func.timezone("Asia/Seoul", UserEntitlement.starts_at)) == today_kst,
        )
        .limit(1)
    )
    return (await db.execute(q)).scalar_one_or_none()


async def grant_contacts_viral_pro_day_pass(
    db: AsyncSession,
    user_id: str | UUID,
    module_id: str,
    reward_amount: int | None = None,
    reward_unit: str | None = None,
    now: datetime | None = None,
    duration_days: int = 1,
) -> tuple[UserEntitlement, bool]:
    now = now or _now_utc()
    existing = await find_contacts_viral_day_pass_for_day(db, user_id, module_id, now=now)
    if existing:
        return existing, False

    entitlement = UserEntitlement(
        user_id=_user_uuid(user_id),
        type=PRO_DAY_PASS,
        source=CONTACTS_VIRAL_SOURCE,
        source_module_id=module_id,
        starts_at=now,
        expires_at=now + timedelta(days=duration_days),
        meta={
            "reward_amount": reward_amount,
            "reward_unit": reward_unit,
        },
    )
    db.add(entitlement)
    await db.flush()
    return entitlement, True
