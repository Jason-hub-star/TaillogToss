"""
Supabase 원격 인증 — JWT 토큰을 Supabase Auth API로 검증
DogCoach security.py 마이그레이션
"""
import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import Client, create_client

from app.core.config import settings

logger = logging.getLogger(__name__)

# Supabase 클라이언트 (anon key로 auth.getUser 호출)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """인증 필수 — 유효하지 않으면 401"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise ValueError("User not found")
        return user_response.user.id
    except Exception as e:
        logger.warning("Auth verification failed: %s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_admin_key(
    x_admin_key: str = Header(default="", alias="x-admin-key"),
) -> None:
    """
    내부 자동화 전용 admin 엔드포인트 인증.
    X-Admin-Key 헤더가 ADMIN_API_KEY 환경변수와 일치해야 함.
    ADMIN_API_KEY 미설정 시 항상 403 반환 (fail-safe).
    """
    if not settings.ADMIN_API_KEY or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access denied",
        )


async def get_current_user_id_optional(
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[str]:
    """인증 선택 — 토큰이 없을 때만 게스트 허용, 무효 토큰은 401."""
    if not token:
        return None
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise ValueError("User not found")
        return user_response.user.id
    except Exception as e:
        logger.warning("Optional auth verification failed: %s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
