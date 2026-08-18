"""
B2B 리포트 라우터 — 9개 엔드포인트
FE api/report.ts 매핑: getOrgReports, getDogReports, getReport, getReportByShareToken,
  generateReport, sendReport, updateReport, createInteraction, getReportInteractions
Parity: B2B-001
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id, get_current_user_id_optional
from app.features.org.service import verify_org_membership
from app.features.report import schemas, service
from app.shared.utils.ownership import verify_dog_ownership

router = APIRouter()


# ──────────────────────────────────────
# 조회
# ──────────────────────────────────────

@router.get("/org/{org_id}", response_model=List[schemas.DailyReportResponse])
async def get_org_reports(
    org_id: UUID,
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 목록 (조직 기준, 날짜 필터)"""
    await verify_org_membership(db, org_id, user_id)
    return await service.get_org_reports(db, org_id, date)


@router.get("/dog/{dog_id}", response_model=List[schemas.DailyReportResponse])
async def get_dog_reports(
    dog_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 목록 (강아지 기준)"""
    await verify_dog_ownership(db, dog_id, user_id=user_id)
    return await service.get_dog_reports(db, dog_id)


@router.get("/share/{token}", response_model=schemas.PublicDailyReportResponse)
async def get_report_by_share_token(
    request: Request,
    token: str,
    last4: str = Query(..., pattern=r"^\d{4}$"),
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db),
):
    """공유 토큰 + 보호자 전화번호 뒷4자리로 리포트 조회 (비인증 보호자 접근 허용)"""
    return await service.get_report_by_share_token(
        db,
        token,
        last4,
        attempt_key=request.client.host if request.client else None,
    )


@router.post("/share/verify-parent-phone", response_model=schemas.VerifyParentPhoneLast4Response)
async def verify_parent_phone_last4(
    request: Request,
    data: schemas.VerifyParentPhoneLast4Request,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db),
):
    """공유 리포트 보호자 전화번호 뒷4자리 검증 (비인증 보호자 접근 허용)"""
    return await service.verify_parent_phone_last4(
        db,
        data.share_token,
        data.last4,
        attempt_key=request.client.host if request.client else None,
    )


@router.get("/{report_id}", response_model=schemas.DailyReportResponse)
async def get_report(
    report_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 상세 조회"""
    return await service.get_report(db, report_id, user_id=user_id)


# ──────────────────────────────────────
# 생성/수정/발송
# ──────────────────────────────────────

@router.post("/", response_model=schemas.DailyReportResponse,
             status_code=status.HTTP_201_CREATED)
async def generate_report(
    data: schemas.GenerateReportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 생성 요청"""
    return await service.generate_report(db, data, user_id=user_id)


@router.patch("/{report_id}/send", response_model=schemas.DailyReportResponse)
async def send_report(
    report_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 발송 (share_token 생성)"""
    return await service.send_report(db, report_id, user_id=user_id)


@router.patch("/{report_id}", response_model=schemas.DailyReportResponse)
async def update_report(
    report_id: UUID,
    updates: schemas.UpdateReportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 편집"""
    return await service.update_report(db, report_id, updates, user_id=user_id)


# ──────────────────────────────────────
# 인터랙션
# ──────────────────────────────────────

@router.post("/interactions", response_model=schemas.ParentInteractionResponse,
             status_code=status.HTTP_201_CREATED)
async def create_interaction(
    data: schemas.CreateInteractionRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: AsyncSession = Depends(get_db),
):
    """보호자 인터랙션 생성 (비인증 허용)"""
    return await service.create_interaction(db, data, user_id=user_id)


@router.get("/{report_id}/interactions", response_model=List[schemas.ParentInteractionResponse])
async def get_report_interactions(
    report_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """리포트 인터랙션 목록"""
    await service.verify_report_access(db, report_id, user_id)
    return await service.get_report_interactions(db, report_id)
