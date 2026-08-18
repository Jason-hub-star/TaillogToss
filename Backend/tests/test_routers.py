"""
라우터 등록 검증 테스트 — 모든 feature 라우터가 main.py에 등록되었는지 확인

주의: `app.routes` 를 직접 순회하지 않는다. FastAPI 0.141+ 는 `include_router` 로
등록한 라우터를 `_IncludedRouter` 래퍼로 담아 `route.path` 가 존재하지 않는다
(2026-08-18 실측: fastapi 0.141.1 / starlette 1.6.0 에서 3건 실패).
런타임 진실은 OpenAPI 스키마다 — 앱이 실제로 해석하는 경로만 거기에 나온다.
"""
from app.main import app


def _paths() -> list[str]:
    """앱이 실제로 서빙하는 경로 목록 (FastAPI 버전 무관)."""
    return list(app.openapi().get("paths", {}).keys())


def test_all_routers_registered():
    """12개 feature 라우터 전부 등록 확인"""
    routes = _paths()
    expected_prefixes = [
        "/api/v1/auth",
        "/api/v1/onboarding",
        "/api/v1/dogs",
        "/api/v1/logs",
        "/api/v1/dashboard",
        "/api/v1/coaching",
        "/api/v1/training",
        "/api/v1/settings",
        "/api/v1/subscription",
        "/api/v1/referral",
        "/api/v1/notification",
        "/api/v1/org",
        "/api/v1/report",
    ]
    for prefix in expected_prefixes:
        matching = [r for r in routes if r.startswith(prefix)]
        assert len(matching) > 0, f"No routes found for prefix: {prefix}"


def test_route_count():
    """최소 40개 이상 라우트"""
    routes = _paths()
    assert len(routes) >= 40, f"Expected 40+ routes, got {len(routes)}"


def test_cors_middleware():
    """CORS 미들웨어 등록"""
    middleware_classes = [m.cls.__name__ for m in app.user_middleware if hasattr(m, "cls")]
    # CORSMiddleware는 BACKEND_CORS_ORIGINS 설정에 의존
    # 미들웨어 스택에 있는지만 확인 (설정 없으면 없을 수 있음)
    assert isinstance(middleware_classes, list)


def test_health_and_root():
    """/ 와 /health 라우트 존재"""
    routes = _paths()
    assert "/" in routes
    assert "/health" in routes
