"""
B2B 리포트 서비스 — 리포트 생성/조회/발송/인터랙션
FE api/report.ts 매핑: getOrgReports, getDogReports, getReport, getReportByShareToken,
  generateReport, sendReport, updateReport, createInteraction, getReportInteractions
Parity: B2B-001
"""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.features.org.service import verify_org_membership
from app.features.report import schemas
from app.shared.models import DailyReport, OrgDog, ParentInteraction
from app.shared.utils.ownership import verify_dog_ownership

PARENT_SHARE_ATTEMPT_WINDOW = timedelta(minutes=10)
PARENT_SHARE_MAX_ATTEMPTS = 8
_parent_share_attempts: dict[str, list[datetime]] = {}


# ──────────────────────────────────────
# 리포트 조회
# ──────────────────────────────────────

async def get_org_reports(
    db: AsyncSession, org_id: UUID, report_date: Optional[str] = None,
) -> List[schemas.DailyReportResponse]:
    """리포트 목록 (조직 기준, 날짜 필터)"""
    stmt = (
        select(DailyReport)
        .join(
            OrgDog,
            (DailyReport.dog_id == OrgDog.dog_id)
            & (DailyReport.created_by_org_id == OrgDog.org_id),
        )
        .where(DailyReport.created_by_org_id == org_id)
        .where(OrgDog.status == "active")
        .order_by(desc(DailyReport.report_date))
    )
    if report_date:
        from datetime import date as dt_date
        stmt = stmt.where(DailyReport.report_date == dt_date.fromisoformat(report_date))
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return [_to_report_response(r) for r in reports]


