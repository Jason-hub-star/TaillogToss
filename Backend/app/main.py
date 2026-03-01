"""
TaillogToss API 엔트리포인트 — FastAPI 앱 초기화, 미들웨어, 라우터 등록
DogCoach main.py 마이그레이션. FE src/lib/api/ 도메인별 1:1 라우터 매핑.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import DomainException, domain_exception_handler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("taillogtoss")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Global Exception Handler
app.add_exception_handler(DomainException, domain_exception_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """422 에러 시 요청 body와 검증 실패 상세를 로깅"""
    body = await request.body()
    logger.warning(
        "422 Validation Error on %s %s\n  body: %s\n  errors: %s",
        request.method, request.url.path,
        body.decode("utf-8", errors="replace")[:500],
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("→ %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        logger.info("← %s %s", response.status_code, request.url.path)
        return response
    except Exception as e:
        logger.error("✗ %s %s: %s", request.method, request.url.path, e)
        raise


# CORS
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ──────────────────────────────────────
# Feature Routers (FE src/lib/api/ 1:1 매핑)
# ──────────────────────────────────────
# auth.ts     → /api/v1/auth
# dog.ts      → /api/v1/dogs
# log.ts      → /api/v1/logs
# coaching.ts → /api/v1/coaching
# training.ts → /api/v1/training
# settings.ts → /api/v1/settings
# subscription.ts → /api/v1/subscription
# notification.ts → /api/v1/notification
# org.ts      → /api/v1/org
# report.ts   → /api/v1/report
# onboarding  → /api/v1/onboarding
# dashboard   → /api/v1/dashboard
# ──────────────────────────────────────

from app.features.auth.router import router as auth_router
from app.features.onboarding.router import router as onboarding_router
from app.features.dogs.router import router as dogs_router
from app.features.log.router import router as log_router
from app.features.dashboard.router import router as dashboard_router
from app.features.coaching.router import router as coaching_router
from app.features.training.router import router as training_router
from app.features.settings.router import router as settings_router
from app.features.subscription.router import router as subscription_router
from app.features.notification.router import router as notification_router
from app.features.org.router import router as org_router
from app.features.report.router import router as report_router

prefix = settings.API_V1_STR

app.include_router(auth_router, prefix=f"{prefix}/auth", tags=["auth"])
app.include_router(onboarding_router, prefix=f"{prefix}/onboarding", tags=["onboarding"])
app.include_router(dogs_router, prefix=f"{prefix}/dogs", tags=["dogs"])
app.include_router(log_router, prefix=f"{prefix}/logs", tags=["logs"])
app.include_router(dashboard_router, prefix=f"{prefix}/dashboard", tags=["dashboard"])
app.include_router(coaching_router, prefix=f"{prefix}/coaching", tags=["coaching"])
app.include_router(training_router, prefix=f"{prefix}/training", tags=["training"])
app.include_router(settings_router, prefix=f"{prefix}/settings", tags=["settings"])
app.include_router(subscription_router, prefix=f"{prefix}/subscription", tags=["subscription"])
app.include_router(notification_router, prefix=f"{prefix}/notification", tags=["notification"])
app.include_router(org_router, prefix=f"{prefix}/org", tags=["org"])
app.include_router(report_router, prefix=f"{prefix}/report", tags=["report"])


@app.get("/")
def root():
    return {"message": "TaillogToss API"}


@app.get("/health")
def health():
    return {"status": "ok"}
