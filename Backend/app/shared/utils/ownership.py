"""
강아지 소유권 검증 — B2C 소유자 + B2B 조직 배정자 확인
DogCoach ownership.py 마이그레이션 + B2B 확장
"""
from time import perf_counter
from typing import Dict, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.models import Dog, DogAssignment, OrgDog


def _record_timing(timings: Optional[Dict[str, float]], key: str, started_at: float) -> None:
    if timings is not None:
        timings[key] = (perf_counter() - started_at) * 1000


async def verify_dog_ownership(
    db: AsyncSession,
    dog_id: UUID,
    user_id: Optional[str] = None,
    timings: Optional[Dict[str, float]] = None,
    timing_meta: Optional[Dict[str, str]] = None,
) -> Dog:
    """
    강아지 소유권 확인. 소유자이거나 B2B 배정자이면 Dog 반환.
    404: 강아지 없음, 403: 접근 거부
    """
    stmt = select(Dog).where(Dog.id == dog_id)
    started_at = perf_counter()
    result = await db.execute(stmt)
    dog = result.scalar_one_or_none()
    _record_timing(timings, "dog_lookup_ms", started_at)

    if not dog:
        if timing_meta is not None:
            timing_meta["ownership_path"] = "not_found"
            timing_meta["b2c_match"] = "false"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dog not found",
        )

    # B2C 소유자 확인
    started_at = perf_counter()
    b2c_match = bool(user_id and dog.user_id and str(dog.user_id) == user_id)
    _record_timing(timings, "b2c_check_ms", started_at)
    if timing_meta is not None:
        timing_meta["b2c_match"] = "true" if b2c_match else "false"
    if b2c_match:
        if timing_meta is not None:
            timing_meta["ownership_path"] = "b2c_owner"
        return dog

    # B2B 배정자 확인 (dog_assignments 테이블)
    if user_id:
        assignment_stmt = (
            select(DogAssignment)
            .where(
                DogAssignment.dog_id == dog_id,
                DogAssignment.trainer_user_id == UUID(user_id),
                DogAssignment.status == "active",
            )
        )
        started_at = perf_counter()
        assignment_result = await db.execute(assignment_stmt)
        _record_timing(timings, "assignment_lookup_ms", started_at)
        assignment = assignment_result.scalar_one_or_none()
        if assignment:
            if assignment.org_id:
                active_org_dog_stmt = (
                    select(OrgDog)
                    .where(
                        OrgDog.org_id == assignment.org_id,
                        OrgDog.dog_id == dog_id,
                        OrgDog.status == "active",
                    )
                    .limit(1)
                )
                started_at = perf_counter()
                active_org_dog_result = await db.execute(active_org_dog_stmt)
                _record_timing(timings, "assignment_org_dog_lookup_ms", started_at)
                if not active_org_dog_result.scalar_one_or_none():
                    if timing_meta is not None:
                        timing_meta["assignment_active_org_dog"] = "false"
                else:
                    if timing_meta is not None:
                        timing_meta["assignment_active_org_dog"] = "true"
                        timing_meta["ownership_path"] = "b2b_assignment"
                    return dog
            else:
                if timing_meta is not None:
                    timing_meta["assignment_active_org_dog"] = "personal"
                    timing_meta["ownership_path"] = "b2b_assignment"
                return dog

        # B2B 조직 소속 강아지 + 조직 멤버 확인
        org_dog_stmt = (
            select(OrgDog)
            .where(OrgDog.dog_id == dog_id, OrgDog.status == "active")
        )
        started_at = perf_counter()
        org_dog_result = await db.execute(org_dog_stmt)
        _record_timing(timings, "org_dog_lookup_ms", started_at)
        org_dog = org_dog_result.scalar_one_or_none()
        if org_dog and org_dog.parent_user_id and str(org_dog.parent_user_id) == user_id:
            if timing_meta is not None:
                timing_meta["ownership_path"] = "b2b_parent"
            return dog

    if timing_meta is not None:
        timing_meta["ownership_path"] = "denied"
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: you do not own this dog",
    )
