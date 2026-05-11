from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.features.dashboard.service import get_dashboard_data
from app.shared.models import BehaviorLog, Dog, DogEnv


class _ProfileResult:
    def __init__(self, dog, env):
        self._dog = dog
        self._env = env

    def first(self):
        return (self._dog, self._env)


class _LogResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _DashboardDb:
    def __init__(self, dog, env, logs):
        self.calls = 0
        self._dog = dog
        self._env = env
        self._logs = logs

    async def execute(self, _stmt):
        self.calls += 1
        if self.calls == 1:
            return _ProfileResult(self._dog, self._env)
        return _LogResult([(log, len(self._logs)) for log in self._logs])


@pytest.mark.asyncio
async def test_dashboard_uses_compact_profile_and_log_queries():
    dog_id = uuid4()
    dog = Dog(
        id=dog_id,
        name="메이",
        breed="poodle",
        profile_image_url=None,
    )
    env = DogEnv(
        dog_id=dog_id,
        chronic_issues={"top_issues": ["barking"]},
        triggers={"ids": ["doorbell"]},
    )
    logs = [
        BehaviorLog(
            id=uuid4(),
            dog_id=dog_id,
            is_quick_log=True,
            quick_category="barking",
            intensity=7,
            occurred_at=datetime(2026, 5, 11, 1, 0, tzinfo=timezone.utc),
        ),
        BehaviorLog(
            id=uuid4(),
            dog_id=dog_id,
            is_quick_log=True,
            quick_category="jumping",
            intensity=4,
            occurred_at=datetime(2026, 5, 10, 1, 0, tzinfo=timezone.utc),
        ),
    ]
    db = _DashboardDb(dog, env, logs)

    result = await get_dashboard_data(db, str(dog_id), "Asia/Seoul")

    assert db.calls == 2
    assert result.dog_profile.name == "메이"
    assert result.stats.total_logs == 2
    assert result.stats.last_logged_at == logs[0].occurred_at
    assert result.recent_logs[0].quick_category == "barking"
    assert result.issues == ["barking"]
    assert result.env_triggers == ["doorbell"]
