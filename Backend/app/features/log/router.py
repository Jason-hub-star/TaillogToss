"""
행동 기록 라우터 — 빠른기록/상세기록/조회/수정/삭제
FE api/log.ts 매핑
Parity: LOG-001
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.features.log import repository, schemas, service
from app.shared.utils.ownership import verify_dog_ownership

router = APIRouter()


@router.post("/quick", response_model=schemas.LogResponse, status_code=status.HTTP_201_CREATED)
async def create_quick_log(
    data: schemas.QuickLogCreate,
    x_timezone: str = Header(default="Asia/Seoul", alias="X-Timezone"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """빠른 기록 생성"""
    await verify_dog_ownership(db, data.dog_id, user_id=user_id)
    return await service.create_quick_log(db, data, x_timezone)


@router.post("/detailed", response_model=schemas.LogResponse, status_code=status.HTTP_201_CREATED)
async def create_detailed_log(
    data: schemas.DetailedLogCreate,
    x_timezone: str = Header(default="Asia/Seoul", alias="X-Timezone"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """ABC 상세 기록 생성"""
    await verify_dog_ownership(db, data.dog_id, user_id=user_id)
    return await service.create_detailed_log(db, data, x_timezone)


@router.get("/{dog_id}", response_model=List[schemas.LogResponse])
async def get_logs(
    dog_id: UUID,
    limit: int = Query(default=100, ge=1, le=500),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """강아지별 최근 로그 조회"""
    await verify_dog_ownership(db, dog_id, user_id=user_id)
    return await service.get_recent_logs(db, dog_id, limit=limit)


@router.patch("/{log_id}", response_model=schemas.LogResponse)
async def update_log(
    log_id: UUID,
    data: schemas.LogUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """기록 수정"""
    log = await repository.get_log_by_id(db, log_id)
    if log:
        await verify_dog_ownership(db, log.dog_id, user_id=user_id)
    return await service.update_existing_log(db, log_id, data)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_log(
    log_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """기록 삭제"""
    log = await repository.get_log_by_id(db, log_id)
    if log:
        await verify_dog_ownership(db, log.dog_id, user_id=user_id)
    await service.delete_log(db, log_id)
    return None
