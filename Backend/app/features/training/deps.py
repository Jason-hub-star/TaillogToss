"""Training 라우터 의존성 — Pro 커리큘럼 접근 보호"""
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.models import Subscription

# FE published/v2026-03-02-auto-080532/curriculum.ts 의 access:'pro' ID 목록과 동기화
PRO_CURRICULUM_IDS: frozenset[str] = frozenset({
    'leash_manners',
    'separation_anxiety',
    'reactivity_management',
    'impulse_control',
    'socialization',
    'fear_desensitization',
})


async def require_pro_for_curriculum(
    curriculum_id: str,
    user_id: str,
    db: AsyncSession,
) -> None:
    """Pro 전용 커리큘럼 접근 검증. Free 커리큘럼은 즉시 통과."""
    if curriculum_id not in PRO_CURRICULUM_IDS:
        return
    q = select(Subscription).where(Subscription.user_id == UUID(user_id))
    sub = (await db.execute(q)).scalar_one_or_none()
    is_pro = bool(sub and sub.plan_type.value == "PRO_MONTHLY" and sub.is_active)
    if not is_pro:
        raise HTTPException(
            status_code=403,
            detail={"message": "Pro 구독이 필요한 커리큘럼이에요", "curriculum_id": curriculum_id},
        )
