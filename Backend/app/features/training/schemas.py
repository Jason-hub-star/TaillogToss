"""
훈련 Pydantic 스키마 — FE types/training.ts 미러
Parity: UI-001
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TrainingStatusUpdate(BaseModel):
    """훈련 상태 업데이트 요청"""
    dog_id: str
    curriculum_id: str
    stage_id: str
    step_number: int
    status: str  # COMPLETED | SKIPPED_INEFFECTIVE | SKIPPED_ALREADY_DONE | HIDDEN_BY_AI
    current_variant: str = "A"  # PlanVariant A|B|C
    memo: Optional[str] = None


class TrainingStatusResponse(BaseModel):
    """훈련 상태 응답"""
    id: UUID
    user_id: UUID
    dog_id: UUID
    curriculum_id: str
    stage_id: str
    step_number: int
    status: str
    current_variant: str = "A"
    memo: Optional[str] = None
    reaction: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StepFeedbackUpdate(BaseModel):
    """스텝 반응 저장 요청"""
    dog_id: str
    curriculum_id: str
    stage_id: str
    step_number: int
    reaction: str  # enjoyed | neutral | sensitive
    memo: Optional[str] = None


class TrainingProgressSummary(BaseModel):
    """커리큘럼별 진행 요약"""
    curriculum_id: str
    total_steps: int
    completed_steps: int
    current_day: int
    current_variant: str
    status: str  # not_started | in_progress | completed
