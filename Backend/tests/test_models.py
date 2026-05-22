"""
SQLAlchemy 모델 정합성 테스트 — 27 모델 + 22 enum 검증
"""
from app.shared.models import (
    AICoaching,
    AICostUsageDaily,
    AICostUsageMonthly,
    AIRecommendationFeedback,
    AIRecommendationSnapshot,
    ActionTracker,
    Base,
    BehaviorLog,
    CaseIntake,
    CoachingSyntheticLog,
    DailyReport,
    Dog,
    DogAssignment,
    DogEnv,
    EdgeFunctionRequest,
    LogSummary,
    MediaAsset,
    NotiHistory,
    OrgAnalyticsDaily,
    OrgDog,
    OrgDogPii,
    OrgMember,
    OrgSubscription,
    Organization,
    ParentInteraction,
    Subscription,
    TossOrder,
    TrainingBehaviorSnapshot,
    User,
    UserEntitlement,
    UserSettings,
    UserTrainingStatus,
    AiCostUsageOrg,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID


def test_table_count():
    """총 테이블 수 27+ 확인"""
    tables = Base.metadata.tables
    assert len(tables) >= 27, f"Expected 27+ tables, got {len(tables)}: {list(tables.keys())}"


def test_b2c_tables_exist():
    """B2C 핵심 17테이블 존재"""
    tables = Base.metadata.tables
    b2c_expected = [
        "users", "subscriptions", "dogs", "dog_env", "behavior_logs",
        "media_assets", "ai_coaching", "action_tracker", "noti_history",
        "user_settings", "user_training_status", "toss_orders",
        "ai_recommendation_snapshots", "ai_recommendation_feedback",
        "ai_cost_usage_daily", "ai_cost_usage_monthly",
        "training_behavior_snapshots",
        "user_entitlements",
    ]
    for name in b2c_expected:
        assert name in tables, f"Missing B2C table: {name}"


def test_b2b_tables_exist():
    """B2B 확장 10테이블 존재"""
    tables = Base.metadata.tables
    b2b_expected = [
        "organizations", "org_members", "org_dogs", "dog_assignments",
        "daily_reports", "parent_interactions", "org_analytics_daily",
        "org_subscriptions", "ai_cost_usage_org", "org_dogs_pii",
    ]
    for name in b2b_expected:
        assert name in tables, f"Missing B2B table: {name}"


def test_user_model_fields():
    """User 모델 FE auth.ts 필드 매핑"""
    columns = {c.name for c in User.__table__.columns}
    expected = {"id", "toss_user_key", "role", "status", "pepper_version",
                "timezone", "last_login_at", "provider", "created_at", "updated_at"}
    assert expected.issubset(columns), f"Missing User fields: {expected - columns}"


def test_dog_model_fields():
    """Dog 모델 FE dog.ts 필드 매핑"""
    columns = {c.name for c in Dog.__table__.columns}
    expected = {"id", "user_id", "name", "breed", "birth_date", "sex",
                "weight_kg", "profile_image_url", "created_at", "updated_at"}
    assert expected.issubset(columns), f"Missing Dog fields: {expected - columns}"


def test_behavior_log_b2b_extension():
    """BehaviorLog에 B2B 확장 필드 (org_id, recorded_by)"""
    columns = {c.name for c in BehaviorLog.__table__.columns}
    assert "org_id" in columns
    assert "recorded_by" in columns


def test_org_dog_parent_phone_last4_field():
    """OrgDog 보호자 인증용 전화번호 뒷4자리 필드"""
    columns = {c.name for c in OrgDog.__table__.columns}
    assert "parent_phone_last4" in columns


def test_case_intake_model_fields():
    """Pro 상담지 저장 테이블 필드"""
    assert "case_intakes" in Base.metadata.tables
    columns = {c.name for c in CaseIntake.__table__.columns}
    expected = {
        "id", "dog_id", "author_user_id", "author_role", "source_context",
        "status", "version", "sections", "behavior_episodes", "created_at", "updated_at",
    }
    assert expected.issubset(columns), f"Missing CaseIntake fields: {expected - columns}"


def test_user_entitlement_model_fields():
    """contactsViral PRO 1일권 entitlement 모델 필드."""
    columns = {c.name for c in UserEntitlement.__table__.columns}
    expected = {
        "id", "user_id", "type", "source", "source_module_id",
        "starts_at", "expires_at", "metadata", "created_at", "updated_at",
    }
    assert expected.issubset(columns), f"Missing UserEntitlement fields: {expected - columns}"
    assert isinstance(UserEntitlement.__table__.columns["metadata"].type, JSONB)


def test_coaching_synthetic_log_ids_match_uuid_array_migration():
    """coaching_synthetic_log.coaching_ids는 DB migration의 UUID[]와 일치해야 한다."""
    column_type = CoachingSyntheticLog.__table__.columns["coaching_ids"].type
    assert isinstance(column_type, ARRAY)
    assert isinstance(column_type.item_type, UUID)


def test_daily_report_xor_constraint():
    """DailyReport XOR CHECK 제약 조건"""
    constraints = DailyReport.__table__.constraints
    check_names = [c.name for c in constraints if hasattr(c, "name") and c.name]
    assert "ck_report_creator_xor" in check_names


def test_org_subscription_xor_constraint():
    """OrgSubscription XOR CHECK 제약 조건"""
    constraints = OrgSubscription.__table__.constraints
    check_names = [c.name for c in constraints if hasattr(c, "name") and c.name]
    assert "ck_org_subscription_xor" in check_names


def test_behavior_log_daily_activity_is_jsonb():
    """daily_activity 컬럼이 JSONB 타입인지 확인 — String(50) 회귀 방지 (Wave3-Bug fix)"""
    col = BehaviorLog.__table__.columns["daily_activity"]
    assert isinstance(col.type, JSONB), (
        f"daily_activity must be JSONB, got {type(col.type).__name__}. "
        "String(50)으로 되돌리면 DB DatatypeMismatchError 발생함."
    )


def test_enums_count():
    """22개 enum 클래스 존재"""
    from app.shared import models
    import enum
    enums = [
        name for name, obj in vars(models).items()
        if isinstance(obj, type) and issubclass(obj, enum.Enum) and obj is not enum.Enum
    ]
    assert len(enums) >= 22, f"Expected 22+ enums, got {len(enums)}: {enums}"
