"""
구독/결제 라우터 — Toss IAP 연동
결제 검증은 Edge Function(verify-iap-order) 전담. 여기는 구독 상태 조회/관리.
FE api/subscription.ts 매핑
Parity: IAP-001
"""
from typing import Any, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.shared.models import Subscription, TossOrder

router = APIRouter()


class SubscriptionResponse(BaseModel):
    """FE subscription.ts Subscription 미러"""
    id: UUID
    user_id: UUID
    plan_type: str
    is_active: bool
    ai_tokens_remaining: int = 0
    ai_tokens_total: int = 0
    next_billing_date: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class OrderHistoryResponse(BaseModel):
    id: UUID
    product_id: str
    toss_status: str
    grant_status: str
    amount: int
    created_at: str

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=Optional[SubscriptionResponse])
async def get_subscription(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """현재 구독 상태 조회"""
    q = select(Subscription).where(Subscription.user_id == UUID(user_id))
    result = (await db.execute(q)).scalars().first()
    if not result:
        return None
    return SubscriptionResponse.model_validate(result)


@router.get("/orders", response_model=list[OrderHistoryResponse])
async def get_order_history(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """주문 이력 조회"""
    from sqlalchemy import desc
    q = (
        select(TossOrder)
        .where(TossOrder.user_id == UUID(user_id))
        .order_by(desc(TossOrder.created_at))
        .limit(20)
    )
    results = (await db.execute(q)).scalars().all()
    return [OrderHistoryResponse.model_validate(r) for r in results]


@router.post("/iap/verify")
async def proxy_iap_verify(
    request: Request,
    body: dict[str, Any] = Body(...),
    user_id: str = Depends(get_current_user_id),
) -> Any:
    """
    Toss mini-app이 /functions/v1/ 경로를 차단 → FastAPI를 통해 우회.
    FastAPI가 user_id를 검증 후 service role key로 Edge Function 호출.
    ES256 user JWT를 Edge Function에 직접 포워딩하면 edge runtime이 404 반환.
    Parity: IAP-001
    """
    service_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.SUPABASE_URL}/functions/v1/verify-iap-order",
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": "application/json",
            },
            json={**body, "userId": user_id},
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    return resp.json()
