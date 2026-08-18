"""
소유권 검증 타이밍 테스트
Parity: APP-001, LOG-001, UI-TRAINING-PERSONALIZATION-001
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.shared.utils.ownership import verify_dog_ownership


def _result(row):
    result = MagicMock()
    result.scalar_one_or_none.return_value = row
    return result


@pytest.mark.asyncio
async def test_verify_dog_ownership_records_b2c_fast_path():
    dog_id = uuid4()
    user_id = str(uuid4())
    db = AsyncMock()
    db.execute = AsyncMock(return_value=_result(SimpleNamespace(id=dog_id, user_id=user_id)))
    timings: dict[str, float] = {}
    timing_meta: dict[str, str] = {}

    dog = await verify_dog_ownership(
        db,
        dog_id,
        user_id=user_id,
        timings=timings,
        timing_meta=timing_meta,
    )

    assert dog.id == dog_id
    assert db.execute.await_count == 1
    assert "dog_lookup_ms" in timings
    assert "b2c_check_ms" in timings
    assert "assignment_lookup_ms" not in timings
    assert "org_dog_lookup_ms" not in timings
    assert timing_meta == {"b2c_match": "true", "ownership_path": "b2c_owner"}


@pytest.mark.asyncio
async def test_verify_dog_ownership_records_b2b_denied_path():
    dog_id = uuid4()
    user_id = str(uuid4())
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            _result(SimpleNamespace(id=dog_id, user_id=uuid4())),
            _result(None),
            _result(None),
        ]
    )
    timings: dict[str, float] = {}
    timing_meta: dict[str, str] = {}

    with pytest.raises(HTTPException) as exc:
        await verify_dog_ownership(
            db,
            dog_id,
            user_id=user_id,
            timings=timings,
            timing_meta=timing_meta,
        )

    assert exc.value.status_code == 403
    assert db.execute.await_count == 3
    assert "dog_lookup_ms" in timings
    assert "b2c_check_ms" in timings
    assert "assignment_lookup_ms" in timings
    assert "org_dog_lookup_ms" in timings
    assert timing_meta == {"b2c_match": "false", "ownership_path": "denied"}


@pytest.mark.asyncio
async def test_verify_dog_ownership_allows_active_org_assignment_only_when_org_dog_is_active():
    dog_id = uuid4()
    org_id = uuid4()
    user_id = str(uuid4())
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            _result(SimpleNamespace(id=dog_id, user_id=uuid4())),
            _result(SimpleNamespace(dog_id=dog_id, trainer_user_id=user_id, org_id=org_id)),
            _result(SimpleNamespace(dog_id=dog_id, org_id=org_id, status="active")),
        ]
    )
    timings: dict[str, float] = {}
    timing_meta: dict[str, str] = {}

    dog = await verify_dog_ownership(
        db,
        dog_id,
        user_id=user_id,
        timings=timings,
        timing_meta=timing_meta,
    )

    assert dog.id == dog_id
    assert db.execute.await_count == 3
    assert "assignment_org_dog_lookup_ms" in timings
    assert timing_meta == {
        "b2c_match": "false",
        "assignment_active_org_dog": "true",
        "ownership_path": "b2b_assignment",
    }


@pytest.mark.asyncio
async def test_verify_dog_ownership_rejects_stale_org_assignment_when_org_dog_is_inactive():
    dog_id = uuid4()
    org_id = uuid4()
    user_id = str(uuid4())
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            _result(SimpleNamespace(id=dog_id, user_id=uuid4())),
            _result(SimpleNamespace(dog_id=dog_id, trainer_user_id=user_id, org_id=org_id)),
            _result(None),
            _result(None),
        ]
    )
    timings: dict[str, float] = {}
    timing_meta: dict[str, str] = {}

    with pytest.raises(HTTPException) as exc:
        await verify_dog_ownership(
            db,
            dog_id,
            user_id=user_id,
            timings=timings,
            timing_meta=timing_meta,
        )

    assert exc.value.status_code == 403
    assert db.execute.await_count == 4
    assert "assignment_org_dog_lookup_ms" in timings
    assert timing_meta == {
        "b2c_match": "false",
        "assignment_active_org_dog": "false",
        "ownership_path": "denied",
    }


@pytest.mark.asyncio
async def test_verify_dog_ownership_keeps_personal_assignment_path():
    dog_id = uuid4()
    user_id = str(uuid4())
    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            _result(SimpleNamespace(id=dog_id, user_id=uuid4())),
            _result(SimpleNamespace(dog_id=dog_id, trainer_user_id=user_id, org_id=None)),
        ]
    )
    timing_meta: dict[str, str] = {}

    dog = await verify_dog_ownership(db, dog_id, user_id=user_id, timing_meta=timing_meta)

    assert dog.id == dog_id
    assert db.execute.await_count == 2
    assert timing_meta == {
        "b2c_match": "false",
        "assignment_active_org_dog": "personal",
        "ownership_path": "b2b_assignment",
    }
