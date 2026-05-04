"""
TaillogToss 전체 SQLAlchemy 모델 — DogCoach 17테이블 + B2B 10테이블 + Toss IAP
FE types/ 1:1 미러: auth.ts, dog.ts, log.ts, coaching.ts, training.ts,
subscription.ts, notification.ts, settings.ts, b2b.ts
"""
from datetime import datetime
from enum import Enum as PyEnum
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


# ──────────────────────────────────────
# Enums (FE types/ 미러)
# ──────────────────────────────────────

class UserRole(str, PyEnum):
    """FE auth.ts UserRole — 4종 고정"""
    USER = "user"
    TRAINER = "trainer"
    ORG_OWNER = "org_owner"
    ORG_STAFF = "org_staff"


class UserStatus(str, PyEnum):
    """FE auth.ts UserStatus"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    BANNED = "banned"


class DogSex(str, PyEnum):
    """FE dog.ts DogSex"""
    MALE = "MALE"
    FEMALE = "FEMALE"
    MALE_NEUTERED = "MALE_NEUTERED"
    FEMALE_NEUTERED = "FEMALE_NEUTERED"


class PlanType(str, PyEnum):
    """FE subscription.ts PlanType — B2C"""
    FREE = "FREE"
    PRO_MONTHLY = "PRO_MONTHLY"
    PRO_YEARLY = "PRO_YEARLY"


class AssetType(str, PyEnum):
    """FE log.ts AssetType"""
    PHOTO = "PHOTO"
    VIDEO = "VIDEO"


class ReportType(str, PyEnum):
    """FE coaching.ts ReportType"""
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    INSIGHT = "INSIGHT"


class TrainingStatus(str, PyEnum):
    """DogCoach TrainingStatus"""
    COMPLETED = "COMPLETED"
    SKIPPED_INEFFECTIVE = "SKIPPED_INEFFECTIVE"
    SKIPPED_ALREADY_DONE = "SKIPPED_ALREADY_DONE"
    HIDDEN_BY_AI = "HIDDEN_BY_AI"


class NotiChannel(str, PyEnum):
    """FE notification.ts NotificationChannel"""
    ALIMTALK = "ALIMTALK"
    WEB_PUSH = "WEB_PUSH"
    EMAIL = "EMAIL"


class TossOrderStatus(str, PyEnum):
    """FE subscription.ts TossOrderStatus — 6종"""
    PURCHASED = "PURCHASED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    ORDER_IN_PROGRESS = "ORDER_IN_PROGRESS"
    NOT_FOUND = "NOT_FOUND"


class GrantStatus(str, PyEnum):
    """FE subscription.ts GrantStatus — 5종"""
    PENDING = "pending"
    GRANTED = "granted"
    GRANT_FAILED = "grant_failed"
    REFUND_REQUESTED = "refund_requested"
    REFUNDED = "refunded"


# B2B Enums (FE b2b.ts 미러)

class OrgType(str, PyEnum):
    DAYCARE = "daycare"
    HOTEL = "hotel"
    TRAINING_CENTER = "training_center"
    HOSPITAL = "hospital"


class OrgStatus(str, PyEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"


class OrgMemberRole(str, PyEnum):
    OWNER = "owner"
    MANAGER = "manager"
    STAFF = "staff"
    VIEWER = "viewer"


class OrgMemberStatus(str, PyEnum):
    PENDING = "pending"
    ACTIVE = "active"
    DEACTIVATED = "deactivated"


class OrgDogStatus(str, PyEnum):
    ACTIVE = "active"
    DISCHARGED = "discharged"
    TEMPORARY = "temporary"


class DogAssignmentRole(str, PyEnum):
    PRIMARY = "primary"
    ASSISTANT = "assistant"


class DogAssignmentStatus(str, PyEnum):
    ACTIVE = "active"
    ENDED = "ended"


class ReportTemplateType(str, PyEnum):
    HOTEL = "hotel"
    DAYCARE_GENERAL = "daycare_general"
    TRAINING_FOCUS = "training_focus"
    PROBLEM_BEHAVIOR = "problem_behavior"


class DailyReportStatus(str, PyEnum):
    PENDING = "pending"
    GENERATING = "generating"
    GENERATED = "generated"
    FAILED = "failed"
    SENT = "sent"


class InteractionType(str, PyEnum):
    LIKE = "like"
    QUESTION = "question"
    COMMENT = "comment"
    GOAL_REQUEST = "goal_request"


class OrgPlanType(str, PyEnum):
    CENTER_BASIC = "center_basic"
    CENTER_PRO = "center_pro"
    CENTER_ENTERPRISE = "center_enterprise"
    TRAINER_10 = "trainer_10"
    TRAINER_30 = "trainer_30"
    TRAINER_50 = "trainer_50"


class OrgSubscriptionStatus(str, PyEnum):
    ACTIVE = "active"
    TRIAL = "trial"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"
    REFUNDED = "refunded"


# ──────────────────────────────────────
# B2C 핵심 모델 (DogCoach 17테이블 마이그레이션)
# ──────────────────────────────────────

class User(Base):
    """사용자 — FE auth.ts User 미러"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    toss_user_key = Column(String(255), unique=True, index=True)  # kakao_sync_id 대체
    role = Column(Enum(UserRole, name="user_role", values_callable=lambda x: [e.value for e in x]), default=UserRole.USER)
    status = Column(Enum(UserStatus, name="user_status", values_callable=lambda x: [e.value for e in x]), default=UserStatus.ACTIVE)
    pepper_version = Column(Integer, default=1)  # PBKDF2 pepper 버전
    timezone = Column(String(50), default="Asia/Seoul")
    last_login_at = Column(DateTime(timezone=True))
    provider = Column(String(50), default="toss")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    dogs = relationship("Dog", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Subscription(Base):
    """구독 — FE subscription.ts Subscription 미러"""
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan_type = Column(Enum(PlanType, name="plan_type", values_callable=lambda x: [e.value for e in x]), default=PlanType.FREE)
    is_active = Column(Boolean, default=False)
    ai_tokens_remaining = Column(Integer, default=0)
    ai_tokens_total = Column(Integer, default=0)
    next_billing_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="subscription")


