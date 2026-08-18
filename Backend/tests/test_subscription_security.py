"""
IAP subscription security tests.
Parity: IAP-001
"""

from fastapi import HTTPException
import pytest
from uuid import uuid4

from app.features.subscription.router import (
    build_iap_verify_body,
    get_pending_orders_b2b,
    get_pending_orders,
    get_iap_proxy_service_key,
    get_stale_pending_status,
    proxy_iap_verify,
    verify_b2b_iap_context,
)
from app.shared.models import GrantStatus, OrgMemberRole, TossOrderStatus


class _ScalarResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return self

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _FakeDb:
    def __init__(self, rows):
        self.rows = rows
        self.executed = []

    async def execute(self, query):
        self.executed.append(query)
        return _ScalarResult(self.rows)


class _FakeDbSeq:
    def __init__(self, rows_by_call):
        self.rows_by_call = list(rows_by_call)
        self.executed = []

    async def execute(self, query):
        self.executed.append(query)
        rows = self.rows_by_call.pop(0) if self.rows_by_call else []
        return _ScalarResult(rows)


class _Order:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid4())
        self.user_id = kwargs.get("user_id", uuid4())
        self.product_id = kwargs["product_id"]
        self.toss_order_id = kwargs.get("toss_order_id")
        self.grant_status = kwargs.get("grant_status", GrantStatus.PENDING)
        self.toss_status = kwargs.get("toss_status", TossOrderStatus.ORDER_IN_PROGRESS)
        self.created_at = kwargs.get("created_at")


class _OrgMember:
    def __init__(self, role=OrgMemberRole.OWNER.value, status="active"):
        self.role = role
        self.status = status


class _FakeHttpResponse:
    status_code = 200

    def json(self):
        return {"ok": True, "data": {"id": "order-row-1"}}


class _FakeAsyncClient:
    calls = []

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, *, headers, json):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return _FakeHttpResponse()


def test_iap_proxy_overwrites_body_user_id():
    body = {
        "orderId": "ord-1",
        "productId": "prod-1",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
        "userId": "attacker-user-id",
    }

    result = build_iap_verify_body(body, "authenticated-user-id")

    assert result["userId"] == "authenticated-user-id"
    assert result["orderId"] == "ord-1"


