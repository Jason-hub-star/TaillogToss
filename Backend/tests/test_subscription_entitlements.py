from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.features.subscription.entitlements import (
    EFFECTIVE_SOURCE_DAY_PASS,
    EFFECTIVE_SOURCE_PAID,
    PRO_DAY_PASS,
    grant_contacts_viral_pro_day_pass,
    resolve_effective_pro,
)
from app.features.subscription.router import build_subscription_response
from app.shared.models import PlanType, Subscription, UserEntitlement


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDb:
    def __init__(self, scalar_values):
        self.scalar_values = list(scalar_values)
        self.add = MagicMock()
        self.flush = AsyncMock()

    async def execute(self, _query):
        value = self.scalar_values.pop(0) if self.scalar_values else None
        return ScalarResult(value)


def make_subscription(**overrides) -> Subscription:
    values = {
        "id": uuid4(),
        "user_id": USER_ID,
        "plan_type": PlanType.PRO_MONTHLY,
        "is_active": True,
        "ai_tokens_remaining": 0,
        "ai_tokens_total": 0,
        "next_billing_date": datetime.now(timezone.utc) + timedelta(days=30),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    values.update(overrides)
    return Subscription(**values)


def make_entitlement(**overrides) -> UserEntitlement:
    now = datetime.now(timezone.utc)
    values = {
        "id": uuid4(),
        "user_id": USER_ID,
        "type": PRO_DAY_PASS,
        "source": "contacts_viral",
        "source_module_id": "module-1",
        "starts_at": now,
        "expires_at": now + timedelta(days=1),
        "created_at": now,
        "updated_at": now,
    }
    values.update(overrides)
    return UserEntitlement(**values)


@pytest.mark.asyncio
async def test_paid_subscription_effective_pro_wins_without_entitlement_query():
    sub = make_subscription()
    db = FakeDb([])

    state = await resolve_effective_pro(db, USER_ID, subscription=sub)

    assert state.is_pro is True
    assert state.source == EFFECTIVE_SOURCE_PAID
    assert state.expires_at == sub.next_billing_date


@pytest.mark.asyncio
async def test_active_pro_day_pass_makes_effective_pro():
    entitlement = make_entitlement()
    db = FakeDb([entitlement])

    state = await resolve_effective_pro(db, USER_ID, subscription=None)

    assert state.is_pro is True
    assert state.source == EFFECTIVE_SOURCE_DAY_PASS
    assert state.expires_at == entitlement.expires_at


@pytest.mark.asyncio
async def test_expired_or_missing_day_pass_is_not_effective_pro():
    db = FakeDb([None])

    state = await resolve_effective_pro(db, USER_ID, subscription=None)

    assert state.is_pro is False
    assert state.source is None
    assert state.expires_at is None


@pytest.mark.asyncio
async def test_entitlement_only_subscription_response_is_synthetic_free_with_effective_pro():
    entitlement = make_entitlement()
    db = FakeDb([entitlement])

    response = await build_subscription_response(db, str(USER_ID), subscription=None)

    assert response is not None
    assert response.plan_type == "FREE"
    assert response.is_active is False
    assert response.effective_is_pro is True
    assert response.effective_pro_source == EFFECTIVE_SOURCE_DAY_PASS
    assert response.effective_pro_expires_at == entitlement.expires_at


@pytest.mark.asyncio
async def test_contacts_viral_same_module_same_day_duplicate_is_blocked():
    existing = make_entitlement()
    db = FakeDb([existing])

    entitlement, granted = await grant_contacts_viral_pro_day_pass(
        db,
        USER_ID,
        module_id="module-1",
        reward_amount=1,
        reward_unit="PRO 1일권",
    )

    assert entitlement is existing
    assert granted is False
    db.add.assert_not_called()
    db.flush.assert_not_called()


@pytest.mark.asyncio
async def test_contacts_viral_new_grant_creates_pro_day_pass():
    db = FakeDb([None])
    now = datetime(2026, 5, 22, 0, 0, tzinfo=timezone.utc)

    entitlement, granted = await grant_contacts_viral_pro_day_pass(
        db,
        USER_ID,
        module_id="module-1",
        reward_amount=1,
        reward_unit="PRO 1일권",
        now=now,
    )

    assert granted is True
    assert entitlement.type == PRO_DAY_PASS
    assert entitlement.source == "contacts_viral"
    assert entitlement.source_module_id == "module-1"
    assert entitlement.starts_at == now
    assert entitlement.expires_at == now + timedelta(days=1)
    assert entitlement.meta == {"reward_amount": 1, "reward_unit": "PRO 1일권"}
    db.add.assert_called_once_with(entitlement)
    db.flush.assert_awaited_once()
