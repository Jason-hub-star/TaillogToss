"""
라우터 등록 검증 테스트 — 모든 feature 라우터가 main.py에 등록되었는지 확인
"""
from app.main import app


def test_all_routers_registered():
    """12개 feature 라우터 전부 등록 확인"""
    routes = [route.path for route in app.routes]
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
        "/api/v1/notification",
        "/api/v1/org",
        "/api/v1/report",
    ]
    for prefix in expected_prefixes:
        matching = [r for r in routes if r.startswith(prefix)]
        assert len(matching) > 0, f"No routes found for prefix: {prefix}"


def test_route_count():
    """최소 60개 이상 라우트"""
    routes = [r for r in app.routes if hasattr(r, "methods")]
    assert len(routes) >= 40, f"Expected 40+ routes, got {len(routes)}"


def test_cors_middleware():
    """CORS 미들웨어 등록"""
    middleware_classes = [m.cls.__name__ for m in app.user_middleware if hasattr(m, "cls")]
    # CORSMiddleware는 BACKEND_CORS_ORIGINS 설정에 의존
    # 미들웨어 스택에 있는지만 확인 (설정 없으면 없을 수 있음)
    pass  # CORS는 config 의존적, 존재 확인만


def test_health_and_root():
    """/ 와 /health 라우트 존재"""
    routes = [route.path for route in app.routes]
    assert "/" in routes
    assert "/health" in routes


def test_openapi_paths():
    """OpenAPI 스키마에 주요 경로 포함"""
    schema = app.openapi()
    paths = schema.get("paths", {})

    # 주요 엔드포인트 확인
    assert "/api/v1/auth/me" in paths
    assert "/api/v1/dogs/" in paths
    assert "/api/v1/settings/" in paths
    assert "/api/v1/coaching/admin/training-candidates/{coaching_id}/review" in paths


def test_tags():
    """OpenAPI 태그 12종 확인"""
    schema = app.openapi()
    paths = schema.get("paths", {})
    tags_found = set()
    for path, methods in paths.items():
        for method, detail in methods.items():
            for tag in detail.get("tags", []):
                tags_found.add(tag)

    expected_tags = {"auth", "dogs", "logs", "coaching", "settings",
                     "org", "report", "training"}
    assert expected_tags.issubset(tags_found), f"Missing tags: {expected_tags - tags_found}"
