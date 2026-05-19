"""
B2B 조직 Pydantic 스키마 — FE types/b2b.ts 미러
Parity: B2B-001
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OrgResponse(BaseModel):
    """FE b2b.ts Organization 미러"""
    id: UUID
    name: str
    type: str
    owner_user_id: UUID
    logo_url: Optional[str] = None
    business_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    max_dogs: int = 30
    max_staff: int = 5
    settings: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrgMemberResponse(BaseModel):
    id: UUID
    org_id: UUID
    user_id: UUID
    role: str
    status: str
    invited_at: datetime
    accepted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OrgDogResponse(BaseModel):
    id: UUID
    org_id: UUID
    dog_id: UUID
    parent_user_id: Optional[UUID] = None
    parent_name: Optional[str] = None
    group_tag: str = "default"
    enrolled_at: datetime
    discharged_at: Optional[datetime] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class OrgDogWithStatus(OrgDogResponse):
    """오늘 상태 포함"""
    dog_name: Optional[str] = None
    dog_breed: Optional[str] = None
    today_log_count: int = 0
    has_today_report: bool = False
    last_log_time: Optional[str] = None
    trainer_name: Optional[str] = None


class DogAssignmentResponse(BaseModel):
    id: UUID
    dog_id: UUID
    org_id: Optional[UUID] = None
    trainer_user_id: UUID
    role: str
    assigned_at: datetime
    ended_at: Optional[datetime] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class OrgAnalyticsDailyResponse(BaseModel):
    id: UUID
    org_id: UUID
    analytics_date: str
    total_dogs: int = 0
    avg_activity_score: float = 0
    aggression_incident_count: int = 0
    total_behavior_logs: int = 0
    report_open_rate: float = 0
    reaction_rate: float = 0
    question_count: int = 0
    record_completion_rate: float = 0

    model_config = ConfigDict(from_attributes=True)


# 요청 DTO

class EnrollDogRequest(BaseModel):
    org_id: str
    dog_id: str
    parent_user_id: Optional[str] = None
    parent_name: Optional[str] = None
    group_tag: str = "default"
    parent_phone_enc: Optional[str] = None
    parent_email_enc: Optional[str] = None


class InviteMemberRequest(BaseModel):
    org_id: str
    user_id: str
    role: str  # owner | manager | staff | viewer


class AssignDogRequest(BaseModel):
    dog_id: str
    org_id: Optional[str] = None
    trainer_user_id: str
    role: str = "primary"  # primary | assistant


class UpdateOrgRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
