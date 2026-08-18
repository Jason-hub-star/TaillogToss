"""
Referral reward abuse boundary tests.
Parity: GROWTH-001, IAP-001
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.features.referral import router
from app.features.referral.router import (
    CONTACTS_VIRAL_REWARD_AMOUNT,
    CONTACTS_VIRAL_REWARD_UNIT,
    ContactsViralRewardRequest,
    grant_contacts_viral_reward,
)
from app.shared.models import UserEntitlement


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDb:
    def __init__(self, existing=None):
        self.existing = existing
        self.add = MagicMock()
        self.flush = AsyncMock()
        self.commit = AsyncMock()
        self.refresh = AsyncMock()

    async def execute(self, _query):
        return ScalarResult(self.existing)


@pytest.mark.asyncio
async def test_contacts_viral_reward_requires_configured_module_id(monkeypatch):
    monkeypatch.setattr(router.settings, "CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID", "")

    with pytest.raises(HTTPException) as exc:
        await grant_contacts_viral_reward(
            ContactsViralRewardRequest(module_id="any-module"),
            user_id="11111111-1111-1111-1111-111111111111",
            db=FakeDb(),
        )

    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_contacts_viral_reward_rejects_wrong_module_id(monkeypatch):
    monkeypatch.setattr(router.settings, "CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID", "configured-module")

    with pytest.raises(HTTPException) as exc:
        await grant_contacts_viral_reward(
            ContactsViralRewardRequest(
                module_id="attacker-module",
                reward_amount=CONTACTS_VIRAL_REWARD_AMOUNT,
                reward_unit=CONTACTS_VIRAL_REWARD_UNIT,
            ),
            user_id="11111111-1111-1111-1111-111111111111",
            db=FakeDb(),
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_contacts_viral_reward_rejects_missing_reward_metadata(monkeypatch):
    monkeypatch.setattr(router.settings, "CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID", "configured-module")

    with pytest.raises(HTTPException) as exc:
        await grant_contacts_viral_reward(
            ContactsViralRewardRequest(module_id="configured-module"),
            user_id="11111111-1111-1111-1111-111111111111",
            db=FakeDb(),
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Invalid contactsViral reward metadata"


@pytest.mark.asyncio
async def test_contacts_viral_reward_rejects_tampered_reward_metadata(monkeypatch):
    monkeypatch.setattr(router.settings, "CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID", "configured-module")

    with pytest.raises(HTTPException) as exc:
        await grant_contacts_viral_reward(
            ContactsViralRewardRequest(
                module_id="configured-module",
                reward_amount=999999,
                reward_unit="attacker-controlled",
            ),
            user_id="11111111-1111-1111-1111-111111111111",
            db=FakeDb(),
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_contacts_viral_reward_uses_server_reward_metadata(monkeypatch):
    monkeypatch.setattr(router.settings, "CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID", "configured-module")
    monkeypatch.setattr(router.settings, "CONTACTS_VIRAL_PRO_DAY_PASS_DAYS", 1)
    db = FakeDb()

    response = await grant_contacts_viral_reward(
        ContactsViralRewardRequest(
            module_id="configured-module",
            reward_amount=CONTACTS_VIRAL_REWARD_AMOUNT,
            reward_unit=CONTACTS_VIRAL_REWARD_UNIT,
        ),
        user_id="11111111-1111-1111-1111-111111111111",
        db=db,
    )

    entitlement = db.add.call_args.args[0]
    assert response.granted is True
    assert isinstance(entitlement, UserEntitlement)
    assert entitlement.user_id == UUID("11111111-1111-1111-1111-111111111111")
    assert entitlement.meta == {
        "reward_amount": CONTACTS_VIRAL_REWARD_AMOUNT,
        "reward_unit": CONTACTS_VIRAL_REWARD_UNIT,
    }
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(entitlement)


@pytest.mark.asyncio
async def test_contacts_viral_reward_duplicate_same_day_does_not_grant_again(monkeypatch):
    monkeypatch.setattr(router.settings, "CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID", "configured-module")
    now = datetime.now(timezone.utc)
    existing = UserEntitlement(
        user_id=UUID("11111111-1111-1111-1111-111111111111"),
        type="PRO_DAY_PASS",
        source="contacts_viral",
        source_module_id="configured-module",
        starts_at=now,
        expires_at=now,
        created_at=now,
        updated_at=now,
    )
    db = FakeDb(existing=existing)

    response = await grant_contacts_viral_reward(
        ContactsViralRewardRequest(
            module_id="configured-module",
            reward_amount=CONTACTS_VIRAL_REWARD_AMOUNT,
            reward_unit=CONTACTS_VIRAL_REWARD_UNIT,
        ),
        user_id="11111111-1111-1111-1111-111111111111",
        db=db,
    )

    assert response.granted is False
    assert response.already_granted is True
    db.add.assert_not_called()
