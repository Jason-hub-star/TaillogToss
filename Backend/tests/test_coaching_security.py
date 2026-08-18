from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.exceptions import ForbiddenException, NotFoundException
from app.features.coaching import service
from app.shared.models import AICoaching, ActionTracker


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalars(self):
        return self

    def first(self):
        return self._value


@pytest.mark.asyncio
async def test_submit_feedback_verifies_coaching_dog_ownership(monkeypatch):
    """AUTH-001/AI-001: feedback writes must be bound to the coaching dog owner."""
    user_id = str(uuid4())
    dog_id = uuid4()
    coaching_id = uuid4()
    coaching = AICoaching(id=coaching_id, dog_id=dog_id, feedback_score=None)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_ScalarResult(coaching))
    verify = AsyncMock()
    monkeypatch.setattr(service, "verify_dog_ownership", verify)

    response = await service.submit_feedback(db, coaching_id, 4, user_id)

    verify.assert_awaited_once_with(db, dog_id, user_id=user_id)
    assert coaching.feedback_score == 4
    assert response.coaching_id == coaching_id
    assert response.feedback_score == 4
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_submit_feedback_rejects_foreign_coaching_before_write(monkeypatch):
    """AUTH-001/AI-001: a user cannot rate another user's coaching result."""
    user_id = str(uuid4())
    dog_id = uuid4()
    coaching_id = uuid4()
    coaching = AICoaching(id=coaching_id, dog_id=dog_id, feedback_score=None)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_ScalarResult(coaching))
    verify = AsyncMock(side_effect=ForbiddenException("Dog not owned by user"))
    monkeypatch.setattr(service, "verify_dog_ownership", verify)

    with pytest.raises(ForbiddenException):
        await service.submit_feedback(db, coaching_id, 5, user_id)

    verify.assert_awaited_once_with(db, dog_id, user_id=user_id)
    assert coaching.feedback_score is None
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_submit_feedback_rejects_missing_coaching_before_write(monkeypatch):
    """AUTH-001/AI-001: nonexistent coaching ids must not create feedback writes."""
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_ScalarResult(None))
    verify = AsyncMock()
    monkeypatch.setattr(service, "verify_dog_ownership", verify)

    with pytest.raises(NotFoundException):
        await service.submit_feedback(db, uuid4(), 3, str(uuid4()))

    verify.assert_not_awaited()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_toggle_action_item_verifies_coaching_dog_ownership(monkeypatch):
    """AUTH-001/AI-001: action tracker writes must be bound to the coaching dog owner."""
    user_id = str(uuid4())
    dog_id = uuid4()
    coaching_id = uuid4()
    action_id = "walk-1"
    coaching = AICoaching(id=coaching_id, dog_id=dog_id)
    tracker = ActionTracker(
        id=uuid4(),
        coaching_id=coaching_id,
        action_item_id=action_id,
        is_completed=False,
    )
    db = AsyncMock()
    db.execute = AsyncMock(side_effect=[_ScalarResult(coaching), _ScalarResult(tracker)])
    verify = AsyncMock()
    monkeypatch.setattr(service, "verify_dog_ownership", verify)

    response = await service.toggle_action_item(
        db,
        coaching_id,
        action_id,
        True,
        user_id,
    )

    verify.assert_awaited_once_with(db, dog_id, user_id=user_id)
    assert tracker.is_completed is True
    assert tracker.completed_at is not None
    assert response.coaching_id == coaching_id
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(tracker)


@pytest.mark.asyncio
async def test_toggle_action_item_rejects_foreign_coaching_before_write(monkeypatch):
    """AUTH-001/AI-001: a user cannot toggle another user's coaching action item."""
    user_id = str(uuid4())
    dog_id = uuid4()
    coaching_id = uuid4()
    coaching = AICoaching(id=coaching_id, dog_id=dog_id)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_ScalarResult(coaching))
    verify = AsyncMock(side_effect=ForbiddenException("Dog not owned by user"))
    monkeypatch.setattr(service, "verify_dog_ownership", verify)

    with pytest.raises(ForbiddenException):
        await service.toggle_action_item(
            db,
            coaching_id,
            "walk-1",
            True,
            user_id,
        )

    verify.assert_awaited_once_with(db, dog_id, user_id=user_id)
    assert db.execute.await_count == 1
    db.commit.assert_not_awaited()
    db.refresh.assert_not_awaited()


@pytest.mark.asyncio
async def test_toggle_action_item_rejects_missing_coaching_before_write(monkeypatch):
    """AUTH-001/AI-001: nonexistent coaching ids must not create tracker rows."""
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_ScalarResult(None))
    verify = AsyncMock()
    monkeypatch.setattr(service, "verify_dog_ownership", verify)

    with pytest.raises(NotFoundException):
        await service.toggle_action_item(
            db,
            uuid4(),
            "walk-1",
            True,
            str(uuid4()),
        )

    verify.assert_not_awaited()
    db.commit.assert_not_awaited()
    db.refresh.assert_not_awaited()
