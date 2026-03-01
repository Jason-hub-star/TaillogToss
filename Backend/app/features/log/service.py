"""
행동 기록 서비스 — 빠른기록 + 상세기록 + 조회/수정/삭제
FE api/log.ts 매핑: getLogs, createQuickLog, createDetailedLog, deleteLog
Parity: LOG-001
"""
from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.features.log import repository, schemas
from app.shared.utils.timezone import to_utc


async def create_quick_log(
    db: AsyncSession, data: schemas.QuickLogCreate, timezone_str: str,
) -> schemas.LogResponse:
    """빠른 기록 생성"""
    utc_occurred = to_utc(data.occurred_at, timezone_str)
    log_data = {
        "dog_id": data.dog_id,
        "is_quick_log": True,
        "quick_category": data.category,
        "intensity": data.intensity,
        "occurred_at": utc_occurred,
        "memo": data.memo,
        "location": data.location,
        "duration_minutes": data.duration_minutes,
    }
    new_log = await repository.create_log(db, log_data)
    return schemas.LogResponse.model_validate(new_log)


async def create_detailed_log(
    db: AsyncSession, data: schemas.DetailedLogCreate, timezone_str: str,
) -> schemas.LogResponse:
    """ABC 상세 기록 생성"""
    utc_occurred = to_utc(data.occurred_at, timezone_str)
    log_data = {
        "dog_id": data.dog_id,
        "is_quick_log": False,
        "type_id": data.type_id,
        "antecedent": data.antecedent,
        "behavior": data.behavior,
        "consequence": data.consequence,
        "intensity": data.intensity,
        "duration_minutes": data.duration_minutes,
        "location": data.location,
        "memo": data.memo,
        "occurred_at": utc_occurred,
    }
    new_log = await repository.create_log(db, log_data)
    return schemas.LogResponse.model_validate(new_log)


async def get_recent_logs(
    db: AsyncSession, dog_id: UUID, limit: int = 20,
) -> List[schemas.LogResponse]:
    """최근 로그 조회"""
    logs = await repository.get_logs_by_dog(db, dog_id, limit=limit)
    return [schemas.LogResponse.model_validate(log) for log in logs]


async def get_daily_logs(
    db: AsyncSession, dog_id: UUID, date_str: str, timezone_str: str,
) -> List[schemas.LogResponse]:
    """특정 날짜 로그 조회 (대시보드용) — 향후 구현"""
    # TODO: 날짜 필터링 추가
    return await get_recent_logs(db, dog_id, limit=50)


async def update_existing_log(
    db: AsyncSession, log_id: UUID, updates: schemas.LogUpdate,
) -> schemas.LogResponse:
    """기록 부분 수정"""
    update_data = updates.model_dump(exclude_unset=True)
    updated = await repository.update_log(db, log_id, update_data)
    if not updated:
        raise NotFoundException("Log not found")
    return schemas.LogResponse.model_validate(updated)


async def delete_log(db: AsyncSession, log_id: UUID) -> None:
    """기록 삭제"""
    success = await repository.delete_log(db, log_id)
    if not success:
        raise NotFoundException("Log not found")