async def get_dog_reports(
    db: AsyncSession, dog_id: UUID,
) -> List[schemas.DailyReportResponse]:
    """리포트 목록 (강아지 기준)"""
    stmt = (
        select(DailyReport)
        .where(DailyReport.dog_id == dog_id)
        .order_by(desc(DailyReport.report_date))
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return [_to_report_response(r) for r in reports]


async def get_report(
    db: AsyncSession, report_id: UUID, user_id: str,
) -> schemas.DailyReportResponse:
    """리포트 상세 조회"""
    report = await verify_report_access(db, report_id, user_id)
    return _to_report_response(report)


async def verify_report_access(
    db: AsyncSession, report_id: UUID, user_id: str,
) -> DailyReport:
    """리포트 접근권 확인 — 생성 조직 멤버, 생성 트레이너, 또는 강아지 접근권."""
    stmt = select(DailyReport).where(DailyReport.id == report_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise NotFoundException("Report not found")

    if report.created_by_org_id:
        await verify_org_membership(db, report.created_by_org_id, user_id)
        await _verify_active_org_dog(db, report.created_by_org_id, report.dog_id)
        return report

    if report.created_by_trainer_id and str(report.created_by_trainer_id) == user_id:
        await verify_dog_ownership(db, report.dog_id, user_id=user_id)
        return report

    await verify_dog_ownership(db, report.dog_id, user_id=user_id)
    return report


async def get_report_by_share_token(
    db: AsyncSession, token: str, last4: str, attempt_key: Optional[str] = None,
) -> schemas.PublicDailyReportResponse:
    """공유 토큰 + 보호자 전화번호 뒷4자리로 리포트 조회 (비인증 보호자)"""
    normalized_last4 = "".join(ch for ch in last4 if ch.isdigit())[-4:]
    if len(normalized_last4) != 4:
        raise NotFoundException("Report not found or link expired")

    limiter_key = _consume_parent_share_attempt(token, attempt_key)

    stmt = (
        select(DailyReport)
        .join(
            OrgDog,
            (DailyReport.dog_id == OrgDog.dog_id)
            & (DailyReport.created_by_org_id == OrgDog.org_id),
        )
        .where(DailyReport.share_token == token)
        .where(OrgDog.parent_phone_last4 == normalized_last4)
        .where(OrgDog.status == "active")
        .where(
            or_(
                DailyReport.expires_at.is_(None),
                DailyReport.expires_at > datetime.now(timezone.utc),
            )
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    if not report:
        raise NotFoundException("Report not found or link expired")
    _clear_parent_share_attempts(limiter_key)
    return _to_public_report_response(report)


async def verify_parent_phone_last4(
    db: AsyncSession, share_token: str, last4: str, attempt_key: Optional[str] = None,
) -> schemas.VerifyParentPhoneLast4Response:
    """공유 리포트 토큰으로 연결된 보호자 전화번호 뒷4자리를 검증한다."""
    normalized_last4 = "".join(ch for ch in last4 if ch.isdigit())[-4:]
    if len(normalized_last4) != 4:
        return schemas.VerifyParentPhoneLast4Response(verified=False)

    limiter_key = _consume_parent_share_attempt(share_token, attempt_key)

    stmt = (
        select(OrgDog.parent_phone_last4)
        .join(
            DailyReport,
            (DailyReport.dog_id == OrgDog.dog_id)
            & (DailyReport.created_by_org_id == OrgDog.org_id),
        )
        .where(DailyReport.share_token == share_token)
        .where(OrgDog.status == "active")
        .where(
            or_(
                DailyReport.expires_at.is_(None),
                DailyReport.expires_at > datetime.now(timezone.utc),
            )
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    stored_last4 = result.scalar_one_or_none()
    verified = stored_last4 == normalized_last4
    if verified:
        _clear_parent_share_attempts(limiter_key)
    return schemas.VerifyParentPhoneLast4Response(verified=verified)


# ──────────────────────────────────────
# 리포트 생성/수정/발송
# ──────────────────────────────────────

async def generate_report(
    db: AsyncSession, data: schemas.GenerateReportRequest, user_id: str,
) -> schemas.DailyReportResponse:
    """리포트 생성 (generation_status=pending으로 생성, AI 생성은 별도 워커)"""
    from datetime import date as dt_date
    dog_id = UUID(data.dog_id)
    created_by_org_id = UUID(data.created_by_org_id) if data.created_by_org_id else None
    created_by_trainer_id = UUID(data.created_by_trainer_id) if data.created_by_trainer_id else None

    if created_by_org_id:
        await verify_org_membership(db, created_by_org_id, user_id)
        await _verify_active_org_dog(db, created_by_org_id, dog_id)
    elif created_by_trainer_id:
        if str(created_by_trainer_id) != user_id:
            raise ForbiddenException("Cannot create report as another trainer")
        await verify_dog_ownership(db, dog_id, user_id=user_id)
    else:
        await verify_dog_ownership(db, dog_id, user_id=user_id)

    report = DailyReport(
        dog_id=dog_id,
        report_date=dt_date.fromisoformat(data.report_date),
        template_type=data.template_type,
        created_by_org_id=created_by_org_id,
        created_by_trainer_id=created_by_trainer_id,
        generation_status="pending",
        highlight_photo_urls=[],
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return _to_report_response(report)


async def _verify_active_org_dog(db: AsyncSession, org_id: UUID, dog_id: UUID) -> None:
    """B2B-001: org reports must be bound to an active dog in the same org."""
    stmt = (
        select(OrgDog.id)
        .where(
            OrgDog.org_id == org_id,
            OrgDog.dog_id == dog_id,
            OrgDog.status == "active",
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is None:
        raise ForbiddenException("Dog is not active in this organization")


async def send_report(
    db: AsyncSession, report_id: UUID, user_id: str,
) -> schemas.DailyReportResponse:
    """리포트 발송 (share_token 생성 + sent_at 업데이트)"""
    report = await verify_report_access(db, report_id, user_id)

    report.share_token = str(uuid4())
    report.generation_status = "sent"
    report.sent_at = datetime.now(timezone.utc)
    report.expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    await db.commit()
    await db.refresh(report)
    return _to_report_response(report)


async def update_report(
    db: AsyncSession, report_id: UUID, updates: schemas.UpdateReportRequest, user_id: str,
) -> schemas.DailyReportResponse:
    """리포트 편집"""
    report = await verify_report_access(db, report_id, user_id)

    if updates.behavior_summary is not None:
        report.behavior_summary = updates.behavior_summary
    if updates.condition_notes is not None:
        report.condition_notes = updates.condition_notes
    if updates.ai_coaching_oneliner is not None:
        report.ai_coaching_oneliner = updates.ai_coaching_oneliner
    if updates.toss_share_url is not None:
        report.toss_share_url = updates.toss_share_url

    await db.commit()
    await db.refresh(report)
    return _to_report_response(report)


# ──────────────────────────────────────
# 보호자 인터랙션
# ──────────────────────────────────────

async def create_interaction(
    db: AsyncSession, data: schemas.CreateInteractionRequest, user_id: Optional[str] = None,
) -> schemas.ParentInteractionResponse:
    """보호자 인터랙션 생성"""
    report_id = UUID(data.report_id)
    if user_id:
        await verify_report_access(db, report_id, user_id)
    else:
        if not data.share_token or not data.last4:
            raise ForbiddenException("Parent verification is required")
        report = await get_report_by_share_token(db, data.share_token, data.last4)
        if str(report.id) != data.report_id:
            raise ForbiddenException("Parent verification does not match this report")

    interaction = ParentInteraction(
        report_id=report_id,
        parent_user_id=UUID(user_id) if user_id else None,
        parent_identifier=data.parent_identifier,
        interaction_type=data.interaction_type,
        content=data.content,
    )
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)
    return schemas.ParentInteractionResponse.model_validate(interaction)


async def get_report_interactions(
    db: AsyncSession, report_id: UUID,
) -> List[schemas.ParentInteractionResponse]:
    """리포트 인터랙션 목록"""
    stmt = (
        select(ParentInteraction)
        .where(ParentInteraction.report_id == report_id)
        .order_by(ParentInteraction.created_at)
    )
    result = await db.execute(stmt)
    interactions = result.scalars().all()
    return [schemas.ParentInteractionResponse.model_validate(i) for i in interactions]


# ──────────────────────────────────────
# 헬퍼
# ──────────────────────────────────────

def _to_report_response(report: DailyReport) -> schemas.DailyReportResponse:
    """DailyReport ORM → Response DTO (report_date 문자열 변환)"""
    return schemas.DailyReportResponse(
        id=report.id,
        dog_id=report.dog_id,
        report_date=str(report.report_date),
        template_type=str(report.template_type.value) if hasattr(report.template_type, "value") else str(report.template_type),
        created_by_org_id=report.created_by_org_id,
        created_by_trainer_id=report.created_by_trainer_id,
        behavior_summary=report.behavior_summary,
        condition_notes=report.condition_notes,
        ai_coaching_oneliner=report.ai_coaching_oneliner,
        seven_day_comparison=report.seven_day_comparison,
        highlight_photo_urls=report.highlight_photo_urls or [],
        generation_status=str(report.generation_status.value) if hasattr(report.generation_status, "value") else str(report.generation_status),
        ai_model=report.ai_model,
        ai_cost_usd=float(report.ai_cost_usd) if report.ai_cost_usd else None,
        generated_at=report.generated_at,
        scheduled_send_at=report.scheduled_send_at,
        sent_at=report.sent_at,
        share_token=report.share_token,
        toss_share_url=report.toss_share_url,
        expires_at=report.expires_at,
        created_at=report.created_at,
    )


def _to_public_report_response(report: DailyReport) -> schemas.PublicDailyReportResponse:
    """DailyReport ORM -> public parent-share DTO without internal org/cost/token fields."""
    return schemas.PublicDailyReportResponse(
        id=report.id,
        dog_id=report.dog_id,
        report_date=str(report.report_date),
        template_type=str(report.template_type.value) if hasattr(report.template_type, "value") else str(report.template_type),
        behavior_summary=report.behavior_summary,
        condition_notes=report.condition_notes,
        ai_coaching_oneliner=report.ai_coaching_oneliner,
        seven_day_comparison=report.seven_day_comparison,
        highlight_photo_urls=report.highlight_photo_urls or [],
        generation_status=str(report.generation_status.value) if hasattr(report.generation_status, "value") else str(report.generation_status),
        sent_at=report.sent_at,
        expires_at=report.expires_at,
        created_at=report.created_at,
    )


def _parent_share_attempt_bucket(token: str, attempt_key: Optional[str]) -> str:
    raw = f"{token}:{attempt_key or 'unknown'}"
    return sha256(raw.encode("utf-8")).hexdigest()


def _consume_parent_share_attempt(token: str, attempt_key: Optional[str]) -> str:
    """Throttle public share-token verification so last4 cannot be brute-forced cheaply."""
    bucket = _parent_share_attempt_bucket(token, attempt_key)
    now = datetime.now(timezone.utc)
    cutoff = now - PARENT_SHARE_ATTEMPT_WINDOW
    attempts = [stamp for stamp in _parent_share_attempts.get(bucket, []) if stamp > cutoff]
    if len(attempts) >= PARENT_SHARE_MAX_ATTEMPTS:
        _parent_share_attempts[bucket] = attempts
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts",
        )
    attempts.append(now)
    _parent_share_attempts[bucket] = attempts
    return bucket


def _clear_parent_share_attempts(bucket: str) -> None:
    _parent_share_attempts.pop(bucket, None)


def _reset_parent_share_attempts_for_tests() -> None:
    _parent_share_attempts.clear()
