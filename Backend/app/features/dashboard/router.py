"""
대시보드 라우터 — GET / (dog_id 자동 해석)
DogCoach dashboard/router.py 마이그레이션 (Toss: 인증 필수)
Parity: APP-001, AUTH-001
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.features.dashboard import schemas, service
from app.shared.models import Dog
from app.shared.utils.ownership import verify_dog_ownership

router = APIRouter()


async def resolve_dog_id(
    dog_id: UUID | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> str:
    """dog_id 파라미터가 없으면 최신 강아지 자동 선택"""
    if dog_id:
        await verify_dog_ownership(db, dog_id, user_id=user_id)
        return str(dog_id)
    stmt = (
        select(Dog.id)
        .where(Dog.user_id == UUID(user_id))
        .order_by(desc(Dog.created_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    found = result.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="No dog profile found")
    return str(found)


@router.get("/", response_model=schemas.DashboardResponse)
async def get_dashboard(
    dog_id: str = Depends(resolve_dog_id),
    x_timezone: str = Header(default="Asia/Seoul", alias="X-Timezone"),
    db: AsyncSession = Depends(get_db),
):
    """대시보드 데이터 (프로필 + 통계 + 최근 로그)"""
    try:
        ZoneInfo(x_timezone)
    except (ZoneInfoNotFoundError, KeyError):
        x_timezone = "Asia/Seoul"
    return await service.get_dashboard_data(db, dog_id, x_timezone)
