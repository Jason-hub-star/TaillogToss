"""
B2B 조직 서비스 — 조직/멤버/강아지/배정 CRUD + today 상태 집계
FE api/org.ts 매핑: getOrg, getOrgMembers, getOrgDogs, enrollDog, dischargeDog,
  inviteMember, assignDog, getOrgAssignments, getMyAssignments, getOrgTodayStats, updateOrg
Parity: B2B-001
"""
from base64 import b64encode
from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from app.features.org import schemas
from app.shared.models import (
    BehaviorLog,
    DailyReport,
    Dog,
    DogAssignment,
    OrgAnalyticsDaily,
    OrgDog,
    OrgDogPii,
    OrgMember,
    OrgSubscription,
    Organization,
)
from app.shared.utils.ownership import verify_dog_ownership


# ──────────────────────────────────────
# 조직 멤버십 검증 유틸
# ──────────────────────────────────────

async def verify_org_membership(
    db: AsyncSession, org_id: UUID, user_id: str,
) -> OrgMember:
    """조직 멤버 확인 (active only). 없으면 ForbiddenException."""
    stmt = (
        select(OrgMember)
        .where(
            OrgMember.org_id == org_id,
            OrgMember.user_id == UUID(user_id),
            OrgMember.status == "active",
        )
    )
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    member_status = None
    if member:
        member_status = member.status.value if hasattr(member.status, "value") else str(member.status)
    if not member or member_status != "active":
        raise ForbiddenException("Not a member of this organization")
    return member


async def verify_org_manager_role(
    db: AsyncSession, org_id: UUID, user_id: str,
) -> OrgMember:
    """조직 관리 권한 확인 (owner/manager only)."""
    member = await verify_org_membership(db, org_id, user_id)
    member_role = member.role.value if hasattr(member.role, "value") else str(member.role)
    if member_role not in ("owner", "manager"):
        raise ForbiddenException("Only owner or manager can manage organization")
    return member


def _org_member_role_value(member: OrgMember) -> str:
    return member.role.value if hasattr(member.role, "value") else str(member.role)


def _ensure_member_invite_role_allowed(actor: OrgMember, invited_role: str) -> None:
    """B2B-001: managers can invite operators, but only owners can grant management roles."""
    actor_role = _org_member_role_value(actor)
    if invited_role not in ("owner", "manager", "staff", "viewer"):
        raise BadRequestException("Invalid organization member role")
    if invited_role in ("owner", "manager") and actor_role != "owner":
        raise ForbiddenException("Only owner can invite owner or manager roles")


# ──────────────────────────────────────
# 조직 조회/수정
# ──────────────────────────────────────

async def get_org(db: AsyncSession, org_id: UUID) -> schemas.OrgResponse:
    """조직 상세 조회"""
    stmt = select(Organization).where(Organization.id == org_id)
    result = await db.execute(stmt)
    org = result.scalar_one_or_none()
    if not org:
        raise NotFoundException("Organization not found")
    return schemas.OrgResponse.model_validate(org)


