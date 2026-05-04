"""
AI 코칭 라우터 — 생성/목록/최신/피드백/비용/사용량
FE api/coaching.ts 매핑: getCoachings, getLatestCoaching, submitFeedback, generateCoaching
Parity: AI-001
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id, verify_admin_key
from app.features.coaching import budget, schemas, service
from app.shared.utils.ownership import verify_dog_ownership

router = APIRouter()


@router.post("/generate", response_model=schemas.CoachingResponse)
async def generate_coaching(
    request: schemas.CoachingRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """6블록 AI 코칭 생성 — 버스트/일일 제한 적용"""
    await verify_dog_ownership(db, UUID(request.dog_id), user_id=user_id)

    # 버스트 제한 (2회/10분, 공통)
    burst_ok = await budget.check_user_burst_limit(db, user_id)
    if not burst_ok:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "잠시 후 다시 시도해 주세요",
                "remaining": 0,
                "retry_after_sec": 600,
            },
        )

    # 일일 제한 (구독 차등)
    daily_ok, used, limit = await budget.check_user_daily_limit(db, user_id)
    if not daily_ok:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "일일 코칭 한도에 도달했어요",
                "remaining": 0,
                "daily_used": used,
                "daily_limit": limit,
                "retry_after_sec": _seconds_until_midnight(),
            },
        )

    return await service.generate_coaching(db, request)


@router.get("/usage/daily", response_model=schemas.DailyUsageResponse)
async def get_daily_usage(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """사용자 일일 코칭 사용량"""
    _, used, limit = await budget.check_user_daily_limit(db, user_id)
    return schemas.DailyUsageResponse(used=used, limit=limit)


@router.get("/{dog_id}", response_model=List[schemas.CoachingResponse])
async def get_coachings(
    dog_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """코칭 목록 조회"""
    await verify_dog_ownership(db, dog_id, user_id=user_id)
    return await service.get_coaching_list(db, dog_id)


@router.get("/{dog_id}/latest", response_model=Optional[schemas.CoachingResponse])
async def get_latest_coaching(
    dog_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """최신 코칭 결과"""
    await verify_dog_ownership(db, dog_id, user_id=user_id)
    return await service.get_latest_coaching(db, dog_id)


@router.patch("/{coaching_id}/feedback", response_model=schemas.FeedbackResponse)
async def submit_feedback(
    coaching_id: UUID,
    data: schemas.FeedbackRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """코칭 피드백 제출 (1-5점)"""
    return await service.submit_feedback(db, coaching_id, data.score, user_id)


@router.patch("/{coaching_id}/actions/{action_item_id}", response_model=schemas.ActionTrackerResponse)
async def toggle_action_item(
    coaching_id: UUID,
    action_item_id: str,
    data: schemas.ActionToggleRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """액션 아이템 완료 토글"""
    return await service.toggle_action_item(db, coaching_id, action_item_id, data.is_completed)


@router.get("/cost/status", response_model=schemas.CostStatusResponse)
async def get_cost_status(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """AI 비용 현황 조회"""
    return await service.get_cost_status(db)


# ──────────────────────────────────────────────────────
# Admin 엔드포인트 (service_role 전용 — 내부 자동화용)
# ──────────────────────────────────────────────────────

@router.post("/admin/generate-synthetic")
async def generate_synthetic_today(
    _: None = Depends(verify_admin_key),
    db: AsyncSession = Depends(get_db),
):
    """
    오늘 카테고리 합성 코칭 3건 생성.
    daily-coaching-synthetic-gen 자동화에서 호출.
    """
    from app.features.coaching.synthetic import (
        generate_synthetic_coaching,
        get_today_category,
        is_already_run_today,
    )
    from app.features.coaching.training import tag_training_candidate
    from sqlalchemy import select as sa_select
    from app.shared.models import AICoaching as AICoachingModel
    import uuid

    if await is_already_run_today(db):
        return {"skipped": True, "reason": "already_run_today"}

    category = get_today_category()
    coaching_ids = await generate_synthetic_coaching(db, category)

    # 생성된 건에 대해 품질 태깅
    tagged = 0
    for cid in coaching_ids:
        q = sa_select(AICoachingModel).where(AICoachingModel.id == uuid.UUID(cid))
        coaching = (await db.execute(q)).scalar_one_or_none()
        if coaching:
            await tag_training_candidate(db, coaching)
            tagged += 1
    await db.commit()

    return {
        "category": category,
        "generated": len(coaching_ids),
        "tagged": tagged,
        "ids": coaching_ids,
    }


@router.post("/admin/tag-candidates")
async def tag_all_candidates(
    threshold: int = 70,
    _: None = Depends(verify_admin_key),
    db: AsyncSession = Depends(get_db),
):
    """
    training_quality_score NULL 레코드 전체 태깅.
    daily 자동화 step 3에서 호출.
    """
    from app.features.coaching.training import tag_unscored_candidates
    processed = await tag_unscored_candidates(db, threshold=threshold)
    return {"processed": processed, "threshold": threshold}


@router.post("/admin/export-jsonl")
async def export_jsonl(
    batch_name: str,
    _: None = Depends(verify_admin_key),
    db: AsyncSession = Depends(get_db),
):
    """
    approved 레코드 JSONL 변환 + 배치 메타 기록.
    Fine-tuning 준비 완료 시 수동 실행.
    """
    from app.features.coaching.training import export_approved_to_jsonl
    count, content = await export_approved_to_jsonl(db, batch_name)
    return {"count": count, "batch_name": batch_name, "content": content}


@router.post("/{dog_id}/ask-coach", response_model=schemas.CoachingQuestionResponse)
async def ask_coach(
    dog_id: UUID,
    request: schemas.CoachingQuestionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Pro 전용 AI 코치 1:1 질문"""
    return await service.ask_coach(db, user_id, dog_id, request)


@router.get("/{dog_id}/question", response_model=List[schemas.CoachingQuestionResponse])
async def get_question_history(
    dog_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """AI 코치 질문 이력 조회"""
    await verify_dog_ownership(db, dog_id, user_id=user_id)
    return await service.get_question_history(db, user_id, dog_id)


def _seconds_until_midnight() -> int:
    """자정까지 남은 초"""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    next_midnight = midnight + timedelta(days=1)
    return int((next_midnight - now).total_seconds())
