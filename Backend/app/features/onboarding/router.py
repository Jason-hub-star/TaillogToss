"""
온보딩 라우터
Toss 미니앱: 인증 필수 (게스트 cookie 제거)
Parity: APP-001

Progressive Profiling 엔드포인트:
  POST /survey/stage1          — Stage 1 (최초 진입)
  POST /survey/stage2/{dog_id} — Stage 2 (코칭 진입 전)
  POST /survey/stage3/{dog_id} — Stage 3 (Pro 전환 시)
  GET  /survey/status/{dog_id} — 완성도 조회
  PATCH /survey/{dog_id}/{stage} — 기존 Stage 수정
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.features.onboarding import schemas, service

router = APIRouter()


@router.post("/survey", response_model=schemas.DogResponse, status_code=status.HTTP_201_CREATED)
async def submit_onboarding_survey(
    data: schemas.SurveySubmission,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """온보딩 설문 일괄 제출 (deprecated — 하위 호환)"""
    return await service.submit_survey(db, user_id, data)


@router.post("/survey/stage1", response_model=schemas.DogResponse, status_code=status.HTTP_201_CREATED)
async def submit_stage1(
    data: schemas.SurveyStage1,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Stage 1 제출 — 최초 진입 필수 (스킵 불가)"""
    return await service.submit_survey_stage1(db, user_id, data)


@router.post("/survey/stage2/{dog_id}", response_model=schemas.SurveyStatusResponse)
async def submit_stage2(
    dog_id: str,
    data: schemas.SurveyStage2,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Stage 2 제출 — 행동/환경 저장, AI 코칭 활성화"""
    return await service.submit_survey_stage2(db, user_id, dog_id, data)


@router.post("/survey/stage3/{dog_id}", response_model=schemas.SurveyStatusResponse)
async def submit_stage3(
    dog_id: str,
    data: schemas.SurveyStage3,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Stage 3 제출 — 기질/건강 저장, Pro 풀 개인화 활성화"""
    return await service.submit_survey_stage3(db, user_id, dog_id, data)


@router.get("/survey/status/{dog_id}", response_model=schemas.SurveyStatusResponse)
async def get_survey_status(
    dog_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """설문 완성도 조회"""
    return await service.get_survey_status(db, user_id, dog_id)


@router.patch("/survey/{dog_id}/{stage}", response_model=schemas.SurveyStatusResponse)
async def patch_survey_stage(
    dog_id: str,
    stage: int,
    data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """기존 Stage 응답 수정 (완료된 Stage만 허용)"""
    return await service.update_survey_stage(db, user_id, dog_id, stage, data)
