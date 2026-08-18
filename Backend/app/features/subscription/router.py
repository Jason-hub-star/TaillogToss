"""
구독/결제 라우터 — Toss IAP 연동
결제 검증은 Edge Function(verify-iap-order) 전담. 여기는 구독 상태 조회/관리.
FE api/subscription.ts 매핑
Parity: IAP-001
"""
from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.features.subscription.entitlements import resolve_effective_pro
from app.shared.models import GrantStatus, OrgMember, OrgMemberRole, OrgMemberStatus, Subscription, TossOrder, TossOrderStatus

router = APIRouter()

CENTER_IAP_PRODUCTS = {"center_basic", "center_pro", "center_enterprise"}
TRAINER_IAP_PRODUCTS = {"trainer_10", "trainer_30", "trainer_50"}


def parse_uuid_param(value: Any, code: str) -> UUID:
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail={"code": code, "message": "Invalid UUID"})


class SubscriptionResponse(BaseModel):
    """FE subscription.ts Subscription 미러"""
    id: UUID
    user_id: UUID
    plan_type: str
    is_active: bool
    ai_tokens_remaining: int = 0
    ai_tokens_total: int = 0
    next_billing_date: Optional[datetime | date] = None
    created_at: datetime
    updated_at: datetime
    effective_is_pro: bool = False
    effective_pro_source: Optional[str] = None
    effective_pro_expires_at: Optional[datetime | date] = None

    model_config = ConfigDict(from_attributes=True)


async def build_subscription_response(
    db: AsyncSession,
    user_id: str,
    subscription: Subscription | None,
) -> SubscriptionResponse | None:
    state = await resolve_effective_pro(db, user_id, subscription=subscription)
    if not subscription and not state.entitlement:
        return None

    if subscription:
        response = SubscriptionResponse.model_validate(subscription)
    else:
        entitlement = state.entitlement
        response = SubscriptionResponse(
            id=entitlement.id,
            user_id=entitlement.user_id,
            plan_type="FREE",
            is_active=False,
            ai_tokens_remaining=0,
            ai_tokens_total=0,
            next_billing_date=None,
            created_at=entitlement.created_at,
            updated_at=entitlement.updated_at,
        )

    response.effective_is_pro = state.is_pro
    response.effective_pro_source = state.source
    response.effective_pro_expires_at = state.expires_at
    return response


class OrderHistoryResponse(BaseModel):
    id: UUID
    product_id: str
    toss_status: str
    grant_status: str
    amount: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PendingOrderResponse(BaseModel):
    order_id: str
    product_id: str
    transaction_id: str


class StalePendingStatusResponse(BaseModel):
    product_id: Optional[str] = None
    grant_status: Optional[str] = None
    toss_status: Optional[str] = None
    terminal_reason: Optional[str] = None


def get_iap_proxy_service_key() -> str:
    """IAP proxy는 service role key 없이는 fail-closed."""
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "SUPABASE_SERVICE_ROLE_KEY_MISSING",
                "message": "IAP proxy requires SUPABASE_SERVICE_ROLE_KEY",
            },
        )
    return settings.SUPABASE_SERVICE_ROLE_KEY


def build_iap_verify_body(body: dict[str, Any], user_id: str) -> dict[str, Any]:
    """요청 body의 userId 변조를 무시하고 인증된 user_id만 전달."""
    return {**body, "userId": user_id}


async def verify_b2b_iap_context(
    db: AsyncSession,
    user_id: str,
    body: dict[str, Any],
) -> None:
    """B2B IAP context는 서버가 현재 JWT 사용자 권한으로 검증한 뒤 Edge로 전달한다."""
    org_id = body.get("orgId")
    trainer_user_id = body.get("trainerUserId")
    product_id = body.get("productId")
    if not org_id and not trainer_user_id:
        if product_id in CENTER_IAP_PRODUCTS or product_id in TRAINER_IAP_PRODUCTS:
            raise HTTPException(status_code=400, detail={"code": "B2B_IAP_SCOPE_REQUIRED"})
        return
    if org_id and trainer_user_id:
        raise HTTPException(
            status_code=400,
            detail={"code": "B2B_IAP_SCOPE_XOR", "message": "orgId and trainerUserId are mutually exclusive"},
        )

    current_user_uuid = parse_uuid_param(user_id, "AUTH_USER_ID_INVALID")

    if org_id:
        if product_id not in CENTER_IAP_PRODUCTS:
            raise HTTPException(
                status_code=400,
                detail={"code": "B2B_IAP_PRODUCT_SCOPE_MISMATCH", "message": "Center plans require orgId"},
            )
        org_uuid = parse_uuid_param(org_id, "B2B_IAP_ORG_ID_INVALID")
        q = select(OrgMember).where(
            OrgMember.org_id == org_uuid,
            OrgMember.user_id == current_user_uuid,
            OrgMember.status == OrgMemberStatus.ACTIVE.value,
            OrgMember.role.in_([OrgMemberRole.OWNER.value, OrgMemberRole.MANAGER.value]),
        )
        member = (await db.execute(q)).scalars().first()
        if not member:
            raise HTTPException(
                status_code=403,
                detail={"code": "B2B_IAP_ORG_FORBIDDEN", "message": "Only active org owners/managers can buy center plans"},
            )
        return

    if product_id not in TRAINER_IAP_PRODUCTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "B2B_IAP_PRODUCT_SCOPE_MISMATCH", "message": "Trainer plans require trainerUserId"},
        )
    if parse_uuid_param(trainer_user_id, "B2B_IAP_TRAINER_ID_INVALID") != current_user_uuid:
        raise HTTPException(
            status_code=403,
            detail={"code": "B2B_IAP_TRAINER_FORBIDDEN", "message": "Trainer plans can only be bought for the current trainer"},
        )


