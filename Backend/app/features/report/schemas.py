"""
B2B 리포트 Pydantic 스키마 — FE types/b2b.ts DailyReport/ParentInteraction 미러
Parity: B2B-001
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────
# 응답 DTO
# ──────────────────────────────────────

class DailyReportResponse(BaseModel):
    """FE b2b.ts DailyReport 미러"""
    id: UUID
    dog_id: UUID
    report_date: str
    template_type: str
    created_by_org_id: Optional[UUID] = None
    created_by_trainer_id: Optional[UUID] = None
    # AI 콘텐츠
    behavior_summary: Optional[str] = None
    condition_notes: Optional[str] = None
    ai_coaching_oneliner: Optional[str] = None
    seven_day_comparison: Optional[Dict[str, Any]] = None
    highlight_photo_urls: List[str] = []
    # 상태
    generation_status: str
    ai_model: Optional[str] = None
    ai_cost_usd: Optional[float] = None
    generated_at: Optional[datetime] = None
    scheduled_send_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    # 보호자 접근
    share_token: Optional[str] = None
    toss_share_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicDailyReportResponse(BaseModel):
    """비인증 보호자 공유 링크용 최소 리포트 응답."""
    id: UUID
    dog_id: UUID
    report_date: str
    template_type: str
    behavior_summary: Optional[str] = None
    condition_notes: Optional[str] = None
    ai_coaching_oneliner: Optional[str] = None
    seven_day_comparison: Optional[Dict[str, Any]] = None
    highlight_photo_urls: List[str] = []
    generation_status: str
    sent_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParentInteractionResponse(BaseModel):
    """FE b2b.ts ParentInteraction 미러"""
    id: UUID
    report_id: UUID
    parent_user_id: Optional[UUID] = None
    parent_identifier: Optional[str] = None
    interaction_type: str
    content: Optional[str] = None
    linked_log_id: Optional[UUID] = None
    staff_response: Optional[str] = None
    responded_by: Optional[UUID] = None
    responded_at: Optional[datetime] = None
    read_by_staff: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ──────────────────────────────────────
# 요청 DTO
# ──────────────────────────────────────

class GenerateReportRequest(BaseModel):
    """리포트 생성 요청"""
    dog_id: str
    report_date: str  # YYYY-MM-DD
    template_type: str  # hotel | daycare_general | training_focus | problem_behavior
    created_by_org_id: Optional[str] = None
    created_by_trainer_id: Optional[str] = None


class UpdateReportRequest(BaseModel):
    """리포트 편집 요청"""
    behavior_summary: Optional[str] = None
    condition_notes: Optional[str] = None
    ai_coaching_oneliner: Optional[str] = None
    toss_share_url: Optional[str] = None


class CreateInteractionRequest(BaseModel):
    """보호자 인터랙션 생성"""
    report_id: str
    parent_user_id: Optional[str] = None
    parent_identifier: Optional[str] = None
    share_token: Optional[str] = None
    last4: Optional[str] = Field(None, pattern=r"^\d{4}$")
    interaction_type: str  # like | question | comment | goal_request
    content: Optional[str] = None


class VerifyParentPhoneLast4Request(BaseModel):
    """공유 리포트 보호자 전화번호 뒷4자리 검증"""
    share_token: str
    last4: str = Field(..., pattern=r"^\d{4}$")


class VerifyParentPhoneLast4Response(BaseModel):
    """보호자 인증 결과"""
    verified: bool
