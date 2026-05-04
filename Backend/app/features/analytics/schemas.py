"""행동 분석 스키마 — Parity: AI-COACHING-ANALYTICS-001, UI-TRAINING-DETAIL-001"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class BehaviorStat(BaseModel):
    behavior: str
    count: int
    avg_intensity: float
    trend: str  # 'improving' | 'stable' | 'worsening'


class StepAttemptResponse(BaseModel):
    id: str
    dog_id: str
    step_id: str
    curriculum_id: str
    day_number: int
    attempt_number: int
    reaction: Optional[str]
    situation_tags: Optional[List[str]]
    method_used: Optional[str]
    what_worked: Optional[str]
    what_didnt_work: Optional[str]
    recorded_by: Optional[str]
    created_at: str


class BehaviorAnalyticsResponse(BaseModel):
    dog_id: str
    analysis_days: int
    total_logs: int
    top_behaviors: List[str]           # 빈도순 정렬
    avg_intensity_by_behavior: Dict[str, float]
    weekly_trend: Dict[str, str]       # behavior -> 'improving'|'stable'|'worsening'
    peak_hour: Optional[int]           # 0~23, 가장 많은 시간대
    stats: List[BehaviorStat]
    memo_keywords: Optional[Dict[str, List[str]]] = None
    # { "barking": ["자전거", "초인종", "현관"], ... } — 추천 reasoning 보강용