class Dog(Base):
    """반려견 — FE dog.ts Dog 미러"""
    __tablename__ = "dogs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name = Column(String(255), nullable=False)
    breed = Column(String(255))
    birth_date = Column(Date)
    sex = Column(Enum(DogSex, name="dog_sex", values_callable=lambda x: [e.value for e in x]))
    weight_kg = Column(Numeric(5, 2))
    profile_image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="dogs")
    env = relationship("DogEnv", back_populates="dog", uselist=False, cascade="all, delete-orphan")
    logs = relationship("BehaviorLog", back_populates="dog", cascade="all, delete-orphan")
    coaching_reports = relationship("AICoaching", back_populates="dog", cascade="all, delete-orphan")


class DogEnv(Base):
    """반려견 환경/맥락 — FE dog.ts DogEnv 미러 (JSONB 필드)"""
    __tablename__ = "dog_env"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), unique=True, index=True)
    household_info = Column(JSONB)
    health_meta = Column(JSONB)
    profile_meta = Column(JSONB)
    rewards_meta = Column(JSONB)
    chronic_issues = Column(JSONB)
    antecedents = Column(JSONB)
    triggers = Column(JSONB)
    past_attempts = Column(JSONB)
    temperament = Column(JSONB)
    activity_meta = Column(JSONB)
    # Progressive Profiling: Stage별 완성도 추적 + 응답 보존
    # {"completion_stage":1|2|3, "stage1_completed_at":..., "stage1_response":{...}, ...}
    onboarding_survey = Column(JSONB, nullable=False, server_default='{"completion_stage":1}')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    dog = relationship("Dog", back_populates="env")


