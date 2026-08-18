"""행동 분석 라우터 — GET /api/v1/dogs/{dog_id}/behavior-analytics, /step-attempts"""
import logging
from time import perf_counter
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.shared.utils.ownership import verify_dog_ownership

from . import schemas, service

router = APIRouter()
logger = logging.getLogger("taillogtoss.analytics")

_SERVER_TIMING_ORDER = (
    "ownership_ms",
    "dog_lookup_ms",
    "b2c_check_ms",
    "assignment_lookup_ms",
    "org_dog_lookup_ms",
    "aggregate_ms",
    "compute_ms",
    "peak_ms",
    "memo_ms",
    "keywords_ms",
    "serialize_ms",
    "total_ms",
)


def _format_server_timing(timings: dict[str, float]) -> str:
    names = [name for name in _SERVER_TIMING_ORDER if name in timings]
    names.extend(name for name in timings if name not in _SERVER_TIMING_ORDER)
    return ", ".join(
        f"{name.removesuffix('_ms')};dur={timings[name]:.1f}" for name in names
    )


def _format_debug_timing(timings: dict[str, float]) -> str:
    names = [name for name in _SERVER_TIMING_ORDER if name in timings]
    names.extend(name for name in timings if name not in _SERVER_TIMING_ORDER)
    return ",".join(f"{name}={timings[name]:.1f}" for name in names)


def _format_debug_details(timings: dict[str, float], meta: dict[str, str]) -> str:
    timing_text = _format_debug_timing(timings)
    meta_text = ",".join(f"{key}={value}" for key, value in meta.items())
    if timing_text and meta_text:
        return f"{timing_text},{meta_text}"
    return timing_text or meta_text


@router.get("/{dog_id}/behavior-analytics", response_model=schemas.BehaviorAnalyticsResponse)
async def get_behavior_analytics(
    dog_id: UUID,
    response: Response,
    days: int = Query(default=30, ge=7, le=90),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """강아지 행동 패턴 분석 — behavior_logs 직접 집계"""
    route_started_at = perf_counter()
    timings: dict[str, float] = {}
    timing_meta: dict[str, str] = {}

    started_at = perf_counter()
    await verify_dog_ownership(
        db,
        dog_id,
        user_id=user_id,
        timings=timings,
        timing_meta=timing_meta,
    )
    timings["ownership_ms"] = (perf_counter() - started_at) * 1000

    result = await service.get_behavior_analytics(db, dog_id, days, timings=timings)
    timings["total_ms"] = (perf_counter() - route_started_at) * 1000

    server_timing = _format_server_timing(timings)
    debug_timing = _format_debug_details(timings, timing_meta)
    response.headers["Server-Timing"] = server_timing
    response.headers["X-Taillog-Server-Timing"] = debug_timing

    logger.info(
        "[PERF][backend] behavior_analytics dogRef=%s days=%s totalLogs=%s %s",
        str(dog_id)[-8:],
        days,
        result.total_logs,
        debug_timing,
    )
    return result


@router.get("/{dog_id}/step-attempts", response_model=List[schemas.StepAttemptResponse])
async def get_step_attempts(
    dog_id: UUID,
    step_id: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """시행착오 기록 조회 — training_step_attempts"""
    await verify_dog_ownership(db, dog_id, user_id=user_id)
    return await service.get_step_attempts(db, dog_id, step_id=step_id, limit=limit)


@router.post("/{dog_id}/step-attempts", response_model=schemas.StepAttemptResponse)
async def create_step_attempt(
    dog_id: UUID,
    data: schemas.StepAttemptCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """시행착오 기록 저장 — JWT 소유권 검증 후 training_step_attempts insert."""
    await verify_dog_ownership(db, dog_id, user_id=user_id)
    return await service.create_step_attempt(db, dog_id, data, recorded_by=user_id)
