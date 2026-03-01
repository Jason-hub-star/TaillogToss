"""
행동 기록 Pydantic 스키마 — FE types/log.ts 미러
Parity: LOG-001
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuickLogCreate(BaseModel):
    """FE log.ts QuickLogInput 미러"""
    dog_id: UUID
    category: str  # QuickLogCategory | DailyActivityCategory
    intensity: int = Field(..., ge=1, le=10)
    occurred_at: datetime
    memo: Optional[str] = None
    location: Optional[str] = None
    duration_minutes: Optional[int] = None


class DetailedLogCreate(BaseModel):
    """FE log.ts DetailedLogInput 미러"""
    dog_id: UUID
    type_id: str
    antecedent: str
    behavior: str
    consequence: str
    intensity: int = Field(..., ge=1, le=10)
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    memo: Optional[str] = None
    occurred_at: datetime


class LogUpdate(BaseModel):
    """행동 기록 부분 수정"""
    intensity: Optional[int] = Field(None, ge=1, le=10)
    antecedent: Optional[str] = None
    behavior: Optional[str] = None
    consequence: Optional[str] = None
    memo: Optional[str] = None
    occurred_at: Optional[datetime] = None


class LogResponse(BaseModel):
    """FE log.ts BehaviorLog 미러"""
    id: UUID
    dog_id: UUID
    is_quick_log: bool = False
    quick_category: Optional[str] = None
    daily_activity: Optional[str] = None
    type_id: Optional[str] = None
    antecedent: Optional[str] = None
    behavior: Optional[str] = None
    consequence: Optional[str] = None
    intensity: int
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    memo: Optional[str] = None
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime
    # B2B 확장
    org_id: Optional[UUID] = None
    recorded_by: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)