class BehaviorLog(Base):
    """ABC 행동 기록 — FE log.ts BehaviorLog 미러"""
    __tablename__ = "behavior_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), index=True)
    is_quick_log = Column(Boolean, default=False)
    quick_category = Column(String(50))  # FE QuickLogCategory
    daily_activity = Column(String(50))  # FE DailyActivityCategory
    type_id = Column(String(50))
    antecedent = Column(Text)
    behavior = Column(Text)
    consequence = Column(Text)
    intensity = Column(Integer)
    duration_minutes = Column(Integer)
    location = Column(String(255))
    memo = Column(Text)
    occurred_at = Column(DateTime(timezone=True), default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # B2B 확장 (FE log.ts optional fields)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    dog = relationship("Dog", back_populates="logs")
    media = relationship("MediaAsset", back_populates="log", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_logs_dog_occurred", "dog_id", "occurred_at"),
    )


class MediaAsset(Base):
    """미디어 에셋 — FE log.ts MediaAsset 미러"""
    __tablename__ = "media_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    log_id = Column(UUID(as_uuid=True), ForeignKey("behavior_logs.id", ondelete="SET NULL"), index=True)
    storage_url = Column(Text, nullable=False)
    asset_type = Column(Enum(AssetType, name="asset_type"), nullable=False)
    # B2B 확장
    org_id = Column(UUID(as_uuid=True), nullable=True)
    is_highlight = Column(Boolean, default=False)
    report_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    log = relationship("BehaviorLog", back_populates="media")


class AICoaching(Base):
    """AI 코칭 결과 — FE coaching.ts CoachingResult 미러"""
    __tablename__ = "ai_coaching"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=True, index=True)
    report_type = Column(Enum(ReportType, name="report_type"), nullable=False)
    blocks = Column(JSONB)  # 6블록 구조 (FE CoachingBlocks)
    analysis_json = Column(JSONB)  # DogCoach 호환
    action_items = Column(JSONB)
    feedback_score = Column(Integer)
    ai_tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # 훈련 데이터 플라이휠 컬럼
    training_candidate = Column(Boolean, default=False)
    training_quality_score = Column(SmallInteger, nullable=True)
    training_approved = Column(Boolean, default=False)
    training_approved_at = Column(DateTime(timezone=True), nullable=True)
    training_version = Column(String, nullable=True)
    is_synthetic = Column(Boolean, default=False)

    dog = relationship("Dog", back_populates="coaching_reports", foreign_keys=[dog_id])
    action_tracker = relationship("ActionTracker", back_populates="coaching", cascade="all, delete-orphan")


class ActionTracker(Base):
    """코칭 액션 추적 — FE coaching.ts ActionTracker 미러"""
    __tablename__ = "action_tracker"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    coaching_id = Column(UUID(as_uuid=True), ForeignKey("ai_coaching.id", ondelete="CASCADE"), index=True)
    action_item_id = Column(String(100))
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    coaching = relationship("AICoaching", back_populates="action_tracker")


class NotiHistory(Base):
    """알림 이력 — FE notification.ts NotificationHistory 미러"""
    __tablename__ = "noti_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    notification_type = Column(String(50))
    channel = Column(Enum(NotiChannel, name="noti_channel"), nullable=False)
    template_code = Column(String(100))
    template_set_code = Column(String(100))
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    success = Column(Boolean, default=True)
    error_code = Column(String(100))
    idempotency_key = Column(String(255))
    # B2B 확장
    org_id = Column(UUID(as_uuid=True), nullable=True)
    report_id = Column(UUID(as_uuid=True), nullable=True)
    recipient_type = Column(String(50))
    read_at = Column(DateTime(timezone=True))


class LogSummary(Base):
    """로그 요약"""
    __tablename__ = "log_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    summary_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserSettings(Base):
    """사용자 설정 — FE settings.ts UserSettings 미러"""
    __tablename__ = "user_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    notification_pref = Column(JSONB)
    ai_persona = Column(JSONB)
    marketing_agreed = Column(Boolean, default=False)
    marketing_agreed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="settings")


class UserTrainingStatus(Base):
    """훈련 진행 상태 — FE training.ts TrainingProgress 부분 미러"""
    __tablename__ = "user_training_status"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), index=True)
    curriculum_id = Column(String(50), nullable=False)
    stage_id = Column(String(50), nullable=False)
    step_number = Column(Integer, nullable=False)
    status = Column(Enum(TrainingStatus, name="training_status"), nullable=False)
    current_variant = Column(String(1), default="A")  # PlanVariant
    memo = Column(Text)
    reaction = Column(String(20))  # enjoyed | neutral | sensitive
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class TrainingStepAttempt(Base):
    """시행착오 상세 기록 — training_step_attempts (2026-04-22 신규)
    VAR-1: user_training_status.reaction 과 별개 — 상세 선택적 레코드
    """
    __tablename__ = "training_step_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    step_id = Column(String(100), nullable=False)
    curriculum_id = Column(String(50), nullable=False)
    day_number = Column(Integer, nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1)
    reaction = Column(String(20), CheckConstraint("reaction IN ('enjoyed','neutral','sensitive')"), nullable=True)
    situation_tags = Column(JSONB, nullable=True)
    method_used = Column(Text, nullable=True)
    what_worked = Column(Text, nullable=True)
    what_didnt_work = Column(Text, nullable=True)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("step_attempts_idx", "dog_id", "step_id", "created_at"),
    )


