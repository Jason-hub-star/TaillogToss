"""
대시보드 서비스 — 프로필 + 통계 + 최근 로그 + 스트릭
DogCoach dashboard/service.py 마이그레이션
Parity: APP-001
"""
from datetime import timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.features.dashboard import schemas
from app.shared.models import BehaviorLog, Dog, DogEnv
from app.shared.utils.timezone import get_today_with_timezone


async def get_dashboard_data(
    db: AsyncSession, dog_id: str, timezone_str: str = "Asia/Seoul",
) -> schemas.DashboardResponse:
    # 1. Dog + DogEnv 정보 (한 번의 DB 왕복)
    profile_result = await db.execute(
        select(Dog, DogEnv)
        .outerjoin(DogEnv, DogEnv.dog_id == Dog.id)
        .where(Dog.id == UUID(dog_id))
    )
    profile_row = profile_result.first()
    dog = profile_row[0] if profile_row else None
    dog_env = profile_row[1] if profile_row else None
    if not dog:
        raise NotFoundException("Dog not found")

    # 나이 계산
    age_months = 0
    if dog.birth_date:
        today = get_today_with_timezone(timezone_str)
        age_months = int((today - dog.birth_date).days / 30)

    dog_profile = schemas.DashboardDogProfile(
        id=dog.id,
        name=dog.name,
        breed=dog.breed,
        age_months=age_months,
        weight_kg=float(dog.weight_kg) if dog.weight_kg else None,
        profile_image_url=dog.profile_image_url,
    )

    issues = _extract_list(dog_env.chronic_issues if dog_env else None, "top_issues")
    env_triggers = _extract_list(dog_env.triggers if dog_env else None, "ids")

    # 2. 통계 + 최근 로그 + 스트릭용 최근 날짜를 한 번에 조회
    logs_q = (
        select(BehaviorLog, func.count().over().label("total_count"))
        .where(BehaviorLog.dog_id == UUID(dog_id))
        .order_by(desc(BehaviorLog.occurred_at))
        .limit(500)
    )
    log_rows = (await db.execute(logs_q)).all()
    logs = [row[0] for row in log_rows]
    total_logs = int(log_rows[0][1]) if log_rows else 0
    last_logged_at = logs[0].occurred_at if logs else None

    # 스트릭 계산
    current_streak = 0
    if logs:
        user_today = get_today_with_timezone(timezone_str)
        tz = ZoneInfo(timezone_str)
        log_dates = sorted(
            {log.occurred_at.astimezone(tz).date() for log in logs if log.occurred_at},
            reverse=True,
        )
        if log_dates:
            expected = user_today
            if log_dates[0] == user_today - timedelta(days=1):
                expected = user_today - timedelta(days=1)
            for d in log_dates:
                if d == expected:
                    current_streak += 1
                    expected -= timedelta(days=1)
                elif d < expected:
                    break

    stats = schemas.QuickLogStats(
        total_logs=total_logs,
        current_streak=current_streak,
        last_logged_at=last_logged_at,
    )

    # 3. 최근 로그
    recent_logs = [schemas.RecentLogItem.model_validate(log) for log in logs[:20]]

    return schemas.DashboardResponse(
        dog_profile=dog_profile,
        stats=stats,
        recent_logs=recent_logs,
        issues=issues,
        env_triggers=env_triggers,
        env_info=dog_env.household_info if dog_env else None,
        health_meta=dog_env.health_meta if dog_env else None,
        profile_meta=dog_env.profile_meta if dog_env else None,
    )


def _extract_list(data, key: str) -> list:
    """JSONB 데이터에서 리스트 추출 (신/구 형식 호환)"""
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get(key, [])
    return []