async def get_current_org_subscription(
    db: AsyncSession,
    org_id: UUID,
    user_id: str,
) -> Optional[schemas.OrgSubscriptionResponse]:
    """현재 조직 멤버에게만 활성/체험 B2B 구독 상태를 반환."""
    await verify_org_membership(db, org_id, user_id)
    stmt = (
        select(OrgSubscription)
        .where(
            OrgSubscription.org_id == org_id,
            OrgSubscription.status.in_(["active", "trial"]),
        )
        .order_by(OrgSubscription.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    subscription = result.scalar_one_or_none()
    return schemas.OrgSubscriptionResponse.model_validate(subscription) if subscription else None


async def get_current_trainer_subscription(
    db: AsyncSession,
    user_id: str,
) -> Optional[schemas.OrgSubscriptionResponse]:
    """훈련사 개인 구독은 JWT 본인 기준으로만 조회."""
    stmt = (
        select(OrgSubscription)
        .where(
            OrgSubscription.trainer_user_id == UUID(user_id),
            OrgSubscription.status.in_(["active", "trial"]),
        )
        .order_by(OrgSubscription.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    subscription = result.scalar_one_or_none()
    return schemas.OrgSubscriptionResponse.model_validate(subscription) if subscription else None


async def get_my_org(db: AsyncSession, user_id: str) -> Optional[schemas.MyOrgResponse]:
    """현재 사용자 기준 활성 조직 + 멤버십 조회."""
    member_stmt = (
        select(OrgMember)
        .where(
            OrgMember.user_id == UUID(user_id),
            OrgMember.status == "active",
        )
        .order_by(OrgMember.invited_at)
        .limit(1)
    )
    member_result = await db.execute(member_stmt)
    member = member_result.scalar_one_or_none()
    if not member:
        return None

    org_stmt = select(Organization).where(Organization.id == member.org_id)
    org_result = await db.execute(org_stmt)
    org = org_result.scalar_one_or_none()
    if not org:
        raise NotFoundException("Organization not found")

    return schemas.MyOrgResponse(
        org=schemas.OrgResponse.model_validate(org),
        membership=schemas.OrgMemberResponse.model_validate(member),
    )


async def update_org(
    db: AsyncSession, user_id: str, org_id: UUID, updates: schemas.UpdateOrgRequest,
) -> schemas.OrgResponse:
    """조직 설정 업데이트 (owner/manager만)"""
    await verify_org_manager_role(db, org_id, user_id)

    stmt = select(Organization).where(Organization.id == org_id)
    result = await db.execute(stmt)
    org = result.scalar_one_or_none()
    if not org:
        raise NotFoundException("Organization not found")

    if updates.name is not None:
        org.name = updates.name
    if updates.phone is not None:
        org.phone = updates.phone
    if updates.address is not None:
        org.address = updates.address
    if updates.logo_url is not None:
        org.logo_url = updates.logo_url
    if updates.settings is not None:
        org.settings = updates.settings
    org.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(org)
    return schemas.OrgResponse.model_validate(org)


# ──────────────────────────────────────
# 멤버
# ──────────────────────────────────────

async def get_org_members(
    db: AsyncSession, org_id: UUID,
) -> List[schemas.OrgMemberResponse]:
    """조직 멤버 목록"""
    stmt = (
        select(OrgMember)
        .where(OrgMember.org_id == org_id)
        .order_by(OrgMember.invited_at)
    )
    result = await db.execute(stmt)
    members = result.scalars().all()
    return [schemas.OrgMemberResponse.model_validate(m) for m in members]


async def get_active_org_member_count(db: AsyncSession, org_id: UUID) -> int:
    """활성 멤버 수 (active + pending)"""
    stmt = (
        select(func.count(OrgMember.id))
        .where(
            OrgMember.org_id == org_id,
            OrgMember.status.in_(["active", "pending"]),
        )
    )
    result = await db.execute(stmt)
    return result.scalar() or 0


async def invite_member(
    db: AsyncSession, user_id: str, data: schemas.InviteMemberRequest,
) -> schemas.OrgMemberResponse:
    """멤버 초대"""
    org_id = UUID(data.org_id)
    actor = await verify_org_manager_role(db, org_id, user_id)
    _ensure_member_invite_role_allowed(actor, data.role)

    member = OrgMember(
        org_id=org_id,
        user_id=UUID(data.user_id),
        role=data.role,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return schemas.OrgMemberResponse.model_validate(member)


# ──────────────────────────────────────
# 강아지 등록/퇴소
# ──────────────────────────────────────

def _trim_optional(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _phone_digits(value: str | None) -> str:
    if not value:
        return ""
    return "".join(ch for ch in value if ch.isdigit())

async def get_org_dogs_with_status(
    db: AsyncSession, org_id: UUID,
) -> List[schemas.OrgDogWithStatus]:
    """조직 소속 강아지 + 오늘 상태 (FE getOrgDogs JOIN 미러)"""
    attention_keywords = ("구토", "설사", "절뚝", "공격", "격리", "무기력", "불안", "보호자 연락", "수의사")

    def get_attention_reason(intensity: int | None, quick_category: str | None, memo: str | None) -> str | None:
        normalized_memo = memo or ""
        if quick_category == "aggression":
            return "공격 행동"
        if intensity is not None and intensity >= 7:
            return f"강도 {intensity}"
        for keyword in attention_keywords:
            if keyword in normalized_memo:
                return keyword
        return None

    today = date.today()
    today_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc)

    # 1) org_dogs (active)
    stmt = (
        select(OrgDog)
        .where(OrgDog.org_id == org_id, OrgDog.status == "active")
        .order_by(OrgDog.enrolled_at)
    )
    result = await db.execute(stmt)
    org_dogs = result.scalars().all()
    if not org_dogs:
        return []

    dog_ids = [od.dog_id for od in org_dogs]

    # 2) dogs JOIN (이름, 품종)
    dog_stmt = select(Dog).where(Dog.id.in_(dog_ids))
    dog_result = await db.execute(dog_stmt)
    dogs_map = {d.id: d for d in dog_result.scalars().all()}

    # 3) 오늘 기록 집계 + 확인 필요 신호
    log_stmt = (
        select(
            BehaviorLog.dog_id,
            BehaviorLog.occurred_at,
            BehaviorLog.intensity,
            BehaviorLog.quick_category,
            BehaviorLog.memo,
        )
        .where(
            BehaviorLog.org_id == org_id,
            BehaviorLog.dog_id.in_(dog_ids),
            BehaviorLog.occurred_at >= today_start,
            BehaviorLog.occurred_at <= today_end,
        )
    )
    log_result = await db.execute(log_stmt)
    log_map: dict[UUID, dict[str, object]] = {}
    for row in log_result:
        info = log_map.setdefault(row.dog_id, {
            "count": 0,
            "last_time": None,
            "needs_attention": False,
            "attention_reason": None,
        })
        info["count"] = int(info["count"]) + 1
        if not info["last_time"] or row.occurred_at > info["last_time"]:
            info["last_time"] = row.occurred_at
        reason = get_attention_reason(row.intensity, row.quick_category, row.memo)
        if reason and not info["attention_reason"]:
            info["needs_attention"] = True
            info["attention_reason"] = reason

    # 4) 오늘 리포트 여부
    report_stmt = (
        select(DailyReport.dog_id)
        .where(
            DailyReport.created_by_org_id == org_id,
            DailyReport.report_date == today,
            DailyReport.dog_id.in_(dog_ids),
            DailyReport.generation_status == "sent",
        )
    )
    report_result = await db.execute(report_stmt)
    reported_ids = {row[0] for row in report_result}

    # 5) 담당자 배정
    assign_stmt = (
        select(DogAssignment.dog_id, DogAssignment.trainer_user_id)
        .where(
            DogAssignment.org_id == org_id,
            DogAssignment.status == "active",
            DogAssignment.dog_id.in_(dog_ids),
        )
    )
    assign_result = await db.execute(assign_stmt)
    trainer_map = {row.dog_id: str(row.trainer_user_id) for row in assign_result}

    # 6) 병합
    items = []
    for od in org_dogs:
        dog_info = dogs_map.get(od.dog_id)
        log_info = log_map.get(od.dog_id, {
            "count": 0,
            "last_time": None,
            "needs_attention": False,
            "attention_reason": None,
        })
        last_time = log_info["last_time"]
        items.append(schemas.OrgDogWithStatus(
            id=od.id,
            org_id=od.org_id,
            dog_id=od.dog_id,
            parent_user_id=od.parent_user_id,
            parent_name=od.parent_name,
            group_tag=od.group_tag or "default",
            enrolled_at=od.enrolled_at,
            discharged_at=od.discharged_at,
            status=str(od.status.value) if hasattr(od.status, "value") else str(od.status),
            dog_name=dog_info.name if dog_info else None,
            dog_breed=dog_info.breed if dog_info else None,
            today_log_count=log_info["count"],
            has_today_report=od.dog_id in reported_ids,
            last_log_time=str(last_time) if last_time else None,
            trainer_name=trainer_map.get(od.dog_id),
            needs_attention=bool(log_info["needs_attention"]),
            attention_reason=log_info["attention_reason"],
        ))
    return items


async def get_active_org_dog_count(db: AsyncSession, org_id: UUID) -> int:
    """활성 강아지 수"""
    stmt = (
        select(func.count(OrgDog.id))
        .where(OrgDog.org_id == org_id, OrgDog.status == "active")
    )
    result = await db.execute(stmt)
    return result.scalar() or 0


async def enroll_dog(
    db: AsyncSession, user_id: str, data: schemas.EnrollDogRequest,
) -> schemas.OrgDogResponse:
    """강아지 등록 (센터에 입소) + PII 별도 저장"""
    org_id = UUID(data.org_id)
    await verify_org_manager_role(db, org_id, user_id)
    await verify_dog_ownership(db, UUID(data.dog_id), user_id=user_id)

    org_dog = OrgDog(
        org_id=org_id,
        dog_id=UUID(data.dog_id),
        parent_user_id=UUID(data.parent_user_id) if data.parent_user_id else None,
        parent_name=data.parent_name,
        parent_phone_last4=data.parent_phone_last4,
        group_tag=data.group_tag,
    )
    db.add(org_dog)
    await db.flush()

    # PII 별도 테이블 (암호화된 상태로 수신)
    if data.parent_phone_enc or data.parent_email_enc:
        pii = OrgDogPii(
            org_dog_id=org_dog.id,
            parent_phone_enc=data.parent_phone_enc.encode() if data.parent_phone_enc else None,
            parent_email_enc=data.parent_email_enc.encode() if data.parent_email_enc else None,
            encryption_key_version=1,
        )
        db.add(pii)

    await db.commit()
    await db.refresh(org_dog)
    return schemas.OrgDogResponse.model_validate(org_dog)


async def create_org_dog(
    db: AsyncSession, user_id: str, data: schemas.CreateOrgDogRequest,
) -> schemas.OrgDogResponse:
    """센터 강아지 생성 + 입소 + PII 저장을 서버 권한 경계에서 원자 처리."""
    org_id = UUID(data.org_id)
    await verify_org_manager_role(db, org_id, user_id)

    dog_name = _trim_optional(data.dog_name)
    if not dog_name:
        raise BadRequestException("Dog name is required")

    phone_digits = _phone_digits(data.parent_phone)
    parent_phone_last4 = phone_digits[-4:] if len(phone_digits) >= 4 else None
    parent_phone_enc = b64encode(phone_digits.encode()).decode() if phone_digits else None

    dog = Dog(
        user_id=UUID(user_id),
        name=dog_name,
        breed=_trim_optional(data.dog_breed),
        sex=data.dog_sex,
        parent_address=_trim_optional(data.parent_address),
        vet_name=_trim_optional(data.vet_name),
        animal_reg_no=_trim_optional(data.animal_reg_no),
    )
    db.add(dog)
    await db.flush()

    org_dog = OrgDog(
        org_id=org_id,
        dog_id=dog.id,
        parent_name=_trim_optional(data.parent_name),
        parent_phone_last4=parent_phone_last4,
        group_tag=_trim_optional(data.group_tag) or "default",
    )
    db.add(org_dog)
    await db.flush()

    if parent_phone_enc or data.parent_email_enc:
        pii = OrgDogPii(
            org_dog_id=org_dog.id,
            parent_phone_enc=parent_phone_enc.encode() if parent_phone_enc else None,
            parent_email_enc=data.parent_email_enc.encode() if data.parent_email_enc else None,
            encryption_key_version=1,
        )
        db.add(pii)

    await db.commit()
    await db.refresh(org_dog)
    return schemas.OrgDogResponse.model_validate(org_dog)


async def discharge_dog(
    db: AsyncSession, user_id: str, org_dog_id: UUID,
) -> None:
    """강아지 퇴소"""
    stmt = select(OrgDog).where(OrgDog.id == org_dog_id)
    result = await db.execute(stmt)
    org_dog = result.scalar_one_or_none()
    if not org_dog:
        raise NotFoundException("OrgDog not found")

    await verify_org_manager_role(db, org_dog.org_id, user_id)

    org_dog.status = "discharged"
    org_dog.discharged_at = datetime.now(timezone.utc)
    await db.commit()


# ──────────────────────────────────────
# 담당자 배정
# ──────────────────────────────────────

async def assign_dog(
    db: AsyncSession, user_id: str, data: schemas.AssignDogRequest,
) -> schemas.DogAssignmentResponse:
    """담당자 배정"""
    org_id = UUID(data.org_id) if data.org_id else None
    dog_id = UUID(data.dog_id)
    trainer_user_id = UUID(data.trainer_user_id)
    if org_id:
        await verify_org_manager_role(db, org_id, user_id)
        org_dog_result = await db.execute(
            select(OrgDog).where(
                OrgDog.org_id == org_id,
                OrgDog.dog_id == dog_id,
                OrgDog.status == "active",
            )
        )
        if not org_dog_result.scalar_one_or_none():
            raise ForbiddenException("Dog is not active in this organization")

        trainer_result = await db.execute(
            select(OrgMember).where(
                OrgMember.org_id == org_id,
                OrgMember.user_id == trainer_user_id,
                OrgMember.status == "active",
                OrgMember.role.in_(["owner", "manager", "staff", "trainer"]),
            )
        )
        if not trainer_result.scalar_one_or_none():
            raise ForbiddenException("Trainer is not an active member of this organization")
    else:
        if trainer_user_id != UUID(user_id):
            raise ForbiddenException("Cannot create personal assignments for another trainer")
        await verify_dog_ownership(db, dog_id, user_id=user_id)

    assignment = DogAssignment(
        dog_id=dog_id,
        org_id=org_id,
        trainer_user_id=trainer_user_id,
        role=data.role,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return schemas.DogAssignmentResponse.model_validate(assignment)


async def unassign_dog(
    db: AsyncSession, user_id: str, data: schemas.UnassignDogRequest,
) -> None:
    """담당자 배정 해제. 조직 배정은 관리자 또는 본인 배정만 종료 가능."""
    org_id = UUID(data.org_id) if data.org_id else None
    dog_id = UUID(data.dog_id)
    trainer_user_id = UUID(data.trainer_user_id)

    if org_id:
        member = await verify_org_membership(db, org_id, user_id)
        member_role = member.role.value if hasattr(member.role, "value") else str(member.role)
        is_manager = member_role in ("owner", "manager")
        if not is_manager and trainer_user_id != UUID(user_id):
            raise ForbiddenException("Cannot unassign another trainer")

        org_dog_result = await db.execute(
            select(OrgDog).where(
                OrgDog.org_id == org_id,
                OrgDog.dog_id == dog_id,
                OrgDog.status == "active",
            )
        )
        if not org_dog_result.scalar_one_or_none():
            raise ForbiddenException("Dog is not active in this organization")
    else:
        if trainer_user_id != UUID(user_id):
            raise ForbiddenException("Cannot unassign another trainer")
        await verify_dog_ownership(db, dog_id, user_id=user_id)

    stmt = (
        select(DogAssignment)
        .where(
            DogAssignment.dog_id == dog_id,
            DogAssignment.trainer_user_id == trainer_user_id,
            DogAssignment.status == "active",
        )
        .limit(1)
    )
    stmt = stmt.where(DogAssignment.org_id == org_id) if org_id else stmt.where(DogAssignment.org_id.is_(None))
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise NotFoundException("Active assignment not found")

    assignment.status = "ended"
    assignment.ended_at = datetime.now(timezone.utc)
    await db.commit()


async def get_org_assignments(
    db: AsyncSession, org_id: UUID,
) -> List[schemas.DogAssignmentResponse]:
    """담당자 배정 목록 (조직 기준)"""
    stmt = (
        select(DogAssignment)
        .where(DogAssignment.org_id == org_id, DogAssignment.status == "active")
    )
    result = await db.execute(stmt)
    assignments = result.scalars().all()
    return [schemas.DogAssignmentResponse.model_validate(a) for a in assignments]


async def get_my_assignments(
    db: AsyncSession, trainer_id: str,
) -> List[schemas.DogAssignmentResponse]:
    """내 담당 강아지 목록 (훈련사 기준)"""
    stmt = (
        select(DogAssignment)
        .where(
            DogAssignment.trainer_user_id == UUID(trainer_id),
            DogAssignment.status == "active",
        )
    )
    result = await db.execute(stmt)
    assignments = result.scalars().all()
    return [schemas.DogAssignmentResponse.model_validate(a) for a in assignments]


# ──────────────────────────────────────
# 통계
# ──────────────────────────────────────

async def get_org_today_stats(
    db: AsyncSession, org_id: UUID,
) -> Optional[schemas.OrgAnalyticsDailyResponse]:
    """조직 오늘 통계 조회"""
    today = date.today()
    stmt = (
        select(OrgAnalyticsDaily)
        .where(
            OrgAnalyticsDaily.org_id == org_id,
            OrgAnalyticsDaily.analytics_date == today,
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    stats = result.scalar_one_or_none()
    if not stats:
        return None
    return schemas.OrgAnalyticsDailyResponse.model_validate(stats)