@pytest.mark.asyncio
async def test_iap_proxy_endpoint_forwards_authenticated_user_id_not_body_user_id(monkeypatch):
    from app.features.subscription import router

    authenticated_user_id = "11111111-1111-4111-8111-111111111111"
    attacker_user_id = "22222222-2222-4222-8222-222222222222"
    body = {
        "orderId": "ord-1",
        "productId": "ait.0000020829.09e69bf9.90a91624b0.7443236299",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
        "userId": attacker_user_id,
    }
    _FakeAsyncClient.calls = []
    monkeypatch.setattr(router.settings, "SUPABASE_SERVICE_ROLE_KEY", "service-role-secret")
    monkeypatch.setattr(router.settings, "SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setattr(router.httpx, "AsyncClient", _FakeAsyncClient)

    response = await proxy_iap_verify(
        request=None,
        body=body,
        user_id=authenticated_user_id,
        db=_FakeDb([]),
    )

    assert response["ok"] is True
    assert len(_FakeAsyncClient.calls) == 1
    forwarded = _FakeAsyncClient.calls[0]
    assert forwarded["url"] == "https://project.supabase.co/functions/v1/verify-iap-order"
    assert forwarded["headers"]["Authorization"] == "Bearer service-role-secret"
    assert forwarded["headers"]["apikey"] == "service-role-secret"
    assert forwarded["json"]["userId"] == authenticated_user_id
    assert forwarded["json"]["userId"] != attacker_user_id
    assert forwarded["json"]["orderId"] == "ord-1"


@pytest.mark.asyncio
async def test_iap_proxy_validates_b2b_org_context_before_service_role_forward():
    body = {
        "orderId": "ord-1",
        "productId": "center_basic",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
        "orgId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    }
    db = _FakeDb([_OrgMember()])

    await verify_b2b_iap_context(db, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", body)

    result = build_iap_verify_body({**body, "userId": "attacker"}, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    assert result["userId"] == "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    assert result["orgId"] == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


@pytest.mark.asyncio
async def test_iap_proxy_rejects_b2b_org_context_for_non_manager():
    body = {
        "orderId": "ord-1",
        "productId": "center_basic",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
        "orgId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    }
    db = _FakeDb([])

    with pytest.raises(HTTPException) as exc_info:
        await verify_b2b_iap_context(db, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", body)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "B2B_IAP_ORG_FORBIDDEN"


@pytest.mark.asyncio
async def test_iap_proxy_rejects_trainer_plan_for_other_user():
    body = {
        "orderId": "ord-1",
        "productId": "trainer_10",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
        "trainerUserId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    }
    db = _FakeDb([])

    with pytest.raises(HTTPException) as exc_info:
        await verify_b2b_iap_context(db, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", body)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "B2B_IAP_TRAINER_FORBIDDEN"


@pytest.mark.asyncio
async def test_iap_proxy_rejects_b2b_product_without_scope():
    body = {
        "orderId": "ord-1",
        "productId": "center_basic",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
    }
    db = _FakeDb([])

    with pytest.raises(HTTPException) as exc_info:
        await verify_b2b_iap_context(db, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", body)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "B2B_IAP_SCOPE_REQUIRED"


@pytest.mark.asyncio
async def test_iap_proxy_rejects_b2c_product_with_org_scope():
    body = {
        "orderId": "ord-1",
        "productId": "ait.0000020829.09e69bf9.90a91624b0.7443236299",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
        "orgId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    }
    db = _FakeDb([_OrgMember()])

    with pytest.raises(HTTPException) as exc_info:
        await verify_b2b_iap_context(db, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", body)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "B2B_IAP_PRODUCT_SCOPE_MISMATCH"


@pytest.mark.asyncio
async def test_iap_proxy_rejects_b2c_product_with_trainer_scope():
    body = {
        "orderId": "ord-1",
        "productId": "ait.0000020829.09e69bf9.90a91624b0.7443236299",
        "transactionId": "tx-1",
        "idempotencyKey": "idem-1",
        "trainerUserId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    }
    db = _FakeDb([])

    with pytest.raises(HTTPException) as exc_info:
        await verify_b2b_iap_context(db, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", body)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "B2B_IAP_PRODUCT_SCOPE_MISMATCH"


@pytest.mark.asyncio
async def test_pending_orders_b2b_uses_server_verified_org_scope():
    order = _Order(product_id="center_basic", toss_order_id="ord-b2b")
    db = _FakeDbSeq([[_OrgMember()], [order]])

    response = await get_pending_orders_b2b(
        org_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        trainer_user_id=None,
        user_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        db=db,
    )

    assert response[0].order_id == "ord-b2b"
    assert response[0].product_id == "center_basic"
    assert len(db.executed) == 2


def test_iap_proxy_requires_service_role_key(monkeypatch):
    from app.features.subscription import router

    monkeypatch.setattr(router.settings, "SUPABASE_SERVICE_ROLE_KEY", None)

    try:
        get_iap_proxy_service_key()
    except HTTPException as exc:
        assert exc.status_code == 500
        assert exc.detail["code"] == "SUPABASE_SERVICE_ROLE_KEY_MISSING"
    else:
        raise AssertionError("Expected HTTPException")


@pytest.mark.asyncio
async def test_pending_orders_endpoint_returns_only_server_selected_shape():
    order = _Order(product_id="pro_monthly", toss_order_id="ord-1")
    db = _FakeDb([order])

    response = await get_pending_orders(user_id=str(uuid4()), db=db)

    assert response[0].order_id == "ord-1"
    assert response[0].transaction_id == "ord-1"
    assert response[0].product_id == "pro_monthly"


@pytest.mark.asyncio
async def test_stale_pending_status_requires_product_match():
    order = _Order(
        product_id="pro_monthly",
        toss_order_id="ord-1",
        grant_status=GrantStatus.GRANT_FAILED,
        toss_status=TossOrderStatus.NOT_FOUND,
    )
    db = _FakeDb([order])

    response = await get_stale_pending_status(
        toss_order_id="ord-1",
        product_id="other_product",
        user_id=str(uuid4()),
        db=db,
    )

    assert response.terminal_reason is None
    assert response.product_id is None


@pytest.mark.asyncio
async def test_stale_pending_status_reports_terminal_failure_for_current_user_query():
    order = _Order(
        product_id="pro_monthly",
        toss_order_id="ord-1",
        grant_status=GrantStatus.GRANT_FAILED,
        toss_status=TossOrderStatus.NOT_FOUND,
    )
    db = _FakeDb([order])

    response = await get_stale_pending_status(
        toss_order_id="ord-1",
        product_id="pro_monthly",
        user_id=str(uuid4()),
        db=db,
    )

    assert response.product_id == "pro_monthly"
    assert response.grant_status == "grant_failed"
    assert response.toss_status == "NOT_FOUND"
    assert response.terminal_reason == "grant_failed:NOT_FOUND"
