"""
AI 코칭 Pydantic 스키마 — FE types/coaching.ts 6블록 구조 미러
Parity: AI-001
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# 6블록 서브 스키마 (FE coaching.ts 완전 미러)

class InsightBlock(BaseModel):
    title: str = ""
    summary: str = ""
    key_patterns: List[str] = []
    trend: str = "stable"  # improving | stable | worsening


class ActionItem(BaseModel):
    id: str = ""
    description: str = ""
    priority: str = "medium"  # high | medium | low
    is_completed: bool = False


class ActionPlanBlock(BaseModel):
    title: str = ""
    items: List[ActionItem] = []


class DogVoiceBlock(BaseModel):
    message: str = ""
    emotion: str = "hopeful"  # happy | anxious | confused | hopeful | tired


class DayPlan(BaseModel):
    day_number: int = 1
    focus: str = ""
    tasks: List[str] = []


class Next7DaysBlock(BaseModel):
    days: List[DayPlan] = []


class RiskSignal(BaseModel):
    type: str = ""
    description: str = ""
    severity: str = "low"  # low | medium | high
    recommendation: str = ""


class RiskSignalsBlock(BaseModel):
    signals: List[RiskSignal] = []
    overall_risk: str = "low"  # low | medium | high | critical


class ConsultationQuestionsBlock(BaseModel):
    questions: List[str] = []
    recommended_specialist: Optional[str] = None  # behaviorist | trainer | vet


class CoachingBlocks(BaseModel):
    """6블록 전체 구조 (무료 3 + PRO 3)"""
    insight: InsightBlock = InsightBlock()
    action_plan: ActionPlanBlock = ActionPlanBlock()
    dog_voice: DogVoiceBlock = DogVoiceBlock()
    next_7_days: Next7DaysBlock = Next7DaysBlock()
    risk_signals: RiskSignalsBlock = RiskSignalsBlock()
    consultation_questions: ConsultationQuestionsBlock = ConsultationQuestionsBlock()


# API 요청/응답

class CoachingRequest(BaseModel):
    dog_id: str
    report_type: str = "DAILY"  # DAILY | WEEKLY | INSIGHT
    window_days: int = 7  # 분석 기간 (7, 15, 30일)


class CoachingResponse(BaseModel):
    """FE coaching.ts CoachingResult 미러"""
    id: UUID
    dog_id: UUID
    report_type: str
    blocks: CoachingBlocks
    feedback_score: Optional[int] = None
    ai_tokens_used: int = 0
    created_at: datetime
    analytics_metadata: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackRequest(BaseModel):
    score: int = Field(..., ge=1, le=5)


class FeedbackResponse(BaseModel):
    coaching_id: UUID
    feedback_score: int


# AI 분석 (DogCoach analyze_behavior 대응)

class AIAnalysisResponse(BaseModel):
    dog_id: str
    analysis: Dict[str, Any]
    source: str = "ai"  # ai | rule
    cost_usd: float = 0.0


# 액션 추적

class ActionToggleRequest(BaseModel):
    is_completed: bool


class ActionTrackerResponse(BaseModel):
    id: UUID
    coaching_id: UUID
    action_item_id: str
    is_completed: bool
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# 일일 사용량

class DailyUsageResponse(BaseModel):
    used: int = 0
    limit: int = 3


# AI 코치 1:1 질문 (Pro 전용)

class CoachingQuestionRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=1000)
    context: Optional[str] = Field(None, max_length=2000)


class CoachingQuestionResponse(BaseModel):
    id: UUID
    dog_id: UUID
    question: str
    answer: str
    billing_period: str
    ai_tokens_used: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# 비용 상태

class CostStatusResponse(BaseModel):
    daily_calls: int = 0
    daily_cost_usd: float = 0.0
    daily_budget_usd: float = 5.0
    monthly_cost_usd: float = 0.0
    monthly_budget_usd: float = 30.0
    budget_mode: str = "normal"  # normal | saving_mode | rule_only
