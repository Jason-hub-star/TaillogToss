"""
설정 Pydantic 스키마 — FE types/settings.ts 미러
DogCoach settings/schemas.py 마이그레이션 + TaillogToss 확장
Parity: APP-001
"""
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class ChannelsSchema(BaseModel):
    smart_message: bool = True
    push: bool = True


class TypesSchema(BaseModel):
    log_reminder: bool = True
    surge_alert: bool = True
    coaching_ready: bool = True
    training_reminder: bool = True
    promo: bool = False


class QuietHoursSchema(BaseModel):
    enabled: bool = True
    start_hour: int = 22
    end_hour: int = 8


class NotificationPrefSchema(BaseModel):
    """FE settings.ts NotificationPref 미러"""
    channels: ChannelsSchema = ChannelsSchema()
    types: TypesSchema = TypesSchema()
    quiet_hours: QuietHoursSchema = QuietHoursSchema()


class AiPersonaSchema(BaseModel):
    """FE settings.ts AiPersona 미러"""
    tone: Literal["empathetic", "solution"] = "empathetic"
    perspective: Literal["coach", "dog"] = "coach"


class UserSettingsUpdate(BaseModel):
    notification_pref: Optional[NotificationPrefSchema] = None
    ai_persona: Optional[AiPersonaSchema] = None
    marketing_agreed: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    id: UUID
    user_id: UUID
    notification_pref: NotificationPrefSchema
    ai_persona: AiPersonaSchema = AiPersonaSchema()
    marketing_agreed: bool = False
    marketing_agreed_at: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator('ai_persona', mode='before')
    @classmethod
    def default_ai_persona(cls, v: object) -> object:
        if v is None:
            return AiPersonaSchema()
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v

    @field_validator('notification_pref', mode='before')
    @classmethod
    def default_notification_pref(cls, v: object) -> object:
        if v is None:
            return NotificationPrefSchema()
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v
