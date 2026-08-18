"""
B2B 조직 라우터 — 14개 엔드포인트
FE api/org.ts 매핑: getOrg, getOrgMembers, getOrgDogs, getActiveOrgDogCount,
  getActiveOrgMemberCount, enrollDog, dischargeDog, inviteMember, assignDog,
  getOrgAssignments, getMyAssignments, getOrgTodayStats, updateOrg
Parity: B2B-001
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.features.org import schemas, service

router = APIRouter()


# ──────────────────────────────────────
# 조직 조회/수정
# ──────────────────────────────────────

@router.get("/mine", response_model=Optional[schemas.MyOrgResponse])
async def get_my_org(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """현재 유저의 조직 + 멤버십 조회"""
    return await service.get_my_org(db, user_id)


@router.get("/{org_id}", response_model=schemas.OrgResponse)
async def get_org(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """조직 상세 조회"""
    await service.verify_org_membership(db, org_id, user_id)
    return await service.get_org(db, org_id)


@router.get("/{org_id}/subscription", response_model=Optional[schemas.OrgSubscriptionResponse])
async def get_org_subscription(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """조직 B2B 구독 상태 조회 (JWT 조직 멤버십 검증)."""
    return await service.get_current_org_subscription(db, org_id, user_id)


@router.get("/subscription/trainer/mine", response_model=Optional[schemas.OrgSubscriptionResponse])
async def get_my_trainer_subscription(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """훈련사 개인 B2B 구독 상태 조회 (JWT 본인 기준)."""
    return await service.get_current_trainer_subscription(db, user_id)


@router.patch("/{org_id}", response_model=schemas.OrgResponse)
async def update_org(
    org_id: UUID,
    updates: schemas.UpdateOrgRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """조직 설정 업데이트"""
    return await service.update_org(db, user_id, org_id, updates)


# ──────────────────────────────────────
# 멤버
# ──────────────────────────────────────

@router.get("/{org_id}/members", response_model=List[schemas.OrgMemberResponse])
async def get_org_members(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """조직 멤버 목록"""
    await service.verify_org_membership(db, org_id, user_id)
    return await service.get_org_members(db, org_id)


@router.get("/{org_id}/members/count")
async def get_active_member_count(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """활성 멤버 수"""
    await service.verify_org_membership(db, org_id, user_id)
    count = await service.get_active_org_member_count(db, org_id)
    return {"count": count}


@router.post("/members/invite", response_model=schemas.OrgMemberResponse,
             status_code=status.HTTP_201_CREATED)
async def invite_member(
    data: schemas.InviteMemberRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """멤버 초대"""
    return await service.invite_member(db, user_id, data)


# ──────────────────────────────────────
# 강아지
# ──────────────────────────────────────

@router.get("/{org_id}/dogs", response_model=List[schemas.OrgDogWithStatus])
async def get_org_dogs(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """조직 소속 강아지 목록 (today 상태 포함)"""
    await service.verify_org_membership(db, org_id, user_id)
    return await service.get_org_dogs_with_status(db, org_id)


@router.get("/{org_id}/dogs/count")
async def get_active_dog_count(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """활성 강아지 수"""
    await service.verify_org_membership(db, org_id, user_id)
    count = await service.get_active_org_dog_count(db, org_id)
    return {"count": count}


@router.post("/dogs/enroll", response_model=schemas.OrgDogResponse,
             status_code=status.HTTP_201_CREATED)
async def enroll_dog(
    data: schemas.EnrollDogRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """강아지 등록 (센터 입소) + PII 저장"""
    return await service.enroll_dog(db, user_id, data)


@router.post("/dogs/create", response_model=schemas.OrgDogResponse,
             status_code=status.HTTP_201_CREATED)
async def create_org_dog(
    data: schemas.CreateOrgDogRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """센터 강아지 생성 + 입소 + PII 저장"""
    return await service.create_org_dog(db, user_id, data)


@router.patch("/dogs/{org_dog_id}/discharge")
async def discharge_dog(
    org_dog_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """강아지 퇴소"""
    await service.discharge_dog(db, user_id, org_dog_id)
    return {"success": True}


# ──────────────────────────────────────
# 담당자 배정
# ──────────────────────────────────────

@router.post("/assignments", response_model=schemas.DogAssignmentResponse,
             status_code=status.HTTP_201_CREATED)
async def assign_dog(
    data: schemas.AssignDogRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """담당자 배정"""
    return await service.assign_dog(db, user_id, data)


@router.patch("/assignments/unassign")
async def unassign_dog(
    data: schemas.UnassignDogRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """담당자 배정 해제"""
    await service.unassign_dog(db, user_id, data)
    return {"success": True}


@router.get("/{org_id}/assignments", response_model=List[schemas.DogAssignmentResponse])
async def get_org_assignments(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """담당자 배정 목록 (조직 기준)"""
    await service.verify_org_membership(db, org_id, user_id)
    return await service.get_org_assignments(db, org_id)


@router.get("/assignments/mine", response_model=List[schemas.DogAssignmentResponse])
async def get_my_assignments(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """내 담당 강아지 목록 (훈련사 기준)"""
    return await service.get_my_assignments(db, user_id)


# ──────────────────────────────────────
# 통계
# ──────────────────────────────────────

@router.get("/{org_id}/stats/today", response_model=Optional[schemas.OrgAnalyticsDailyResponse])
async def get_org_today_stats(
    org_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """조직 오늘 통계"""
    await service.verify_org_membership(db, org_id, user_id)
    return await service.get_org_today_stats(db, org_id)
