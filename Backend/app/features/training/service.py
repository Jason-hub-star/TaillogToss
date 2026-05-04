"""
훈련 서비스 — 상태 CRUD + 진행 요약
FE api/training.ts 매핑: getProgress, startTraining, completeStep
DogCoach coach/service.py 훈련 부분 분리
Parity: UI-001
"""
from typing import List
from uuid import UUID

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.features.training import schemas
from app.shared.models import UserTrainingStatus


async def get_training_statuses(
    db: AsyncSession, user_id: str, dog_id: UUID,
) -> List[schemas.TrainingStatusResponse]:
    """사용자의 전체 훈련 상태 목록"""
    q = (
        select(UserTrainingStatus)
        .where(
            UserTrainingStatus.user_id == UUID(user_id),
            UserTrainingStatus.dog_id == dog_id,
        )
        .order_by(desc(UserTrainingStatus.created_at))
    )
    results = (await db.execute(q)).scalars().all()
    return [schemas.TrainingStatusResponse.model_validate(r) for r in results]


async def upsert_training_status(
    db: AsyncSession, user_id: str, data: schemas.TrainingStatusUpdate,
) -> schemas.TrainingStatusResponse:
    """훈련 상태 upsert (기존 있으면 업데이트, 없으면 생성)"""
    uuid_user = UUID(user_id)
    uuid_dog = UUID(data.dog_id)

    q = select(UserTrainingStatus).where(
        and_(
            UserTrainingStatus.user_id == uuid_user,
            UserTrainingStatus.dog_id == uuid_dog,
            UserTrainingStatus.curriculum_id == data.curriculum_id,
            UserTrainingStatus.stage_id == data.stage_id,
            UserTrainingStatus.step_number == data.step_number,
        ),
    )
    existing = (await db.execute(q)).scalars().first()

    if existing:
        existing.status = data.status
        existing.current_variant = data.current_variant
        existing.memo = data.memo
    else:
        existing = UserTrainingStatus(
            user_id=uuid_user,
            dog_id=uuid_dog,
            curriculum_id=data.curriculum_id,
            stage_id=data.stage_id,
            step_number=data.step_number,
            status=data.status,
            current_variant=data.current_variant,
            memo=data.memo,
        )
        db.add(existing)

    await db.commit()
    await db.refresh(existing)
    return schemas.TrainingStatusResponse.model_validate(existing)


async def delete_training_status(
    db: AsyncSession, user_id: str,
    curriculum_id: str, stage_id: str, step_number: int,
) -> None:
    """훈련 상태 삭제"""
    q = select(UserTrainingStatus).where(
        and_(
            UserTrainingStatus.user_id == UUID(user_id),
            UserTrainingStatus.curriculum_id == curriculum_id,
            UserTrainingStatus.stage_id == stage_id,
            UserTrainingStatus.step_number == step_number,
        ),
    )
    result = (await db.execute(q)).scalars().first()
    if not result:
        raise NotFoundException("Training status not found")
    await db.delete(result)
    await db.commit()


async def upsert_step_feedback(
    db: AsyncSession, user_id: str, data: schemas.StepFeedbackUpdate,
) -> None:
    """스텝 반응 저장 — reaction/memo 업데이트"""
    q = select(UserTrainingStatus).where(
        and_(
            UserTrainingStatus.user_id == UUID(user_id),
            UserTrainingStatus.dog_id == UUID(data.dog_id),
            UserTrainingStatus.curriculum_id == data.curriculum_id,
            UserTrainingStatus.stage_id == data.stage_id,
            UserTrainingStatus.step_number == data.step_number,
        ),
    )
    existing = (await db.execute(q)).scalars().first()
    if existing:
        existing.reaction = data.reaction
        existing.memo = data.memo
        await db.commit()


async def get_step_feedback(
    db: AsyncSession, user_id: str, dog_id: UUID, curriculum_id: str | None = None,
) -> List[schemas.TrainingStatusResponse]:
    """reaction IS NOT NULL 행 조회 — 피드백 목록"""
    conditions = [
        UserTrainingStatus.user_id == UUID(user_id),
        UserTrainingStatus.dog_id == dog_id,
        UserTrainingStatus.reaction.isnot(None),
    ]
    if curriculum_id:
        conditions.append(UserTrainingStatus.curriculum_id == curriculum_id)
    q = select(UserTrainingStatus).where(and_(*conditions))
    results = (await db.execute(q)).scalars().all()
    return [schemas.TrainingStatusResponse.model_validate(r) for r in results]
