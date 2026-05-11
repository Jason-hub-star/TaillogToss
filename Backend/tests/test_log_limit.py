"""
행동 로그 limit 전달 테스트
Parity: LOG-001
"""
from uuid import UUID

import pytest

from app.features.log import router as log_router


@pytest.mark.asyncio
async def test_get_logs_passes_query_limit_to_service(monkeypatch, mock_db, mock_dog_id):
    calls = {}

    async def fake_verify_dog_ownership(db, dog_id, user_id):
        calls["verified"] = (db, dog_id, user_id)

    async def fake_get_recent_logs(db, dog_id, limit=1000):
        calls["service"] = (db, dog_id, limit)
        return []

    monkeypatch.setattr(log_router, "verify_dog_ownership", fake_verify_dog_ownership)
    monkeypatch.setattr(log_router.service, "get_recent_logs", fake_get_recent_logs)

    result = await log_router.get_logs(
        dog_id=UUID(mock_dog_id),
        limit=37,
        user_id="user-1",
        db=mock_db,
    )

    assert result == []
    assert calls["verified"] == (mock_db, UUID(mock_dog_id), "user-1")
    assert calls["service"] == (mock_db, UUID(mock_dog_id), 37)