class TossOrder(Base):
    """Toss IAP 주문 — FE subscription.ts TossOrder 미러"""
    __tablename__ = "toss_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id = Column(String(100), nullable=False)
    idempotency_key = Column(String(255), unique=True, nullable=False)
    toss_status = Column(Enum(TossOrderStatus, name="toss_order_status"), default=TossOrderStatus.ORDER_IN_PROGRESS)
    grant_status = Column(Enum(GrantStatus, name="grant_status"), default=GrantStatus.PENDING)
    amount = Column(Integer, default=0)
    toss_order_id = Column(String(255))
    error_code = Column(String(100))
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# AI 추천 시스템 (DogCoach Phase 7)

class AIRecommendationSnapshot(Base):
    """AI 추천 스냅샷 — 캐시 + 비용 추적"""
    __tablename__ = "ai_recommendation_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    window_days = Column(Integer, nullable=False)
    dedupe_key = Column(String(64), nullable=False, unique=True)
    prompt_version = Column(String(20), nullable=False, default="PROMPT_V1")
    model = Column(String(50), nullable=False, default="gpt-4o-mini")
    summary_hash = Column(String(64), nullable=False)
    issue = Column(String(100), nullable=False)
    recommendations = Column(JSONB, nullable=False)
    rationale = Column(Text, nullable=False)
    period_comparison = Column(Text)
    source = Column(String(20), nullable=False, default="ai")
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost_usd = Column(Numeric(10, 6), default=0)
    latency_ms = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_rec_dog_window_created", "dog_id", "window_days", created_at.desc()),
        Index("idx_rec_user_created", "user_id", "created_at"),
        Index("idx_rec_expires", "expires_at"),
    )


class AIRecommendationFeedback(Base):
    """AI 추천 피드백"""
    __tablename__ = "ai_recommendation_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("ai_recommendation_snapshots.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recommendation_index = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AICostUsageDaily(Base):
    """일일 AI 비용 추적"""
    __tablename__ = "ai_cost_usage_daily"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    usage_date = Column(Date, nullable=False, unique=True)
    total_calls = Column(Integer, default=0)
    total_input_tokens = Column(Integer, default=0)
    total_output_tokens = Column(Integer, default=0)
    total_cost_usd = Column(Numeric(10, 6), default=0)
    rule_fallback_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AICostUsageMonthly(Base):
    """월간 AI 비용 추적"""
    __tablename__ = "ai_cost_usage_monthly"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    usage_month = Column(Date, nullable=False, unique=True)
    total_calls = Column(Integer, default=0)
    total_cost_usd = Column(Numeric(10, 6), default=0)
    budget_limit_usd = Column(Numeric(10, 2), default=30)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TrainingBehaviorSnapshot(Base):
    """훈련 행동 스냅샷"""
    __tablename__ = "training_behavior_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False)
    curriculum_id = Column(String(50), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    total_logs = Column(Integer, default=0)
    avg_intensity = Column(Numeric(4, 2), default=0)
    log_frequency_per_week = Column(Numeric(4, 2), default=0)
    trigger_distribution = Column(JSONB, default={})
    hourly_distribution = Column(JSONB, default={})
    weekly_distribution = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_behavior_snapshot_user_dog_curriculum", "user_id", "dog_id", "curriculum_id"),
    )


# ──────────────────────────────────────
# B2B 모델 (SCHEMA-B2B.md 10테이블, FE b2b.ts 미러)
# ──────────────────────────────────────

class Organization(Base):
    """조직(센터) — FE b2b.ts Organization 미러"""
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    type = Column(Enum(OrgType, name="org_type"), nullable=False)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    logo_url = Column(Text)
    business_number = Column(String(20), unique=True)
    phone = Column(String(20))
    address = Column(Text)
    max_dogs = Column(Integer, default=30)
    max_staff = Column(Integer, default=5)
    settings = Column(JSONB, default={})
    status = Column(Enum(OrgStatus, name="org_status"), default=OrgStatus.TRIAL)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members = relationship("OrgMember", back_populates="organization", cascade="all, delete-orphan")
    org_dogs = relationship("OrgDog", back_populates="organization", cascade="all, delete-orphan")


