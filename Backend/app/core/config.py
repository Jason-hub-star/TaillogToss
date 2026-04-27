"""
TaillogToss 설정 — pydantic-settings 기반, DogCoach config.py 마이그레이션
Toss 미니앱 전용: guest cookie 제거, Supabase 원격 인증 유지
"""
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "TaillogToss API"
    API_V1_STR: str = "/api/v1"

    # Runtime
    ENVIRONMENT: str = "development"

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v  # type: ignore[return-value]
        raise ValueError(v)

    # Database (Supabase PostgreSQL via asyncpg)
    DATABASE_URL: str

    # Supabase Auth (Remote Verification)
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str | None = None

    # Admin API (내부 자동화 전용 — X-Admin-Key 헤더)
    ADMIN_API_KEY: str = ""

    # OpenAI (AI Coaching)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    AI_COACHING_MODEL: str = "gpt-4o-mini"  # 코칭 전용 모델 (환경변수로 교체 가능)

    # AI Cost Control
    AI_DAILY_BUDGET_USD: float = 5.0
    AI_MONTHLY_BUDGET_USD: float = 30.0
    AI_USER_DAILY_LIMIT: int = 6
    AI_USER_BURST_LIMIT: int = 2
    AI_USER_BURST_WINDOW_MIN: int = 10
    AI_TTL_7D_HOURS: int = 72
    AI_TTL_15D_HOURS: int = 168
    AI_TTL_30D_HOURS: int = 168
    AI_LLM_TIMEOUT_SEC: int = 120
    AI_MAX_RETRIES: int = 1
    AI_TEMPERATURE: float = 0.2
    AI_TOP_P: float = 1.0
    AI_MAX_INPUT_TOKENS: int = 1200
    AI_MAX_OUTPUT_TOKENS: int = 1800

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
