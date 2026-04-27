"""
훈련 라우터 — 상태 조회/업데이트/삭제
FE api/training.ts 매핑
Parity: UI-001
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.features.training import deps, schemas, service

router = APIRouter()


@router.get("/{dog_id}", response_model=List[schemas.TrainingStatusResponse])
async def get_training_statuses(
    dog_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """강아지별 훈련 상태 목록"""
    return await service.get_training_statuses(db, user_id, dog_id)


@router.post("/status", response_model=schemas.TrainingStatusResponse)
async def update_training_status(
    data: schemas.TrainingStatusUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """훈련 상태 upsert — Pro 커리큘럼 접근 검증 포함"""
    await deps.require_pro_for_curriculum(data.curriculum_id, user_id, db)
    return await service.upsert_training_status(db, user_id, data)


@router.delete(
    "/status/{curriculum_id}/{stage_id}/{step_number}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_training_status(
    curriculum_id: str,
    stage_id: str,
    step_number: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """훈련 상태 삭제"""
    await service.delete_training_status(db, user_id, curriculum_id, stage_id, step_number)
    return None