class OrgMember(Base):
    """조직 멤버 — FE b2b.ts OrgMember 미러"""
    __tablename__ = "org_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(OrgMemberRole, name="org_member_role"), nullable=False)
    status = Column(Enum(OrgMemberStatus, name="org_member_status"), default=OrgMemberStatus.PENDING)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("org_id", "user_id", name="uq_org_member"),
    )

    organization = relationship("Organization", back_populates="members")


class OrgDog(Base):
    """조직 소속 강아지 — FE b2b.ts OrgDog 미러"""
    __tablename__ = "org_dogs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    parent_name = Column(String(100))
    group_tag = Column(String(50), default="default")
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    discharged_at = Column(DateTime(timezone=True))
    status = Column(Enum(OrgDogStatus, name="org_dog_status"), default=OrgDogStatus.ACTIVE)

    organization = relationship("Organization", back_populates="org_dogs")


class DogAssignment(Base):
    """담당자 배정 — FE b2b.ts DogAssignment 미러"""
    __tablename__ = "dog_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    trainer_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(DogAssignmentRole, name="dog_assignment_role"), default=DogAssignmentRole.PRIMARY)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    status = Column(Enum(DogAssignmentStatus, name="dog_assignment_status"), default=DogAssignmentStatus.ACTIVE)


class DailyReport(Base):
    """일일 리포트 — FE b2b.ts DailyReport 미러"""
    __tablename__ = "daily_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False, index=True)
    report_date = Column(Date, nullable=False)
    template_type = Column(Enum(ReportTemplateType, name="report_template_type"), nullable=False)
    # Split FK (XOR — 정확히 하나만 non-null)
    created_by_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"))
    created_by_trainer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    # AI 콘텐츠
    behavior_summary = Column(Text)
    condition_notes = Column(Text)
    ai_coaching_oneliner = Column(Text)
    seven_day_comparison = Column(JSONB)
    highlight_photo_urls = Column(JSONB, default=[])
    # 상태
    generation_status = Column(Enum(DailyReportStatus, name="daily_report_status"), default=DailyReportStatus.PENDING)
    ai_model = Column(String(50))
    ai_cost_usd = Column(Numeric(10, 6))
    generated_at = Column(DateTime(timezone=True))
    scheduled_send_at = Column(DateTime(timezone=True))
    sent_at = Column(DateTime(timezone=True))
    # 보호자 접근
    share_token = Column(String(255), unique=True)
    toss_share_url = Column(Text)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "(created_by_org_id IS NOT NULL AND created_by_trainer_id IS NULL) OR "
            "(created_by_org_id IS NULL AND created_by_trainer_id IS NOT NULL)",
            name="ck_report_creator_xor",
        ),
    )

    interactions = relationship("ParentInteraction", back_populates="report", cascade="all, delete-orphan")


class ParentInteraction(Base):
    """보호자 인터랙션 — FE b2b.ts ParentInteraction 미러"""
    __tablename__ = "parent_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    parent_identifier = Column(String(255))
    interaction_type = Column(Enum(InteractionType, name="interaction_type"), nullable=False)
    content = Column(Text)
    linked_log_id = Column(UUID(as_uuid=True), ForeignKey("behavior_logs.id", ondelete="SET NULL"))
    staff_response = Column(Text)
    responded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    responded_at = Column(DateTime(timezone=True))
    read_by_staff = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("DailyReport", back_populates="interactions")


