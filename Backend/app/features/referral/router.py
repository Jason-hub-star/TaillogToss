"""Referral reward routes.

contactsViral sendViral events grant an inviter-only PRO_DAY_PASS entitlement.
Parity: GROWTH-001, IAP-001
"""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.features.subscription.entitlements import (
    EFFECTIVE_SOURCE_DAY_PASS,
    PRO_DAY_PASS,
    grant_contacts_viral_pro_day_pass,
)

router = APIRouter()


class ContactsViralRewardRequest(BaseModel):
    module_id: str = Field(..., min_length=1, max_length=255)
    reward_amount: int | None = Field(default=None, ge=0)
    reward_unit: str | None = Field(default=None, max_length=80)
    event_type: str = Field(default="sendViral", pattern="^sendViral$")


class ContactsViralRewardResponse(BaseModel):
    granted: bool
    already_granted: bool
    entitlement_type: str = PRO_DAY_PASS
    effective_is_pro: bool = True
    effective_pro_source: str = EFFECTIVE_SOURCE_DAY_PASS
    effective_pro_expires_at: datetime


@router.post("/reward/contacts-viral", response_model=ContactsViralRewardResponse)
async def grant_contacts_viral_reward(
    body: ContactsViralRewardRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ContactsViralRewardResponse:
    """Grant inviter-only PRO 1-day pass after a contactsViral sendViral event."""
    configured_module_id = settings.CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID.strip()
    if not configured_module_id and settings.is_production:
        raise HTTPException(status_code=503, detail="contactsViral reward moduleId is not configured")
    if configured_module_id and body.module_id != configured_module_id:
        raise HTTPException(status_code=403, detail="Invalid contactsViral moduleId")

    entitlement, granted = await grant_contacts_viral_pro_day_pass(
        db=db,
        user_id=UUID(user_id),
        module_id=body.module_id,
        reward_amount=body.reward_amount,
        reward_unit=body.reward_unit,
        duration_days=settings.CONTACTS_VIRAL_PRO_DAY_PASS_DAYS,
    )
    await db.commit()
    await db.refresh(entitlement)

    return ContactsViralRewardResponse(
        granted=granted,
        already_granted=not granted,
        effective_pro_expires_at=entitlement.expires_at,
    )
