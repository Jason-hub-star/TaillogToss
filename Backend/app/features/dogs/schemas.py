"""
강아지 프로필 Pydantic 스키마 — FE types/dog.ts 미러
Parity: APP-001
"""
from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.shared.models import DogSex


class DogBasic(BaseModel):
    """FE dog.ts Dog 미러"""
    id: UUID
    user_id: UUID
    name: str
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[DogSex] = None
    weight_kg: Optional[float] = None
    profile_image_url: Optional[str] = None
    created_at: Any
    updated_at: Any

    model_config = ConfigDict(from_attributes=True)


class DogProfileFull(BaseModel):
    """강아지 전체 프로필 (Dog + DogEnv)"""
    basic: DogBasic
    household_info: Dict[str, Any] = {}
    health_meta: Dict[str, Any] = {}
    activity_meta: Dict[str, Any] = {}
    triggers: List[str] = []
    past_attempts: List[str] = []
    temperament: Dict[str, Any] = {}
    rewards_meta: Dict[str, Any] = {}
    chronic_issues: Dict[str, Any] = {}
    profile_meta: Dict[str, Any] = {}


class DogProfileUpdate(BaseModel):
    """강아지 프로필 부분 업데이트"""
    name: Optional[str] = None
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[DogSex] = None
    weight_kg: Optional[float] = None
    profile_image_url: Optional[str] = None
    # JSONB 필드
    household_info: Optional[Dict[str, Any]] = None
    health_meta: Optional[Dict[str, Any]] = None
    activity_meta: Optional[Dict[str, Any]] = None
    rewards_meta: Optional[Dict[str, Any]] = None
    chronic_issues: Optional[Dict[str, Any]] = None
    triggers: Optional[Any] = None
    past_attempts: Optional[Any] = None
    temperament: Optional[Dict[str, Any]] = None


class DogListItem(BaseModel):
    """강아지 목록 아이템 (멀티독용)"""
    id: UUID
    user_id: UUID
    name: str
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[DogSex] = None
    weight_kg: Optional[float] = None
    profile_image_url: Optional[str] = None
    created_at: Any
    updated_at: Any

    model_config = ConfigDict(from_attributes=True)


class DogCreateRequest(BaseModel):
    """강아지 추가 (dog/add.tsx)"""
    name: str
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    sex: Optional[DogSex] = None
    weight_kg: Optional[float] = None
