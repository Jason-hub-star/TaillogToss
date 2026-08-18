"""
B2B log access boundary tests.
Parity: B2B-001, LOG-001
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest

from app.core.exceptions import ForbiddenException
from app.features.log import router as log_router
from app.features.log.schemas import QuickLogCreate


ORG_ID = UUID("33333333-3333-3333-3333-333333333333")
DOG_ID = UUID("22222222-2222-2222-2222-222222222222")
USER_ID = "11111111-1111-1111-1111-111111111111"


def _result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _member(role: str):
    return SimpleNamespace(role=role)


def _quick_log() -> QuickLogCreate:
    return QuickLogCreate(
        dog_id=DOG_ID,
        org_id=ORG_ID,
        category="walk",
        intensity=3,
        occurred_at="2026-06-01T12:00:00+09:00",
    )


@pytest.mark.asyncio
async def test_org_staff_can_create_quick_log_for_active_org_dog(monkeypatch, mock_db):
    monkeypatch.setattr(log_router, "verify_org_membership", AsyncMock(return_value=_member("staff")))
    monkeypatch.setattr(log_router.service, "create_quick_log", AsyncMock(return_value={"ok": True}))
    mock_db.execute = AsyncMock(return_value=_result(SimpleNamespace()))

    result = await log_router.create_quick_log(
        data=_quick_log(),
        user_id=USER_ID,
        db=mock_db,
    )

    assert result == {"ok": True}
    assert mock_db.execute.await_count == 1
    log_router.service.create_quick_log.assert_awaited_once()


@pytest.mark.asyncio
async def test_trainer_can_create_quick_log_only_for_assigned_org_dog(monkeypatch, mock_db):
    monkeypatch.setattr(log_router, "verify_org_membership", AsyncMock(return_value=_member("trainer")))
    monkeypatch.setattr(log_router.service, "create_quick_log", AsyncMock(return_value={"ok": True}))
    mock_db.execute = AsyncMock(
        side_effect=[
            _result(SimpleNamespace()),  # active org dog
            _result(SimpleNamespace()),  # active assignment
        ]
    )

    result = await log_router.create_quick_log(
        data=_quick_log(),
        user_id=USER_ID,
        db=mock_db,
    )

    assert result == {"ok": True}
    assert mock_db.execute.await_count == 2
    log_router.service.create_quick_log.assert_awaited_once()


@pytest.mark.asyncio
async def test_trainer_cannot_create_quick_log_for_unassigned_org_dog(monkeypatch, mock_db):
    monkeypatch.setattr(log_router, "verify_org_membership", AsyncMock(return_value=_member("trainer")))
    monkeypatch.setattr(log_router.service, "create_quick_log", AsyncMock())
    mock_db.execute = AsyncMock(
        side_effect=[
            _result(SimpleNamespace()),  # active org dog
            _result(None),  # no active assignment
        ]
    )

    with pytest.raises(ForbiddenException):
        await log_router.create_quick_log(
            data=_quick_log(),
            user_id=USER_ID,
            db=mock_db,
        )

    assert mock_db.execute.await_count == 2
    log_router.service.create_quick_log.assert_not_awaited()
