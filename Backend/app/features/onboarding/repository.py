"""
온보딩 리포지토리 — Dog + DogEnv + 시드 로그 생성
DogCoach onboarding/repository.py 마이그레이션 (guest cookie 제거)
Parity: APP-001

Progressive Profiling 함수:
  create_dog_with_stage1 — Stage 1 전용 Dog+DogEnv 생성
  update_dog_with_stage2 — Stage 2 DogEnv 업데이트
  update_dog_with_stage3 — Stage 3 DogEnv 업데이트
  get_survey_status      — 완성도 조회
  patch_survey_stage     — 기존 Stage 응답 수정
"""
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.features.onboarding import schemas
from app.shared.models import BehaviorLog, Dog, DogEnv, User


async def create_dog_with_env(
    db: AsyncSession,
    user_id: UUID,
    data: schemas.SurveySubmission,
) -> Dog:
    """Dog + DogEnv + 시드 BehaviorLog 생성 (JIT User 포함)"""
    # JIT User 생성
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user_record = result.scalars().first()
    if not user_record:
        user_record = User(id=user_id)
        db.add(user_record)
        await db.flush()

    # Dog 생성
    dog = Dog(
        user_id=user_id,
        name=data.name,
        breed=data.breed or None,
        birth_date=data.birth_date,
        sex=data.sex,
        weight_kg=data.weight_kg,
        profile_image_url=data.profile_image_url,
    )
    db.add(dog)
    await db.flush()  # dog.id 생성

    # DogEnv 생성 (JSONB 필드)
    dog_env = DogEnv(
        dog_id=dog.id,
        profile_meta=data.profile_meta.model_dump(mode="json"),
        household_info=data.household_info.model_dump(mode="json"),
        health_meta=data.health_meta.model_dump(mode="json"),
        rewards_meta=data.rewards_meta.model_dump(mode="json"),
        chronic_issues=data.chronic_issues.model_dump(mode="json"),
        triggers=data.triggers.model_dump(mode="json"),
        past_attempts=data.past_attempts.model_dump(mode="json"),
        temperament=data.temperament.model_dump(mode="json"),
        activity_meta=data.activity_meta.model_dump(mode="json"),
    )
    db.add(dog_env)

    # 시드 로그 (Cold Start)
    if data.chronic_issues.top_issues:
        first_issue = data.chronic_issues.top_issues[0]
        seed_log = BehaviorLog(
            dog_id=dog.id,
            is_quick_log=False,
            antecedent="설문조사 기반 초기 데이터",
            behavior=first_issue,
            consequence="초기 분석 대기중",
            intensity=5,
        )
        db.add(seed_log)

    await db.commit()
    await db.refresh(dog)
    return dog


# ── Progressive Profiling ────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_dog_with_stage1(
    db: AsyncSession,
    user_id: UUID,
    data: schemas.SurveyStage1,
) -> Dog:
    """Stage 1 — Dog + DogEnv(completion_stage=1) 생성"""
    stmt = select(User).where(User.id == user_id)
    user_record = (await db.execute(stmt)).scalars().first()
    if not user_record:
        user_record = User(id=user_id)
        db.add(user_record)
        await db.flush()

    dog = Dog(
        user_id=user_id,
        name=data.name,
        breed=data.breed or None,
        birth_date=data.birth_date,
        sex=data.sex,
        weight_kg=data.weight_kg,
        profile_image_url=data.profile_image_url,
    )
    db.add(dog)
    await db.flush()

    dog_env = DogEnv(
        dog_id=dog.id,
        onboarding_survey={
            "completion_stage": 1,
            "stage1_completed_at": _now_iso(),
            "stage1_response": data.model_dump(mode="json"),
        },
    )
    db.add(dog_env)
    await db.commit()
    await db.refresh(dog)
    return dog


async def update_dog_with_stage2(
    db: AsyncSession,
    user_id: UUID,
    dog_id: UUID,
    data: schemas.SurveyStage2,
) -> None:
    """Stage 2 — 행동/환경 데이터 저장, completion_stage=2"""
    dog_env = await _get_dog_env_owned(db, user_id, dog_id)

    survey = dict(dog_env.onboarding_survey or {})
    survey.update({
        "completion_stage": max(survey.get("completion_stage", 1), 2),
        "stage2_completed_at": _now_iso(),
        "stage2_response": data.model_dump(mode="json"),
    })
    dog_env.onboarding_survey = survey
    dog_env.household_info = data.household_info.model_dump(mode="json")
    dog_env.chronic_issues = data.chronic_issues.model_dump(mode="json")
    dog_env.triggers = data.triggers.model_dump(mode="json")
    dog_env.antecedents = data.antecedents.model_dump(mode="json")
    dog_env.past_attempts = data.past_attempts.model_dump(mode="json")
    existing_activity = dict(dog_env.activity_meta or {})
    existing_activity.update(data.activity_meta.model_dump(mode="json", exclude_none=True))
    dog_env.activity_meta = existing_activity
    dog_env.rewards_meta = data.rewards_meta.model_dump(mode="json")
    await db.commit()