async def verify_b2b_recovery_scope(
    db: AsyncSession,
    user_id: str,
    org_id: Optional[str],
    trainer_user_id: Optional[str],
) -> tuple[Optional[UUID], Optional[UUID]]:
    if not org_id and not trainer_user_id:
        raise HTTPException(status_code=400, detail={"code": "B2B_IAP_SCOPE_REQUIRED"})
    if org_id and trainer_user_id:
        raise HTTPException(status_code=400, detail={"code": "B2B_IAP_SCOPE_XOR"})

    current_user_uuid = parse_uuid_param(user_id, "AUTH_USER_ID_INVALID")
    if org_id:
        org_uuid = parse_uuid_param(org_id, "B2B_IAP_ORG_ID_INVALID")
        q = select(OrgMember).where(
            OrgMember.org_id == org_uuid,
            OrgMember.user_id == current_user_uuid,
            OrgMember.status == OrgMemberStatus.ACTIVE.value,
            OrgMember.role.in_([OrgMemberRole.OWNER.value, OrgMemberRole.MANAGER.value]),
        )
        member = (await db.execute(q)).scalars().first()
        if not member:
            raise HTTPException(status_code=403, detail={"code": "B2B_IAP_ORG_FORBIDDEN"})
        return org_uuid, None

    trainer_uuid = parse_uuid_param(trainer_user_id, "B2B_IAP_TRAINER_ID_INVALID")
    if trainer_uuid != current_user_uuid:
        raise HTTPException(status_code=403, detail={"code": "B2B_IAP_TRAINER_FORBIDDEN"})
    return None, trainer_uuid


@router.get("/", response_model=Optional[SubscriptionResponse])
async def get_subscription(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """현재 구독 상태 조회"""
    q = select(Subscription).where(Subscription.user_id == UUID(user_id))
    result = (await db.execute(q)).scalars().first()
    return await build_subscription_response(db, user_id, result)


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


@router.get("/orders/pending", response_model=list[PendingOrderResponse])
async def get_pending_orders(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """현재 사용자 pending 주문 복구 후보 조회"""
    q = (
        select(TossOrder)
        .where(
            TossOrder.user_id == UUID(user_id),
            TossOrder.grant_status == GrantStatus.PENDING,
        )
        .order_by(TossOrder.created_at.asc())
        .limit(20)
    )
    results = (await db.execute(q)).scalars().all()
    return [
        PendingOrderResponse(
            order_id=str(order.toss_order_id or order.id),
            product_id=order.product_id,
            transaction_id=str(order.toss_order_id or order.id),
        )
        for order in results
    ]


@router.get("/orders/pending/b2b", response_model=list[PendingOrderResponse])
async def get_pending_orders_b2b(
    org_id: Optional[str] = None,
    trainer_user_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """서버가 검증한 org/trainer scope의 pending 주문 복구 후보 조회"""
    org_uuid, trainer_uuid = await verify_b2b_recovery_scope(db, user_id, org_id, trainer_user_id)
    filters = [TossOrder.grant_status == GrantStatus.PENDING]
    if org_uuid:
        filters.append(TossOrder.org_id == org_uuid)
    else:
        filters.append(TossOrder.trainer_user_id == trainer_uuid)

    q = (
        select(TossOrder)
        .where(*filters)
        .order_by(TossOrder.created_at.asc())
        .limit(20)
    )
    results = (await db.execute(q)).scalars().all()
    return [
        PendingOrderResponse(
            order_id=str(order.toss_order_id or order.id),
            product_id=order.product_id,
            transaction_id=str(order.toss_order_id or order.id),
        )
        for order in results
    ]


@router.get("/orders/stale-status", response_model=StalePendingStatusResponse)
async def get_stale_pending_status(
    toss_order_id: str,
    product_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """현재 사용자 주문이 terminal failure라 SDK pending 정리 대상인지 조회"""
    q = (
        select(TossOrder)
        .where(
            TossOrder.user_id == UUID(user_id),
            TossOrder.toss_order_id == toss_order_id,
        )
        .order_by(desc(TossOrder.created_at))
        .limit(1)
    )
    order = (await db.execute(q)).scalars().first()
    if not order or order.product_id != product_id:
        return StalePendingStatusResponse()

    grant_status = order.grant_status.value if hasattr(order.grant_status, "value") else str(order.grant_status)
    toss_status = order.toss_status.value if hasattr(order.toss_status, "value") else str(order.toss_status)
    terminal = (
        order.grant_status in {GrantStatus.GRANT_FAILED, GrantStatus.REFUNDED}
        and order.toss_status in {
            TossOrderStatus.NOT_FOUND,
            TossOrderStatus.FAILED,
            TossOrderStatus.REFUNDED,
        }
    )
    return StalePendingStatusResponse(
        product_id=order.product_id,
        grant_status=grant_status,
        toss_status=toss_status,
        terminal_reason=f"{grant_status}:{toss_status}" if terminal else None,
    )


@router.post("/iap/verify")
async def proxy_iap_verify(
    request: Request,
    body: dict[str, Any] = Body(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Toss mini-app이 /functions/v1/ 경로를 차단 → FastAPI를 통해 우회.
    FastAPI가 user_id를 검증 후 service role key로 Edge Function 호출.
    ES256 user JWT를 Edge Function에 직접 포워딩하면 edge runtime이 404 반환.
    Parity: IAP-001
    """
    service_key = get_iap_proxy_service_key()
    await verify_b2b_iap_context(db, user_id, body)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.SUPABASE_URL}/functions/v1/verify-iap-order",
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": "application/json",
            },
            json=build_iap_verify_body(body, user_id),
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.json())
    return resp.json()
