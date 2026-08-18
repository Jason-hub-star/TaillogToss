"""
보안 검증 테스트 — 예외 계층 + 인증 흐름
"""
import pytest
import logging
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.core.exceptions import (
    BadRequestException,
    DomainException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
)


class TestDomainExceptions:
    def test_not_found(self):
        exc = NotFoundException("Dog not found")
        assert exc.message == "Dog not found"
        assert isinstance(exc, DomainException)

    def test_bad_request(self):
        exc = BadRequestException("Invalid input")
        assert exc.message == "Invalid input"
        assert isinstance(exc, DomainException)

    def test_unauthorized(self):
        exc = UnauthorizedException("No token")
        assert exc.message == "No token"
        assert isinstance(exc, DomainException)

    def test_forbidden(self):
        exc = ForbiddenException("Not a member")
        assert exc.message == "Not a member"
        assert isinstance(exc, DomainException)

    def test_inheritance(self):
        """모든 도메인 예외가 DomainException 상속"""
        assert issubclass(NotFoundException, DomainException)
        assert issubclass(BadRequestException, DomainException)
        assert issubclass(UnauthorizedException, DomainException)
        assert issubclass(ForbiddenException, DomainException)


class TestExceptionHandler:
    def test_handler_mapping(self):
        """domain_exception_handler 매핑 테스트 (sync 호출)"""
        from app.core.exceptions import domain_exception_handler
        import asyncio

        async def run():
            from fastapi import Request
            from starlette.testclient import TestClient

            # NotFoundException → 404
            exc = NotFoundException("test")
            mock_request = MagicMock(spec=Request)
            response = await domain_exception_handler(mock_request, exc)
            assert response.status_code == 404

            # ForbiddenException → 403
            exc2 = ForbiddenException("test")
            response2 = await domain_exception_handler(mock_request, exc2)
            assert response2.status_code == 403

        asyncio.run(run())


