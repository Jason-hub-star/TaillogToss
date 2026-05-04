"""
온보딩 서비스 — 설문 제출 처리
Parity: APP-001

Progressive Profiling:
  submit_survey_stage1/2/3 — Stage별 단계적 수집
  get_survey_status        — 완성도 조회
  update_survey_stage      — 기존 Stage 수정
"""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException
from app.features.onboarding import repository, schemas


def _parse_user_id(user_id: str) -> UUID:
    try:
        return UUID(user_id)
    except ValueError:
        raise BadRequestException("Invalid User ID format")


async def submit_survey(
    db: AsyncSession,
    user_id: str,
    data: schemas.SurveySubmission,
) -> schemas.DogResponse:
    """설문 일괄 제출 (deprecated — 하위 호환 유지)"""
    dog = await repository.create_dog_with_env(db, _parse_user_id(user_id), data)
    return schemas.DogResponse.model_validate(dog)


async def submit_survey_stage1(
    db: AsyncSession,
    user_id: str,
    data: schemas.SurveyStage1,
) -> schemas.DogResponse:
    """Stage 1 제출 → Dog + DogEnv(stage=1) 생성"""
    dog = await repository.create_dog_with_stage1(db, _parse_user_id(user_id), data)
    return schemas.DogResponse.model_validate(dog)


async def submit_survey_stage2(
    db: AsyncSession,
    user_id: str,
    dog_id: str,
    data: schemas.SurveyStage2,
) -> schemas.SurveyStatusResponse:
    """Stage 2 제출 → 행동/환경 저장 + AI 코칭 활성화"""
    uid = _parse_user_id(user_id)
    did = UUID(dog_id)
    await repository.update_dog_with_stage2(db, uid, did, data)
    return await repository.get_survey_status(db, did)


async def submit_survey_stage3(
    db: AsyncSession,
    user_id: str,
    dog_id: str,
    data: schemas.SurveyStage3,
) -> schemas.SurveyStatusResponse:
    """Stage 3 제출 → 기질/건강 저장 + 풀 개인화 활성화"""
    uid = _parse_user_id(user_id)
    did = UUID(dog_id)
    await repository.update_dog_with_stage3(db, uid, did, data)
    return await repository.get_survey_status(db, did)


async def get_survey_status(
    db: AsyncSession,
    user_id: str,
    dog_id: str,
) -> schemas.SurveyStatusResponse:
    """설문 완성도 조회"""
    return await repository.get_survey_status(db, UUID(dog_id))


async def update_survey_stage(
    db: AsyncSession,
    user_id: str,
    dog_id: str,
    stage: int,
    data: dict,
) -> schemas.SurveyStatusResponse:
    """기존 Stage 응답 수정 (완료된 Stage만)"""
    uid = _parse_user_id(user_id)
    did = UUID(dog_id)
    await repository.patch_survey_stage(db, uid, did, stage, data)
    return await repository.get_survey_status(db, did)
