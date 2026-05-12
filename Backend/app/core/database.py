"""
비동기 데이터베이스 엔진 + 세션 팩토리 — Supabase pgbouncer 호환
DogCoach database.py 마이그레이션
"""
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def build_engine_kwargs(database_url: str) -> dict[str, Any]:
    """Build SQLAlchemy async engine options.

    Supabase pooler(6543/pgbouncer transaction mode)는 asyncpg prepared
    statement cache와 호환되지 않으므로 `statement_cache_size=0`은 유지한다.
    다만 NullPool은 매 요청 첫 쿼리에서 새 연결 비용을 만들 수 있어 작은
    app-level pool로 연결을 재사용한다.
    """
    is_supabase_pooler = "pooler.supabase.com" in database_url
    engine_options: dict[str, Any] = {
        "echo": False,
        "future": True,
        "pool_pre_ping": True,
    }

    if is_supabase_pooler:
        engine_options.update({
            "connect_args": {"statement_cache_size": 0},
            "pool_size": 5,
            "max_overflow": 5,
            "pool_timeout": 10,
            "pool_recycle": 300,
        })
    else:
        engine_options.update({
            "pool_size": 20,
            "max_overflow": 10,
        })
    return engine_options


engine_kwargs = build_engine_kwargs(settings.DATABASE_URL)

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    """FastAPI Depends용 비동기 DB 세션 제너레이터"""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