class TestSecurityEndpoints:
    PUBLIC_OPTIONAL_AUTH_ENDPOINTS = {
        ("get", "/api/v1/report/share/{token}"),
        ("post", "/api/v1/report/share/verify-parent-phone"),
        ("post", "/api/v1/report/interactions"),
    }

    @pytest.mark.parametrize(
        "method,path",
        [
            ("get", "/api/v1/dogs/"),
            ("get", "/api/v1/settings/"),
            ("get", "/api/v1/subscription/"),
            ("post", "/api/v1/coaching/generation-jobs"),
            ("get", "/api/v1/org/33333333-3333-3333-3333-333333333333"),
            ("get", "/api/v1/report/org/33333333-3333-3333-3333-333333333333"),
        ],
    )
    def test_protected_endpoints_require_bearer_token(self, method, path):
        """인증 없이 보호 API 호출 시 DB/service 진입 전에 401"""
        from fastapi.testclient import TestClient
        from app.main import app

        app.dependency_overrides.clear()
        with TestClient(app) as c:
            response = c.request(method.upper(), path, json={})
            assert response.status_code == 401
            assert response.json()["detail"] == "Not authenticated"

    def test_invalid_bearer_token_returns_401(self):
        """잘못된 JWT는 Supabase Auth 검증 실패로 401"""
        from fastapi.testclient import TestClient
        from app.core import security
        from app.main import app

        class BrokenAuth:
            def get_user(self, token):
                raise RuntimeError("invalid jwt")

        app.dependency_overrides.clear()
        original_supabase = security.supabase
        security.supabase = type("BrokenSupabase", (), {"auth": BrokenAuth()})()
        try:
            with TestClient(app) as c:
                response = c.get(
                    "/api/v1/dogs/",
                    headers={"Authorization": "Bearer forged.jwt.signature"},
                )
                assert response.status_code == 401
                assert response.json()["detail"] == "Could not validate credentials"
        finally:
            security.supabase = original_supabase

    def test_auth_failure_logs_do_not_expose_token_material(self, caplog):
        """AUTH-001/PII: Supabase Auth 예외 메시지에 토큰이 섞여도 로그에는 남기지 않는다."""
        import asyncio
        from fastapi import HTTPException
        from app.core import security

        token = "eyJhbGciOiJ.secret.payload"

        class LeakyAuth:
            def get_user(self, received_token):
                raise RuntimeError(f"invalid Authorization: Bearer {received_token}")

        async def run():
            with pytest.raises(HTTPException):
                await security.get_current_user_id(token)
            with pytest.raises(HTTPException):
                await security.get_current_user_id_optional(token)

        original_supabase = security.supabase
        security.supabase = type("LeakySupabase", (), {"auth": LeakyAuth()})()
        try:
            with caplog.at_level(logging.WARNING, logger="app.core.security"):
                asyncio.run(run())
        finally:
            security.supabase = original_supabase

        log_text = caplog.text
        assert token not in log_text
        assert "Bearer" not in log_text
        assert "RuntimeError" in log_text

    def test_request_middleware_logs_redacted_exception_text(self, caplog):
        """AUTH-001/PII: unexpected backend exceptions must not print token-bearing messages."""
        import asyncio
        from app.main import log_requests

        class FakeUrl:
            path = "/api/v1/dogs/"

        class FakeRequest:
            method = "GET"
            url = FakeUrl()

        async def call_next(_request):
            raise RuntimeError(
                "upstream failed authorization_code=secret-code "
                "accessToken=secret-access serviceRoleKey=secret-service-role "
                "Bearer eyJhbGciOiJ.secret.payload parent@example.com 01012345678"
            )

        async def run():
            with pytest.raises(RuntimeError):
                await log_requests(FakeRequest(), call_next)

        with caplog.at_level(logging.ERROR, logger="taillogtoss"):
            asyncio.run(run())

        log_text = caplog.text
        assert "secret-code" not in log_text
        assert "secret-access" not in log_text
        assert "secret-service-role" not in log_text
        assert "eyJhbGciOiJ.secret.payload" not in log_text
        assert "parent@example.com" not in log_text
        assert "01012345678" not in log_text
        assert "[REDACTED]" in log_text

    @pytest.mark.parametrize(
        "method,path,payload",
        [
            ("get", "/api/v1/report/share/share-token?last4=1234", None),
            (
                "post",
                "/api/v1/report/share/verify-parent-phone",
                {"share_token": "share-token", "last4": "1234"},
            ),
            (
                "post",
                "/api/v1/report/interactions",
                {
                    "report_id": str(uuid4()),
                    "share_token": "share-token",
                    "last4": "1234",
                    "interaction_type": "like",
                },
            ),
        ],
    )
    def test_optional_auth_public_routes_reject_invalid_bearer_token(self, method, path, payload):
        """AUTH-001: public secondary-guard routes allow no token, but reject forged JWTs."""
        from fastapi.testclient import TestClient
        from app.core import security
        from app.main import app

        class BrokenAuth:
            def get_user(self, token):
                raise RuntimeError("invalid jwt")

        app.dependency_overrides.clear()
        original_supabase = security.supabase
        security.supabase = type("BrokenSupabase", (), {"auth": BrokenAuth()})()
        try:
            with TestClient(app) as c:
                response = c.request(
                    method.upper(),
                    path,
                    json=payload,
                    headers={"Authorization": "Bearer forged.jwt.signature"},
                )
                assert response.status_code == 401
                assert response.json()["detail"] == "Could not validate credentials"
        finally:
            security.supabase = original_supabase

    def test_api_v1_routes_are_protected_or_explicitly_public(self):
        """AUTH-001: 신규 Backend API는 인증/관리자키/명시적 public 예외 중 하나여야 한다."""
        from app.main import app

        openapi = app.openapi()
        unclassified = []

        for path, operations in openapi["paths"].items():
            if not path.startswith("/api/v1/"):
                continue

            for method, operation in operations.items():
                if method not in {"get", "post", "put", "patch", "delete"}:
                    continue

                route_key = (method, path)
                if route_key in self.PUBLIC_OPTIONAL_AUTH_ENDPOINTS:
                    continue

                security = operation.get("security") or []
                has_oauth = any("OAuth2PasswordBearer" in requirement for requirement in security)
                has_admin_key = any(
                    parameter.get("name") == "x-admin-key"
                    for parameter in operation.get("parameters", [])
                )

                if not (has_oauth or has_admin_key):
                    unclassified.append(f"{method.upper()} {path}")

        assert unclassified == []

    def test_public_optional_auth_report_routes_have_secondary_guards(self):
        """B2B-001/AUTH-001: 비인증 보호자 경로는 공유토큰+last4 검증 경계를 유지한다."""
        from app.main import app

        openapi = app.openapi()

        share_lookup = openapi["paths"]["/api/v1/report/share/{token}"]["get"]
        last4_param = next(
            parameter
            for parameter in share_lookup["parameters"]
            if parameter["name"] == "last4"
        )
        assert last4_param["required"] is True
        assert last4_param["schema"]["pattern"] == r"^\d{4}$"

        phone_verify = openapi["paths"]["/api/v1/report/share/verify-parent-phone"]["post"]
        phone_schema_ref = phone_verify["requestBody"]["content"]["application/json"]["schema"]["$ref"]
        assert phone_schema_ref.endswith("/VerifyParentPhoneLast4Request")

        interaction = openapi["paths"]["/api/v1/report/interactions"]["post"]
        interaction_schema_ref = interaction["requestBody"]["content"]["application/json"]["schema"]["$ref"]
        assert interaction_schema_ref.endswith("/CreateInteractionRequest")

    def test_public_share_report_response_omits_internal_fields(self):
        """B2B-001/PII: public parent links must not expose org IDs, share tokens, or AI cost metadata."""
        from app.main import app

        openapi = app.openapi()
        share_lookup = openapi["paths"]["/api/v1/report/share/{token}"]["get"]
        response_ref = share_lookup["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
        assert response_ref.endswith("/PublicDailyReportResponse")

        public_schema = openapi["components"]["schemas"]["PublicDailyReportResponse"]
        public_fields = set(public_schema["properties"])
        internal_fields = {
            "created_by_org_id",
            "created_by_trainer_id",
            "ai_model",
            "ai_cost_usd",
            "generated_at",
            "scheduled_send_at",
            "share_token",
            "toss_share_url",
        }
        assert public_fields.isdisjoint(internal_fields)