class OrgAnalyticsDaily(Base):
    """조직 일일 통계 — FE b2b.ts OrgAnalyticsDaily 미러"""
    __tablename__ = "org_analytics_daily"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analytics_date = Column(Date, nullable=False)
    group_tag = Column(String(50))
    total_dogs = Column(Integer, default=0)
    avg_activity_score = Column(Numeric(4, 2), default=0)
    aggression_incident_count = Column(Integer, default=0)
    total_behavior_logs = Column(Integer, default=0)
    report_open_rate = Column(Numeric(3, 2), default=0)
    reaction_rate = Column(Numeric(3, 2), default=0)
    question_count = Column(Integer, default=0)
    record_completion_rate = Column(Numeric(3, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("org_id", "analytics_date", "group_tag", name="uq_org_analytics_daily"),
    )


class OrgSubscription(Base):
    """B2B 구독 — FE b2b.ts OrgSubscription 미러"""
    __tablename__ = "org_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    trainer_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    plan_type = Column(Enum(OrgPlanType, name="org_plan_type"), nullable=False)
    toss_order_id = Column(String(255))
    price_krw = Column(Integer, nullable=False)
    max_dogs = Column(Integer, nullable=False)
    max_staff = Column(Integer, default=1)
    billing_cycle = Column(String(20), default="monthly")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    refunded_at = Column(DateTime(timezone=True))
    suspend_reason = Column(Text)
    retry_count = Column(Integer, default=0)
    status = Column(Enum(OrgSubscriptionStatus, name="org_subscription_status"), default=OrgSubscriptionStatus.TRIAL)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "(org_id IS NOT NULL AND trainer_user_id IS NULL) OR "
            "(org_id IS NULL AND trainer_user_id IS NOT NULL)",
            name="ck_org_subscription_xor",
        ),
    )


class AiCostUsageOrg(Base):
    """조직/훈련사 AI 비용 — FE b2b.ts AiCostUsageOrg 미러"""
    __tablename__ = "ai_cost_usage_org"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    trainer_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    usage_date = Column(Date, nullable=False)
    report_generation_calls = Column(Integer, default=0)
    report_generation_cost_usd = Column(Numeric(10, 6), default=0)
    coaching_calls = Column(Integer, default=0)
    coaching_cost_usd = Column(Numeric(10, 6), default=0)
    budget_limit_usd = Column(Numeric(10, 2))

    __table_args__ = (
        CheckConstraint(
            "(org_id IS NOT NULL AND trainer_user_id IS NULL) OR "
            "(org_id IS NULL AND trainer_user_id IS NOT NULL)",
            name="ck_ai_cost_org_xor",
        ),
    )


class OrgDogPii(Base):
    """보호자 PII 격리 — FE b2b.ts OrgDogPii 미러 (SECURITY DEFINER RPC 전용)"""
    __tablename__ = "org_dogs_pii"

    org_dog_id = Column(UUID(as_uuid=True), ForeignKey("org_dogs.id", ondelete="CASCADE"), primary_key=True)
    parent_phone_enc = Column(LargeBinary)
    parent_email_enc = Column(LargeBinary)
    encryption_key_version = Column(Integer, default=1)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# Edge Function 멱등성 요청 테이블 (supabase/functions/_shared/ 참조)

class CoachingTrainingBatch(Base):
    """Fine-tuning 배치 버전 관리"""
    __tablename__ = "coaching_training_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    batch_name = Column(String, nullable=False)
    record_count = Column(Integer, default=0)
    jsonl_path = Column(String, nullable=True)
    finetune_job_id = Column(String, nullable=True)
    model_id = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending → training → deployed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deployed_at = Column(DateTime(timezone=True), nullable=True)


class CoachingSyntheticLog(Base):
    """합성 데이터 생성 진행 추적 (중복 방지)"""
    __tablename__ = "coaching_synthetic_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    run_date = Column(Date, nullable=False)
    category = Column(String, nullable=False)
    generated_count = Column(Integer, default=0)
    coaching_ids = Column(JSONB, nullable=True)  # UUID 목록
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EdgeFunctionRequest(Base):
    """Edge Function 멱등성 추적"""
    __tablename__ = "edge_function_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    idempotency_key = Column(String(255), unique=True, nullable=False)
    function_name = Column(String(100), nullable=False)
    status = Column(String(50), default="processing")
    result = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CoachingQuestion(Base):
    """AI 코치 1:1 질문 — Pro 전용, 횟수 정책 TBD"""
    __tablename__ = "coaching_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dog_id = Column(UUID(as_uuid=True), ForeignKey("dogs.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    context = Column(Text)
    answer = Column(Text, nullable=False)
    billing_period = Column(String(7))  # 'YYYY-MM', 횟수 제한 정책 확정 시 활용
    ai_tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_cq_user_dog", "user_id", "dog_id", "created_at"),
    )