async def update_dog_with_stage3(
    db: AsyncSession,
    user_id: UUID,
    dog_id: UUID,
    data: schemas.SurveyStage3,
) -> None:
    """Stage 3 — 기질/건강 데이터 저장, completion_stage=3"""
    dog_env = await _get_dog_env_owned(db, user_id, dog_id)

    survey = dict(dog_env.onboarding_survey or {})
    if int(survey.get("completion_stage", 1)) < 2:
        raise BadRequestException("Stage 2를 먼저 완료해주세요")

    survey.update({
        "completion_stage": 3,
        "stage3_completed_at": _now_iso(),
        "stage3_response": data.model_dump(mode="json"),
    })
    dog_env.onboarding_survey = survey
    dog_env.temperament = data.temperament.model_dump(mode="json")
    dog_env.health_meta = data.health_meta.model_dump(mode="json")
    existing_activity = dict(dog_env.activity_meta or {})
    existing_activity.update(data.activity_meta.model_dump(mode="json", exclude_none=True))
    dog_env.activity_meta = existing_activity
    dog_env.rewards_meta = data.rewards_meta.model_dump(mode="json")
    await db.commit()


async def get_survey_status(
    db: AsyncSession,
    dog_id: UUID,
) -> schemas.SurveyStatusResponse:
    """완성도 조회 — onboarding_survey JSONB에서 stage 계산"""
    stmt = select(DogEnv).where(DogEnv.dog_id == dog_id)
    dog_env = (await db.execute(stmt)).scalars().first()
    if not dog_env:
        raise NotFoundException("DogEnv not found")

    survey = dog_env.onboarding_survey or {}
    stage = int(survey.get("completion_stage", 1))

    pct_map = {1: 25, 2: 60, 3: 100}
    locked: list[str] = []
    if stage < 2:
        locked.append("ai_coaching")
    if stage < 3:
        locked.append("ask_ai")

    return schemas.SurveyStatusResponse(
        dog_id=dog_id,
        completion_stage=stage,
        completion_percentage=pct_map.get(stage, 25),
        locked_features=locked,
        stage1_completed_at=survey.get("stage1_completed_at"),
        stage2_completed_at=survey.get("stage2_completed_at"),
        stage3_completed_at=survey.get("stage3_completed_at"),
    )


async def patch_survey_stage(
    db: AsyncSession,
    user_id: UUID,
    dog_id: UUID,
    stage: int,
    data: dict[str, Any],
) -> None:
    """기존 Stage 응답 수정 (완료된 Stage만 허용)"""
    dog_env = await _get_dog_env_owned(db, user_id, dog_id)
    survey = dict(dog_env.onboarding_survey or {})
    current_stage = int(survey.get("completion_stage", 1))

    if stage > current_stage:
        raise BadRequestException(f"Stage {stage}는 아직 완료되지 않았어요 (현재: {current_stage})")

    response_key = f"stage{stage}_response"
    if response_key in survey:
        survey[response_key].update(data)
    else:
        survey[response_key] = data

    dog_env.onboarding_survey = survey

    # 개별 JSONB 필드도 동기화 — 코칭 생성 시 직접 참조하는 필드들
    if stage == 2:
        if "household_info" in data:
            dog_env.household_info = data["household_info"]
        if "chronic_issues" in data:
            dog_env.chronic_issues = data["chronic_issues"]
        if "triggers" in data:
            dog_env.triggers = data["triggers"]
        if "antecedents" in data:
            dog_env.antecedents = data["antecedents"]
        if "past_attempts" in data:
            dog_env.past_attempts = data["past_attempts"]
    elif stage == 3:
        if "temperament" in data:
            dog_env.temperament = data["temperament"]
        if "health_meta" in data:
            dog_env.health_meta = data["health_meta"]
        if "activity_meta" in data:
            dog_env.activity_meta = data["activity_meta"]
        if "rewards_meta" in data:
            dog_env.rewards_meta = data["rewards_meta"]

    await db.commit()


async def _get_dog_env_owned(
    db: AsyncSession,
    user_id: UUID,
    dog_id: UUID,
) -> DogEnv:
    """소유권 확인 후 DogEnv 반환"""
    stmt = (
        select(DogEnv)
        .join(Dog, Dog.id == DogEnv.dog_id)
        .where(DogEnv.dog_id == dog_id, Dog.user_id == user_id)
    )
    dog_env = (await db.execute(stmt)).scalars().first()
    if not dog_env:
        raise NotFoundException("DogEnv not found or not owned by user")
    return dog_env
