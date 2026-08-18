from __future__ import annotations

import re
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "supabase" / "migrations"
SUPABASE_CONFIG = ROOT / "supabase" / "config.toml"


def _all_migrations_sql() -> str:
    return "\n".join(path.read_text(encoding="utf-8") for path in sorted(MIGRATIONS.glob("*.sql")))


def _compact(sql: str) -> str:
    return re.sub(r"\s+", " ", sql).lower()


def _assert_internal_jwt_verification(source: str, function_name: str) -> None:
    assert "/auth/v1/user" in source
    assert "req.headers.get('Authorization')" in source
    assert "authHeader?.startsWith('Bearer ')" in source
    assert "Authorization: `Bearer ${jwt}`" in source
    assert "apikey: serviceRoleKey" in source
    assert "req.headers.get('x-user-role')" not in source
    assert 'req.headers.get("x-user-role")' not in source

    if function_name == "assign-b2b-role":
        assert "body.userId" not in source
        assert "const owner = await verifyJwtOwner" in source
        assert "/auth/v1/admin/users/${owner.userId}" in source
        assert "/rest/v1/users?id=eq.${owner.userId}" in source

    if function_name == "withdraw-user":
        assert "const verified = await verifyJwtOwner" in source
        assert "const userId = parsed?.userId" in source
        assert "verified.userId !== userId" in source


def test_service_role_only_edge_functions_require_gateway_jwt() -> None:
    config = tomllib.loads(SUPABASE_CONFIG.read_text(encoding="utf-8"))
    functions = config["functions"]

    service_role_only = {
        "process-referral",
        "process-point-events",
        "seed-case-study",
        "render-case-chart",
        "seed-threads-from-blog",
        "publish-to-threads",
        "publish-to-instagram",
        "collect-social-insights",
        "generate-karrot-caption",
    }

    missing = service_role_only - functions.keys()
    assert not missing

    for function_name in service_role_only:
        assert functions[function_name]["verify_jwt"] is True


def test_verify_jwt_false_edge_functions_have_explicit_auth_boundary() -> None:
    config = tomllib.loads(SUPABASE_CONFIG.read_text(encoding="utf-8"))
    functions = config["functions"]

    public_exceptions = {"legal", "login-with-toss", "toss-disconnect"}
    verify_jwt_false = {
        name
        for name, settings in functions.items()
        if settings.get("verify_jwt") is False
    }
    protected = verify_jwt_false - public_exceptions

    assert {"verify-iap-order", "assign-b2b-role", "withdraw-user"}.issubset(protected)

    for function_name in protected:
        entrypoint = functions[function_name]["entrypoint"].replace("./", "")
        source = (ROOT / "supabase" / entrypoint).read_text(encoding="utf-8")
        if function_name == "verify-iap-order":
            assert "/auth/v1/user" in source
            assert "const token = readBearerToken(request)" in source
            assert "verifyJwtViaAuth(token)" in source
            assert "Authorization: `Bearer ${token}`" in source
            assert "isTrustedServiceRoleToken(token, SUPABASE_SERVICE_ROLE_KEY)" in source
            assert "bodyUserId: body.userId" in source
            assert "authUserId: resolvedUserId" in source
            assert "request.headers.get('x-user-role')" not in source
            assert 'request.headers.get("x-user-role")' not in source
        else:
            _assert_internal_jwt_verification(source, function_name)

    login_source = (ROOT / "supabase/functions/login-with-toss/index.ts").read_text(encoding="utf-8")
    login_tests = (ROOT / "supabase/functions/__tests__/login-with-toss.test.ts").read_text(
        encoding="utf-8"
    )
    assert "exchangeAuthorizationCode" in login_source
    login_handler = login_source[login_source.index("export function createLoginWithTossHandler"):]
    assert login_handler.index("await rememberConsumedAuthCode") < login_handler.index("const profile = await deps.mTLSClient.fetchLoginProfile")
    assert login_handler.index("await rememberConsumedAuthCode") < login_handler.index("const bridgeSession = await deps.bridgeSession")
    assert "marks auth code consumed immediately after Toss exchange succeeds even if bridge session fails" in login_tests

    disconnect_source = (ROOT / "supabase/functions/toss-disconnect/index.ts").read_text(encoding="utf-8")
    disconnect_tests = (ROOT / "supabase/functions/__tests__/toss-disconnect.test.ts").read_text(
        encoding="utf-8"
    )
    assert "verifyBasicAuth(authHeader, deps)" in disconnect_source
    assert "TOSS_CALLBACK_AUTH_ID" in disconnect_source
    assert "TOSS_CALLBACK_AUTH_PW" in disconnect_source
    assert "Disconnect processing failed" in disconnect_source
    assert "rejects missing Basic Auth before any service-role request" in disconnect_tests
    assert "rejects invalid Basic Auth before touching Supabase" in disconnect_tests
    assert "does not expose upstream Supabase errors in the HTTP response" in disconnect_tests


def test_edge_context_does_not_trust_user_metadata_for_roles() -> None:
    """AUTH-001: user-controlled metadata must not grant staff/service Edge privileges."""
    source = (ROOT / "supabase/functions/_shared/httpAdapter.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/httpAdapter.test.ts").read_text(encoding="utf-8")
    resolver_section = source[
        source.index("function resolveRoleFromJwt"):
        source.index("export function buildEdgeContext")
    ]

    assert "claims.app_metadata?.user_role" in resolver_section
    assert "claims.app_metadata?.role" in resolver_section
    assert "claims.user_metadata" not in resolver_section
    assert "does not trust user_metadata role claims for Edge authorization" in tests
    assert "does not let role headers override lower-privilege JWT claims" in tests


def test_role_protected_edge_entrypoints_use_jwt_context_not_role_headers() -> None:
    """AUTH-001: protected Edge entrypoints must derive role/user from JWT context only."""
    protected = {
        "grant-toss-points": "supabase/functions/grant-toss-points/main.ts",
        "send-smart-message": "supabase/functions/send-smart-message/main.ts",
        "generate-report": "supabase/functions/generate-report/index.ts",
    }

    for function_name, relative_path in protected.items():
        source = (ROOT / relative_path).read_text(encoding="utf-8")
        assert "buildEdgeContext(request)" in source, function_name
        assert "request.headers.get('x-user-role')" not in source, function_name
        assert 'request.headers.get("x-user-role")' not in source, function_name
        assert "headers.get('x-user-role')" not in source, function_name
        assert 'headers.get("x-user-role")' not in source, function_name

    config = tomllib.loads(SUPABASE_CONFIG.read_text(encoding="utf-8"))
    functions = config["functions"]
    assert functions["grant-toss-points"]["verify_jwt"] is True
    assert functions["send-smart-message"]["verify_jwt"] is True
    assert functions["generate-report"]["verify_jwt"] is True


def test_assign_b2b_role_is_bound_to_verified_jwt_user() -> None:
    """AUTH-001/B2B-001: B2B self-join must not become arbitrary user or role assignment."""
    source = (ROOT / "supabase/functions/assign-b2b-role/index.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/assign-b2b-role.test.ts").read_text(
        encoding="utf-8"
    )

    assert "const ALLOWED_SELF_ROLES = ['org_owner', 'trainer'] as const;" in source
    assert "verifyJwtOwner(authHeader, supabaseUrl, serviceRoleKey, deps.fetchFn)" in source
    assert "const body = await req.json().catch(() => ({})) as { role?: string };" in source
    assert "userId" not in source[source.index("const body = await req.json()"): source.index("// 1. auth.users")]
    assert "/auth/v1/admin/users/${owner.userId}" in source
    assert "/rest/v1/users?id=eq.${owner.userId}" in source
    assert "service_role" not in source[source.index("const ALLOWED_SELF_ROLES"): source.index("export interface")]

    assert "rejects forged or invalid JWT before updating roles" in tests
    assert "rejects roles outside the self-service allowlist" in tests
    assert "updates only the internally verified user even when body userId and role header are spoofed" in tests


def test_grant_toss_points_is_service_role_only() -> None:
    """AUTH-001/AD-001: client-callable staff roles must not mint arbitrary Toss points."""
    source = (ROOT / "supabase/functions/grant-toss-points/index.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/grant-toss-points.test.ts").read_text(
        encoding="utf-8"
    )
    process_source = (ROOT / "supabase/functions/process-point-events/index.ts").read_text(
        encoding="utf-8"
    )
    process_tests = (ROOT / "supabase/functions/__tests__/process-point-events.test.ts").read_text(
        encoding="utf-8"
    )

    assert "function isServiceRole" in source
    assert "role === 'service_role'" in source
    assert "Only service_role can grant toss points" in source
    assert "role === 'trainer'" not in source
    assert "role === 'org_owner'" not in source
    assert "role === 'org_staff'" not in source
    assert "const UUID_PATTERN" in source
    assert "const POINT_EVENT_IDEMPOTENCY_PATTERN" in source
    assert "const ALLOWED_REASON_CODES" in source
    assert "function isValidGrantRequest" in source
    assert "approved point_events" in source
    assert "request.points <= 5000" in source
    assert "replays completed idempotency responses without a second Toss grant" in tests
    assert "prevents reusing a Toss grant key for a different idempotency key" in tests
    assert "rejects same idempotency key when the %s" in tests
    assert "point amount changes" in tests
    assert "approved reason code changes" in tests
    assert "rejects %s before requesting a grant key" in tests
    assert "non-uuid userId" in tests
    assert "non-event idempotency key" in tests
    assert "unapproved reason code" in tests
    assert "ad reward reason code" in tests

    assert "context.role !== 'service_role'" in process_source
    assert "point-event-${ev.id}" in process_source
    assert "const ALLOWED_POINT_EVENTS" in process_source
    assert "function isValidPointEvent" in process_source
    assert "isUuid(ev.source_id)" in process_source
    assert "toss_error_code: 'INVALID_POINT_EVENT'" in process_source
    assert "const MAX_POINTS_PER_EVENT = 5000" in process_source
    assert "function resolveBatchSize" in process_source
    assert "rejects non-service roles before polling the queue" in process_tests
    assert "uses event idempotency keys when granting points" in process_tests
    assert "rejects invalid point events before grant" in process_tests
    assert "ad reward event cannot mint points" in process_tests
    assert "missing source id" in process_tests

    source_id_migration = (
        MIGRATIONS / "20260601001700_require_point_event_source_id.sql"
    ).read_text(encoding="utf-8")
    assert "point_events_source_id_required" in source_id_migration
    assert "CHECK (source_id IS NOT NULL) NOT VALID" in source_id_migration
    assert "clamps batchSize before polling the queue" in process_tests


def test_point_event_producers_match_drainer_allowlist() -> None:
    """AD-001/GROWTH-001/IAP-001: DB-produced point events must match the drainer allowlist."""
    process_source = (ROOT / "supabase/functions/process-point-events/index.ts").read_text(
        encoding="utf-8"
    )
    referral_migration = (MIGRATIONS / "20260522000500_referrals.sql").read_text(
        encoding="utf-8"
    )
    point_migration = (
        MIGRATIONS / "20260523000100_point_events_and_transactions.sql"
    ).read_text(encoding="utf-8")
    alignment_migration = (
        MIGRATIONS / "20260601001500_align_point_event_allowlist.sql"
    ).read_text(encoding="utf-8")

    allowed_pairs = [
        ("referral_granted", "referral_reward"),
        ("first_coaching_created", "first_coaching_bonus"),
        ("signup_completed", "signup_bonus"),
    ]

    for event_type, reason_code in allowed_pairs:
        assert f"['{event_type}', new Set(['{reason_code}'])]" in process_source
        assert f"'{event_type}'" in alignment_migration
        assert f"'{reason_code}'" in alignment_migration

    for source in [referral_migration, point_migration, alignment_migration]:
        assert "referral_success" not in source
        assert "'first_coaching', NEW.id" not in source
        assert "VALUES (NEW.id, 'signup_bonus'" not in source

    assert "VALUES (NEW.user_id, 'first_coaching_created', NEW.id, 500, 'first_coaching_bonus')" in (
        point_migration + alignment_migration
    )
    assert "VALUES (NEW.id, 'signup_completed', NEW.id, 100, 'signup_bonus')" in (
        point_migration + alignment_migration
    )


def test_send_smart_message_rejects_spoofed_roles_and_dynamic_variables() -> None:
    """AUTH-001/MSG-001: Smart Message sends must not trust spoofed roles or ad-hoc PII variables."""
    source = (ROOT / "supabase/functions/send-smart-message/index.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/send-smart-message.test.ts").read_text(
        encoding="utf-8"
    )
    frontend = (ROOT / "src/lib/api/notification.ts").read_text(encoding="utf-8")
    send_section = frontend[
        frontend.index("export async function sendSmartMessage"):
        frontend.index("interface BackendNotificationRow")
    ]

    assert "function isAdminRole" in source
    assert "role === 'trainer'" in source
    assert "role === 'org_owner'" in source
    assert "role === 'org_staff'" in source
    assert "role === 'service_role'" in source
    assert "function canSendToTarget" in source
    assert "context.userId && context.userId === userId" in source
    assert "const UUID_PATTERN" in source
    assert "function isUuid" in source
    assert "userId must be a UUID" in source
    assert "function hasDynamicVariables" in source
    assert "const APPROVED_TEMPLATE_CODES" in source
    assert "function isApprovedTemplateCode" in source
    assert "Smart Message templateCode must match an approved notification type" in source
    assert "Smart Message templates must use approved static text only" in source
    assert "buildSmartMessageRequestFingerprint" in source
    assert "IDEMPOTENCY_KEY_CONFLICT" in source
    assert "evaluateNotificationPreference" in source
    assert "MARKETING_CONSENT_REQUIRED" in source
    assert "evaluateCooldown" in source

    assert "ignores x-user-role spoofing before resolving recipients or sending" in tests
    assert "does not grant send permission from user_metadata role claims" in tests
    assert "rejects staff role when body userId targets a different user" in tests
    assert "rejects malformed userId before resolving recipients or sending" in tests
    assert "rejects dynamic template variables before resolving recipients or sending" in tests
    assert "rejects unapproved template codes before preference lookup or sending" in tests
    assert "replays successful idempotency response without sending twice" in tests
    assert "rejects same idempotency key when the message target changes" in tests
    assert "rejects same idempotency key when the approved message template changes" in tests
    assert "blocks promo sends when marketing consent is missing" in tests

    assert "variables:" not in send_section


def test_core_tables_have_rls_enabled_in_migrations() -> None:
    sql = _compact(_all_migrations_sql())

    for table in [
        "dogs",
        "dog_env",
        "behavior_logs",
        "training_step_attempts",
        "case_intakes",
        "user_training_status",
        "training_behavior_snapshots",
        "ai_recommendation_snapshots",
        "ai_recommendation_feedback",
        "ai_coaching",
        "action_tracker",
        "coaching_generation_jobs",
        "subscriptions",
        "org_subscriptions",
        "toss_orders",
        "organizations",
        "org_members",
        "org_dogs",
        "dog_assignments",
        "daily_reports",
        "org_analytics_daily",
        "ai_cost_usage_org",
        "media_assets",
        "org_dogs_pii",
        "user_entitlements",
        "user_settings",
    ]:
        assert (
            f"alter table public.{table} enable row level security" in sql
            or f"alter table {table} enable row level security" in sql
        )


def test_live_rls_probe_tables_are_covered_by_local_source_scan() -> None:
    """SEC-RLS: full live audit must guard local RLS policy drift before fixture-based probes."""
    script = (ROOT / "scripts/live-security-audit.js").read_text(encoding="utf-8")

    for table in [
        "dogs",
        "dog_env",
        "behavior_logs",
        "training_step_attempts",
        "case_intakes",
        "user_training_status",
        "training_behavior_snapshots",
        "ai_recommendation_snapshots",
        "ai_recommendation_feedback",
        "ai_coaching",
        "action_tracker",
        "coaching_generation_jobs",
        "subscriptions",
        "user_entitlements",
        "user_settings",
        "toss_orders",
        "organizations",
        "org_members",
        "org_dogs",
        "dog_assignments",
        "org_subscriptions",
        "media_assets",
        "daily_reports",
    ]:
        assert f"'{table}'" in script

    for marker in [
        "function auditLocalRlsPolicySource()",
        "Missing local RLS enable statements for",
        "assertServiceOnlyTable(allSql, table)",
        "exposes direct ${role} RLS access",
        "subscriptions latest lock migration still contains",
        "toss_orders latest lock migration still contains",
        "org_dogs latest policy regressed to broad is_org_member access",
        "collectAuditFailure('local RLS policy source scan'",
    ]:
        assert marker in script


def test_b2c_owner_boundaries_are_bound_to_auth_uid() -> None:
    sql = _compact(_all_migrations_sql())

    assert "create policy \"users read own dogs\"" in sql
    assert "(select auth.uid()) = user_id" in sql or "auth.uid() = user_id" in sql

    assert "create policy \"users read own subscriptions\"" in sql
    assert "create policy \"toss_orders_user_select\"" in sql
    assert "user_id = (select auth.uid())" in sql or "user_id = auth.uid()" in sql


def test_dogs_and_dog_env_writes_are_owner_bound() -> None:
    """AUTH-001/RLS: dog profile/env updates and deletes must stay bound to the owner."""
    migration = (MIGRATIONS / "20260228124500_dogs_and_dog_env_rls_write_policies.sql").read_text(
        encoding="utf-8"
    )
    init_migration = (MIGRATIONS / "20260420000000_toss_project_init.sql").read_text(
        encoding="utf-8"
    )
    sql = _compact(migration + "\n" + init_migration)
    service = (ROOT / "Backend/app/features/dogs/service.py").read_text(encoding="utf-8")
    router = (ROOT / "Backend/app/features/dogs/router.py").read_text(encoding="utf-8")
    frontend = (ROOT / "src/lib/api/dog.ts").read_text(encoding="utf-8")

    assert "create policy \"users update own dogs\"" in sql
    assert "on public.dogs for update to public" in sql
    assert "using ((select auth.uid()) = user_id)" in sql
    assert "with check ((select auth.uid()) = user_id)" in sql
    assert "create policy \"users delete own dogs\"" in sql
    assert "on public.dogs for delete to public" in sql

    assert "create policy \"users update own dog env\"" in sql
    assert "on public.dog_env for update to public" in sql
    assert "d.id = dog_env.dog_id" in sql
    assert "d.user_id = (select auth.uid())" in sql
    assert "create policy \"users delete own dog env\"" in sql
    assert "on public.dog_env for delete to public" in sql

    update_section = service[
        service.index("async def update_dog_profile"):
        service.index("async def delete_dog")
    ]
    delete_section = service[service.index("async def delete_dog"):]
    assert "dog = await verify_dog_ownership(db, dog_id, user_id=user_id)" in update_section
    assert "setattr(dog, field, value)" in update_section
    assert update_section.index("verify_dog_ownership") < update_section.index("setattr(dog, field, value)")
    assert "dog = await verify_dog_ownership(db, dog_id, user_id=user_id)" in delete_section
    assert delete_section.index("verify_dog_ownership") < delete_section.index("await db.delete(dog)")

    assert "user_id: str = Depends(get_current_user_id)" in router
    assert "return await service.update_dog_profile(db, user_id, dog_id, data)" in router
    assert "await service.delete_dog(db, user_id, dog_id)" in router
    assert ".from('dogs')" not in frontend
    assert '.from("dogs")' not in frontend
    assert ".from('dog_env')" not in frontend
    assert '.from("dog_env")' not in frontend


def test_b2b_analytics_and_ai_cost_usage_are_read_scoped_only() -> None:
    """B2B-001/AUTH-001: B2B metrics and cost rows must not be writable or cross-org readable."""
    migration = (
        MIGRATIONS / "20260601001000_lock_b2b_analytics_and_ai_cost_rls.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)
    org_analytics_sql = sql[
        sql.index("drop policy if exists \"org_analytics_select\""):
        sql.index("drop policy if exists \"ai_cost_usage_org_select\"")
    ]
    ai_cost_sql = sql[
        sql.index("drop policy if exists \"ai_cost_usage_org_select\""):
    ]

    assert "drop policy if exists \"org_analytics_insert\"" in org_analytics_sql
    assert "drop policy if exists \"org_analytics_update\"" in org_analytics_sql
    assert "drop policy if exists \"org_analytics_delete\"" in org_analytics_sql
    assert "create policy \"org_analytics_select\"" in org_analytics_sql
    assert "public.is_org_member_with_role(org_id, array['owner','manager','staff'])" in org_analytics_sql
    assert "for insert to public" not in org_analytics_sql
    assert "for update to public" not in org_analytics_sql
    assert "for delete to public" not in org_analytics_sql

    assert "drop policy if exists \"ai_cost_usage_org_insert\"" in ai_cost_sql
    assert "drop policy if exists \"ai_cost_usage_org_update\"" in ai_cost_sql
    assert "drop policy if exists \"ai_cost_usage_org_delete\"" in ai_cost_sql
    assert "create policy \"ai_cost_usage_org_select\"" in ai_cost_sql
    assert "public.is_org_member_with_role(org_id, array['owner','manager'])" in ai_cost_sql
    assert "trainer_user_id = (select auth.uid())" in ai_cost_sql
    assert "for insert to public" not in ai_cost_sql
    assert "for update to public" not in ai_cost_sql
    assert "for delete to public" not in ai_cost_sql

    direct_frontend_access = []
    for path in (ROOT / "src").rglob("*.ts*"):
        if "__tests__" in str(path):
            continue
        source = path.read_text(encoding="utf-8")
        for table in ["org_analytics_daily", "ai_cost_usage_org"]:
            if f".from('{table}')" in source or f'.from("{table}")' in source:
                direct_frontend_access.append(f"{path.relative_to(ROOT)}:{table}")
    assert direct_frontend_access == []


def test_coaching_generation_jobs_are_bound_to_owned_dogs() -> None:
    """AUTH-001/AI-001: direct async coaching job writes must require owned dog_id."""
    migration = (
        MIGRATIONS / "20260601000900_lock_generation_jobs_and_org_subscriptions_rls.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)

    assert "drop policy if exists \"coaching_generation_jobs_owner_insert\"" in sql
    assert "drop policy if exists \"coaching_generation_jobs_owner_update\"" in sql
    assert "create policy \"coaching_generation_jobs_owner_select\"" in sql
    assert "create policy \"coaching_generation_jobs_owner_insert\"" in sql
    assert "create policy \"coaching_generation_jobs_owner_update\"" in sql
    assert "user_id = (select auth.uid())" in sql
    assert "from public.dogs d" in sql
    assert "d.id = coaching_generation_jobs.dog_id" in sql
    assert "d.user_id = (select auth.uid())" in sql
    assert "with check" in sql


def test_dashboard_explicit_dog_id_is_owner_checked() -> None:
    """AUTH-001: dashboard dog_id query parameter must not expose another user's dog."""
    source = (ROOT / "Backend/app/features/dashboard/router.py").read_text(encoding="utf-8")
    tests = (ROOT / "Backend/tests/test_dashboard_service.py").read_text(encoding="utf-8")

    explicit_branch = source[
        source.index("if dog_id:"):
        source.index("stmt = (")
    ]

    assert "from app.shared.utils.ownership import verify_dog_ownership" in source
    assert "await verify_dog_ownership(db, dog_id, user_id=user_id)" in explicit_branch
    assert "test_dashboard_explicit_dog_id_requires_ownership_check" in tests


def test_toss_orders_client_writes_are_locked_to_service_role() -> None:
    """IAP-001: clients may read own orders but cannot forge/update the payment ledger."""
    migration = (
        MIGRATIONS / "20260601000400_lock_toss_orders_client_writes.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)

    assert "drop policy if exists \"toss_orders_user_insert\"" in sql
    assert "drop policy if exists \"toss_orders_user_update\"" in sql
    assert "create policy \"toss_orders_user_select\"" in sql
    assert "for select to public" in sql
    assert "user_id = (select auth.uid())" in sql
    assert "for insert to public" not in sql
    assert "for update to public" not in sql


def test_subscriptions_client_writes_are_locked_to_service_role() -> None:
    """IAP-001/AUTH-001: clients may read but must not forge subscription/token entitlements."""
    migration = (
        MIGRATIONS / "20260601001100_lock_subscriptions_client_writes.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)

    assert "alter table public.subscriptions enable row level security" in sql
    assert "drop policy if exists \"subscriptions_user_insert\"" in sql
    assert "drop policy if exists \"subscriptions_user_update\"" in sql
    assert "drop policy if exists \"subscriptions_user_delete\"" in sql
    assert "create policy \"users read own subscriptions\"" in sql
    assert "on public.subscriptions for select to public" in sql
    assert "user_id = (select auth.uid())" in sql
    assert "for insert to public" not in sql
    assert "for update to public" not in sql
    assert "for delete to public" not in sql


def test_case_intakes_are_owner_or_active_b2b_member_scoped() -> None:
    """PRO-INTAKE-001/B2B-001: long-form intake data must stay scoped to owners or active org staff."""
    migration = (MIGRATIONS / "20260512000001_case_intakes.sql").read_text(
        encoding="utf-8"
    )
    latest_migration = (
        MIGRATIONS / "20260601001200_lock_case_intakes_b2b_assignment_scope.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)
    latest_sql = _compact(latest_migration)

    assert "alter table public.case_intakes enable row level security" in sql
    assert "create policy \"case_intakes_owner_select\"" in sql
    assert "create policy \"case_intakes_owner_write\"" in sql
    assert "create policy \"case_intakes_b2b_member_select\"" in sql
    assert "create policy \"case_intakes_b2b_member_write\"" in sql
    assert "from public.dogs d" in sql
    assert "d.id = case_intakes.dog_id" in sql
    assert "d.user_id = auth.uid()" in sql
    assert "from public.dog_assignments da" in sql
    assert "join public.org_members om on om.org_id = da.org_id" in sql
    assert "da.dog_id = case_intakes.dog_id" in sql
    assert "da.status = 'active'" in sql
    assert "om.user_id = auth.uid()" in sql
    assert "om.status = 'active'" in sql
    assert "om.role in ('owner', 'manager', 'staff')" in sql
    assert "with check" in sql

    assert "drop policy if exists \"case_intakes_b2b_member_select\"" in latest_sql
    assert "drop policy if exists \"case_intakes_b2b_member_write\"" in latest_sql
    assert "create policy \"case_intakes_b2b_member_select\"" in latest_sql
    assert "create policy \"case_intakes_b2b_member_write\"" in latest_sql
    assert "from public.org_dogs od" in latest_sql
    assert "od.dog_id = case_intakes.dog_id" in latest_sql
    assert "od.status = 'active'" in latest_sql
    assert "public.is_org_member_with_role(od.org_id, array['owner','manager','staff'])" in latest_sql
    assert "from public.dog_assignments da" in latest_sql
    assert "da.dog_id = case_intakes.dog_id" in latest_sql
    assert "da.trainer_user_id = (select auth.uid())" in latest_sql
    assert "da.status = 'active'" in latest_sql
    assert "om.user_id = auth.uid()" not in latest_sql
    assert "join public.org_members om" not in latest_sql
    assert "with check" in latest_sql


def test_user_entitlements_are_service_role_write_and_self_read_only() -> None:
    """GROWTH-001/IAP-001: PRO day-pass entitlements must not be client-forgeable."""
    migration = (MIGRATIONS / "20260522000100_user_entitlements.sql").read_text(
        encoding="utf-8"
    )
    sql = _compact(migration)

    assert "alter table public.user_entitlements enable row level security" in sql
    assert "create policy \"user_entitlements_service_role_all\"" in sql
    assert "for all to service_role" in sql
    assert "using (true)" in sql
    assert "with check (true)" in sql
    assert "create policy \"user_entitlements_select_own\"" in sql
    assert "for select to authenticated" in sql
    assert "using (auth.uid() = user_id)" in sql
    assert "for insert to authenticated" not in sql
    assert "for update to authenticated" not in sql
    assert "for delete to authenticated" not in sql
    assert "for insert to public" not in sql
    assert "for update to public" not in sql
    assert "for delete to public" not in sql


def test_b2b_membership_and_assignment_boundaries_are_encoded() -> None:
    sql = _compact(_all_migrations_sql())
    latest_org_dogs_policy = _compact(
        (MIGRATIONS / "20260601001300_lock_org_dogs_insert_owner_scope.sql").read_text(
            encoding="utf-8"
        )
    )
    latest_dog_assignment_policy = _compact(
        (MIGRATIONS / "20260601000200_lock_dog_assignments_rls_scope.sql").read_text(
            encoding="utf-8"
        )
    )

    assert "create or replace function public.is_org_member(" in sql
    assert "create or replace function public.is_org_member_with_role(" in sql
    assert "and user_id = auth.uid()" in sql or "user_id = (select auth.uid())" in sql
    assert "status = 'active'" in sql

    assert "drop policy if exists \"org_dogs_select\"" in latest_org_dogs_policy
    assert "create policy \"org_dogs_select\"" in latest_org_dogs_policy
    assert "public.is_org_member_with_role(org_id, array['owner','manager','staff'])" in latest_org_dogs_policy
    assert "parent_user_id = (select auth.uid())" in latest_org_dogs_policy
    assert "d.id = org_dogs.dog_id" in latest_org_dogs_policy
    assert "d.user_id = (select auth.uid())" in latest_org_dogs_policy
    assert "da.org_id = org_dogs.org_id" in latest_org_dogs_policy
    assert "da.dog_id = org_dogs.dog_id" in latest_org_dogs_policy
    assert "da.trainer_user_id = (select auth.uid())" in latest_org_dogs_policy
    assert "da.status = 'active'" in latest_org_dogs_policy
    assert "public.is_org_member(org_id)" not in latest_org_dogs_policy
    assert "create policy \"org_dogs_insert\"" in latest_org_dogs_policy
    assert "public.is_org_member_with_role(org_id, array['owner','manager'])" in latest_org_dogs_policy
    assert "with check" in latest_org_dogs_policy
    insert_policy = latest_org_dogs_policy[
        latest_org_dogs_policy.index("create policy \"org_dogs_insert\""):
        latest_org_dogs_policy.index("create policy \"org_dogs_update\"")
    ]
    assert "from public.dogs d" in insert_policy
    assert "d.id = org_dogs.dog_id" in insert_policy
    assert "d.user_id = (select auth.uid())" in insert_policy
    assert "create policy \"org_dogs_update\"" in latest_org_dogs_policy
    update_policy = latest_org_dogs_policy[
        latest_org_dogs_policy.index("create policy \"org_dogs_update\""):
        latest_org_dogs_policy.index("create policy \"org_dogs_delete\"")
    ]
    assert "with check" in update_policy
    assert "d.id = org_dogs.dog_id" in update_policy
    assert "d.user_id = (select auth.uid())" in update_policy

    org_service = (ROOT / "Backend/app/features/org/service.py").read_text(encoding="utf-8")
    org_tests = (ROOT / "Backend/tests/test_org_security.py").read_text(encoding="utf-8")
    enroll_section = org_service[
        org_service.index("async def enroll_dog"):
        org_service.index("async def create_org_dog")
    ]
    assert "await verify_dog_ownership(db, UUID(data.dog_id), user_id=user_id)" in enroll_section
    assert "test_enroll_dog_rejects_foreign_dog_before_org_link" in org_tests

    assert "create policy \"behavior_logs_b2b_insert\"" in sql
    assert "array['owner','manager','staff']" in sql
    assert "dog_assignments.trainer_user_id = (select auth.uid())" in sql or "dog_assignments.trainer_user_id = auth.uid()" in sql
    assert "dog_assignments.status = 'active'" in sql

    assert "create policy \"dog_assignments_insert\"" in sql
    assert "trainer_user_id = (select auth.uid())" in sql or "trainer_user_id = auth.uid()" in sql
    assert "array['owner', 'manager', 'staff', 'trainer']" in sql
    assert "drop policy if exists \"dog_assignments_select\"" in latest_dog_assignment_policy
    assert "create policy \"dog_assignments_select\"" in latest_dog_assignment_policy
    assert "create policy \"dog_assignments_insert\"" in latest_dog_assignment_policy
    assert "create policy \"dog_assignments_update\"" in latest_dog_assignment_policy
    assert "od.org_id = dog_assignments.org_id" in latest_dog_assignment_policy
    assert "od.dog_id = dog_assignments.dog_id" in latest_dog_assignment_policy
    assert "od.status = 'active'" in latest_dog_assignment_policy
    assert "d.id = dog_assignments.dog_id" in latest_dog_assignment_policy
    assert "d.user_id = (select auth.uid())" in latest_dog_assignment_policy
    assert "with check" in latest_dog_assignment_policy

    assert "create policy \"daily_reports_select\"" in sql
    assert "created_by_trainer_id = (select auth.uid())" in sql or "created_by_trainer_id = auth.uid()" in sql


def test_org_collection_routes_verify_membership_before_data_access() -> None:
    """B2B-001: org-scoped collection endpoints must not list data before membership checks."""
    router = (ROOT / "Backend/app/features/org/router.py").read_text(encoding="utf-8")

    guarded_calls = {
        "get_org_members": "return await service.get_org_members(db, org_id)",
        "get_active_member_count": "count = await service.get_active_org_member_count(db, org_id)",
        "get_org_dogs": "return await service.get_org_dogs_with_status(db, org_id)",
        "get_active_dog_count": "count = await service.get_active_org_dog_count(db, org_id)",
        "get_org_assignments": "return await service.get_org_assignments(db, org_id)",
        "get_org_today_stats": "return await service.get_org_today_stats(db, org_id)",
    }

    for route_name, service_call in guarded_calls.items():
        route_start = router.index(f"async def {route_name}(")
        route_end = router.find("\n\n@", route_start)
        route_section = router[route_start:] if route_end == -1 else router[route_start:route_end]

        guard = "await service.verify_org_membership(db, org_id, user_id)"
        assert guard in route_section, route_name
        assert service_call in route_section, route_name
        assert route_section.index(guard) < route_section.index(service_call), route_name


def test_daily_reports_are_bound_to_active_org_dog_scope() -> None:
    """B2B-001/AUTH-001: org reports must not be forged for dogs outside the org."""
    migration = (
        MIGRATIONS / "20260601000700_lock_daily_reports_org_dog_scope.sql"
    ).read_text(encoding="utf-8")
    latest_migration = (
        MIGRATIONS / "20260601001400_lock_daily_reports_trainer_dog_scope.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)
    latest_sql = _compact(latest_migration)
    service = (ROOT / "Backend/app/features/report/service.py").read_text(encoding="utf-8")
    tests = (ROOT / "Backend/tests/test_report_service.py").read_text(encoding="utf-8")

    assert "drop policy if exists \"daily_reports_select\"" in sql
    assert "drop policy if exists \"daily_reports_insert\"" in sql
    assert "drop policy if exists \"daily_reports_update\"" in sql
    assert "create policy \"daily_reports_select\"" in sql
    assert "create policy \"daily_reports_insert\"" in sql
    assert "create policy \"daily_reports_update\"" in sql
    assert "od.org_id = daily_reports.created_by_org_id" in sql
    assert "od.dog_id = daily_reports.dog_id" in sql
    assert "od.status = 'active'" in sql
    assert "public.is_org_member_with_role(created_by_org_id, array['owner','manager','staff'])" in sql
    assert "created_by_org_id is not null" in sql
    assert "created_by_trainer_id is null" in sql
    assert "with check" in sql
    assert "share_token" not in sql

    assert "async def _verify_active_org_dog" in service
    assert "OrgDog.org_id == org_id" in service
    assert "OrgDog.dog_id == dog_id" in service
    assert 'OrgDog.status == "active"' in service
    assert "await _verify_active_org_dog(db, created_by_org_id, dog_id)" in service
    assert "await _verify_active_org_dog(db, report.created_by_org_id, report.dog_id)" in service
    assert "DailyReport.created_by_org_id == OrgDog.org_id" in service
    assert "DailyReport.dog_id == OrgDog.dog_id" in service
    trainer_select = latest_sql[
        latest_sql.index("created_by_org_id is null"):
        latest_sql.index("or public.is_parent_of_dog")
    ]
    trainer_update = latest_sql[
        latest_sql.index("create policy \"daily_reports_update\""):
    ]
    assert "created_by_trainer_id = (select auth.uid())" in trainer_select
    assert "from public.dogs d" in trainer_select
    assert "d.id = daily_reports.dog_id" in trainer_select
    assert "d.user_id = (select auth.uid())" in trainer_select
    assert "created_by_trainer_id = (select auth.uid())" in trainer_update
    assert "d.id = daily_reports.dog_id" in trainer_update
    assert "d.user_id = (select auth.uid())" in trainer_update

    assert "test_generate_report_rejects_org_report_for_dog_outside_org" in tests
    assert "test_verify_report_access_rejects_org_report_for_dog_outside_org" in tests
    assert "test_verify_report_access_rechecks_creator_trainer_dog_ownership" in tests
    assert "test_verify_report_access_rejects_creator_trainer_foreign_dog" in tests


def test_parent_interactions_and_org_members_have_tight_b2b_boundaries() -> None:
    """B2B-001/AUTH-001: side tables must not re-open report or role-escalation paths."""
    migration = (
        MIGRATIONS / "20260601000800_lock_parent_interactions_and_org_members_rls.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)
    service = (ROOT / "Backend/app/features/org/service.py").read_text(encoding="utf-8")
    tests = (ROOT / "Backend/tests/test_org_security.py").read_text(encoding="utf-8")

    assert "drop policy if exists \"parent_interactions_select\"" in sql
    assert "drop policy if exists \"parent_interactions_insert\"" in sql
    assert "drop policy if exists \"parent_interactions_update\"" in sql
    assert "create policy \"parent_interactions_select\"" in sql
    assert "create policy \"parent_interactions_insert\"" in sql
    assert "create policy \"parent_interactions_update\"" in sql
    assert "join public.org_dogs od" in sql
    assert "od.org_id = dr.created_by_org_id" in sql
    assert "od.dog_id = dr.dog_id" in sql
    assert "od.status = 'active'" in sql
    assert "public.is_parent_of_dog(dr.dog_id)" in sql
    assert "dr.expires_at is null or dr.expires_at > now()" in sql
    assert "responded_by is null or responded_by = (select auth.uid())" in sql

    assert "drop policy if exists \"org_members_insert\"" in sql
    assert "drop policy if exists \"org_members_update\"" in sql
    assert "create policy \"org_members_insert\"" in sql
    assert "create policy \"org_members_update\"" in sql
    assert "role in ('staff', 'viewer')" in sql
    assert "role in ('owner', 'manager')" in sql
    assert "public.is_org_member_with_role(org_id, array['owner','manager'])" in sql
    assert "public.is_org_member_with_role(org_id, array['owner'])" in sql
    assert "with check" in sql

    assert "def _ensure_member_invite_role_allowed" in service
    assert 'invited_role in ("owner", "manager") and actor_role != "owner"' in service
    assert "BadRequestException(\"Invalid organization member role\")" in service
    assert "test_manager_member_cannot_invite_manager_or_owner_roles" in tests
    assert "test_owner_member_can_invite_manager_role" in tests
    assert "test_invite_member_rejects_unknown_role" in tests


def test_b2b_subscription_reads_are_backend_bound_and_membership_checked() -> None:
    """B2B-001/IAP-001: org subscription state must be scoped by backend JWT identity."""
    router = (ROOT / "Backend/app/features/org/router.py").read_text(encoding="utf-8")
    service = (ROOT / "Backend/app/features/org/service.py").read_text(encoding="utf-8")
    schemas = (ROOT / "Backend/app/features/org/schemas.py").read_text(encoding="utf-8")
    frontend = (ROOT / "src/lib/hooks/useOrgSubscription.ts").read_text(encoding="utf-8")
    migration = (
        MIGRATIONS / "20260601000900_lock_generation_jobs_and_org_subscriptions_rls.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)
    org_subscription_sql = sql[
        sql.index("drop policy if exists \"org_subscriptions_select\""):
    ]

    assert 'router.get("/{org_id}/subscription"' in router
    assert "get_current_org_subscription(db, org_id, user_id)" in router
    assert 'router.get("/subscription/trainer/mine"' in router
    assert "get_current_trainer_subscription(db, user_id)" in router
    assert "get_current_org_subscription" in service
    assert "await verify_org_membership(db, org_id, user_id)" in service
    assert "OrgSubscription.org_id == org_id" in service
    assert "OrgSubscription.trainer_user_id == UUID(user_id)" in service
    assert "class OrgSubscriptionResponse" in schemas
    assert "drop policy if exists \"org_subscriptions_insert\"" in org_subscription_sql
    assert "drop policy if exists \"org_subscriptions_update\"" in org_subscription_sql
    assert "drop policy if exists \"org_subscriptions_delete\"" in org_subscription_sql
    assert "create policy \"org_subscriptions_select\"" in org_subscription_sql
    assert "public.is_org_member(org_id)" in org_subscription_sql
    assert "trainer_user_id = (select auth.uid())" in org_subscription_sql
    assert "for insert to public" not in org_subscription_sql
    assert "for update to public" not in org_subscription_sql
    assert "for delete to public" not in org_subscription_sql

    assert "from('org_subscriptions')" not in frontend
    assert 'from("org_subscriptions")' not in frontend
    assert "/api/v1/org/${orgId}/subscription" in frontend
    assert "/api/v1/org/subscription/trainer/mine" in frontend


def test_behavior_logs_recorded_by_cannot_be_spoofed_by_public_clients() -> None:
    """LOG-001/AUTH-001/B2B-001: clients must not forge another user's audit identity."""
    migration = (
        MIGRATIONS / "20260601000500_lock_behavior_logs_recorded_by_rls.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)
    service = (ROOT / "Backend/app/features/log/service.py").read_text(encoding="utf-8")
    router = (ROOT / "Backend/app/features/log/router.py").read_text(encoding="utf-8")

    assert "drop policy if exists \"behavior_logs_b2b_insert\"" in sql
    assert "drop policy if exists \"behavior_logs_b2b_update\"" in sql
    assert "create policy \"behavior_logs_b2b_insert\"" in sql
    assert "create policy \"behavior_logs_b2b_update\"" in sql
    assert "recorded_by is null or recorded_by = (select auth.uid())" in sql
    assert "with check" in sql
    assert "public.is_org_member_with_role(org_id, array['owner', 'manager', 'staff'])" in sql
    assert "od.org_id = behavior_logs.org_id" in sql
    assert "od.dog_id = behavior_logs.dog_id" in sql
    assert "od.status = 'active'" in sql
    assert "dog_assignments.trainer_user_id = (select auth.uid())" in sql
    assert "dog_assignments.status = 'active'" in sql
    assert "dog_assignments.org_id = behavior_logs.org_id" in sql
    assert "dog_assignments.org_id is null and behavior_logs.org_id is null" in sql

    assert '"recorded_by": UUID(recorded_by) if recorded_by else data.recorded_by' in service
    assert '"recorded_by": UUID(recorded_by) if recorded_by else None' in service
    assert "recorded_by=user_id" in router


def test_ai_coaching_direct_access_is_service_role_only() -> None:
    sql = _compact(_all_migrations_sql())
    service = (ROOT / "Backend/app/features/coaching/service.py").read_text(encoding="utf-8")
    tests = (ROOT / "Backend/tests/test_coaching_security.py").read_text(encoding="utf-8")

    assert "alter table public.ai_coaching enable row level security" in sql
    assert "create policy \"service role full access\" on public.ai_coaching" in sql
    assert "on public.ai_coaching for select to public" not in sql
    assert "on public.ai_coaching for insert to public" not in sql
    assert "on public.ai_coaching for update to public" not in sql
    assert "await verify_dog_ownership(db, result.dog_id, user_id=user_id)" in service
    assert "test_submit_feedback_rejects_foreign_coaching_before_write" in tests
    assert "test_toggle_action_item_rejects_foreign_coaching_before_write" in tests


def test_b2b_dog_ownership_requires_active_org_dog_for_org_assignments() -> None:
    """B2B-001: stale org assignments must not keep access after the dog leaves the org."""
    ownership = (ROOT / "Backend/app/shared/utils/ownership.py").read_text(encoding="utf-8")
    tests = (ROOT / "Backend/tests/test_ownership.py").read_text(encoding="utf-8")
    assignment_section = ownership[
        ownership.index("# B2B 배정자 확인"):
        ownership.index("# B2B 조직 소속 강아지")
    ]

    assert "assignment.org_id" in assignment_section
    assert "OrgDog.org_id == assignment.org_id" in assignment_section
    assert "OrgDog.dog_id == dog_id" in assignment_section
    assert 'OrgDog.status == "active"' in assignment_section
    assert "assignment_active_org_dog" in assignment_section
    assert "test_verify_dog_ownership_rejects_stale_org_assignment_when_org_dog_is_inactive" in tests
    assert "test_verify_dog_ownership_allows_active_org_assignment_only_when_org_dog_is_active" in tests


def test_latest_daily_reports_policy_removes_public_share_token_listing() -> None:
    migration = (
        MIGRATIONS / "20260601000100_lock_daily_reports_public_share_rls.sql"
    ).read_text(encoding="utf-8")
    sql = _compact(migration)

    assert "drop policy if exists \"daily_reports_select\"" in sql
    assert "create policy \"daily_reports_select\"" in sql
    assert "share_token" not in sql


def test_public_report_share_verification_is_throttled() -> None:
    """B2B-001/AUTH-001: public share-token last4 checks must resist brute-force."""
    service = (ROOT / "Backend/app/features/report/service.py").read_text(encoding="utf-8")
    router = (ROOT / "Backend/app/features/report/router.py").read_text(encoding="utf-8")
    tests = (ROOT / "Backend/tests/test_report_service.py").read_text(encoding="utf-8")

    assert "PARENT_SHARE_MAX_ATTEMPTS" in service
    assert "PARENT_SHARE_ATTEMPT_WINDOW" in service
    assert "_consume_parent_share_attempt" in service
    assert "HTTP_429_TOO_MANY_REQUESTS" in service
    assert 'OrgDog.status == "active"' in service
    assert "attempt_key=request.client.host if request.client else None" in router
    assert "throttles_repeated_failures_per_token_and_client" in tests
    assert "success_clears_failure_counter" in tests
    assert "requires_active_org_dog_mapping" in tests


def test_verify_iap_order_idempotency_is_bound_before_grant() -> None:
    source = (ROOT / "supabase/functions/verify-iap-order/main.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/verify-iap-order-auth.test.ts").read_text(encoding="utf-8")
    migration = (MIGRATIONS / "20260601001600_lock_toss_order_id_reuse.sql").read_text(encoding="utf-8")

    assert "isIapReplayCompatible" in source
    assert "buildExistingTossOrderLookupFilter" in source
    assert "IAP_IDEMPOTENCY_CONFLICT" in source
    order_insert_section = source[
        source.index("async function upsertTossOrder"):
        source.index("async function findExistingTossOrder")
    ]
    lookup_section = source[
        source.index("async function findExistingTossOrder"):
        source.index("export function isIapReplayCompatible")
    ]
    assert "resolution=merge-duplicates" not in order_insert_section
    assert "SUPABASE_SERVICE_ROLE_KEY is required" in order_insert_section
    assert "Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`" in order_insert_section
    assert "payload.slice" not in order_insert_section
    assert "or=(${buildExistingTossOrderLookupFilter(body.idempotencyKey, body.orderId)})" in lookup_section
    assert "toss_order_id.eq.${encodeURIComponent(orderId)}" in source
    assert "SUPABASE_SERVICE_ROLE_KEY is required" in lookup_section
    assert "Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`" in lookup_section
    assert "findExistingTossOrder(body)" in source
    assert "upsertTossOrder({" in source
    assert "findExistingTossOrder(token" not in source
    assert "upsertTossOrder(token" not in source
    assert source.index("findExistingTossOrder") < source.index("createMTLSClient(resolveMtlsMode())")
    assert source.index("findExistingTossOrder") < source.index("activateSubscription")
    assert "export async function validateGrantedReplayEntitlement" in source
    assert "IAP_GRANT_LEDGER_INCONSISTENT" in source
    assert "Granted IAP order has no active subscription" in source
    assert "Granted IAP order has no token entitlement ledger" in source
    assert "Granted B2B IAP order has no active org subscription" in source
    replay_section = source[source.index("if (existing.row)"):source.index("// mTLS 실 검증")]
    assert replay_section.index("isIapReplayCompatible") < replay_section.index("validateGrantedReplayEntitlement")
    assert replay_section.index("validateGrantedReplayEntitlement") < replay_section.index("toVerifyIapOrderResponse")
    assert "rejects replay of the same Toss order id with a different idempotency key" in tests
    assert "looks up both idempotency key and Toss order id before any grant side effects" in tests
    assert "does not replay a granted order without verifying the entitlement ledger" in tests
    assert "skips entitlement ledger checks for non-granted replay states" in tests
    assert "CREATE UNIQUE INDEX IF NOT EXISTS uq_toss_orders_toss_order_id" in migration
    assert "WHERE toss_order_id IS NOT NULL" in migration


def test_verify_iap_order_only_marks_granted_after_subscription_activation() -> None:
    source = (ROOT / "supabase/functions/verify-iap-order/main.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/verify-iap-order-auth.test.ts").read_text(encoding="utf-8")
    compact = _compact(source)
    handler_section = source[source.index("async function handleRequest"):]
    activation_section = source[
        source.index("async function activateSubscription"):
        source.index("async function resolveTossUserKey")
    ]
    finalization_section = source[
        source.index("export async function finalizeGrantStateAfterActivation"):
        source.index("async function resolveTossUserKey")
    ]

    assert "성공해야 toss_orders grant_status=granted" in source
    assert "export async function finalizeGrantStateAfterActivation" in source
    assert "non-fatal" not in activation_section
    assert "SUBSCRIPTION_ACTIVATION_FAILED" in finalization_section
    assert "ORG_SUBSCRIPTION_ACTIVATION_FAILED" in finalization_section
    assert "IAP_PRODUCT_GRANT_UNKNOWN" in finalization_section
    assert "const hasB2CGrant = Boolean(PRODUCT_GRANTS[params.productId]);" in finalization_section
    assert "grantStatus === 'granted' && !hasB2CGrant && !params.hasB2BGrant" in finalization_section
    assert "grantStatus = 'grant_failed';" in finalization_section
    assert handler_section.index("await finalizeGrantStateAfterActivation") < handler_section.index("const persisted = await upsertTossOrder")
    assert "marks B2C subscription activation failures as grant_failed before order persistence" in tests
    assert "marks B2C token activation failures as grant_failed before order persistence" in tests
    assert "marks B2B subscription activation failures as grant_failed before order persistence" in tests
    assert "marks unknown granted products as grant_failed before order persistence" in tests

    for failure_marker in [
        "SUBSCRIPTION_PLAN_ACTIVATION_FAILED",
        "SUBSCRIPTION_TOKEN_LOOKUP_FAILED",
        "SUBSCRIPTION_TOKEN_PATCH_FAILED",
        "SUBSCRIPTION_TOKEN_INSERT_FAILED",
    ]:
        assert failure_marker in source

    assert "if (!response.ok)" in activation_section
    assert "if (!getresp.ok)" in compact


def test_b2b_iap_scope_is_server_verified_and_idempotency_bound() -> None:
    """IAP-001/B2B-001: B2B purchases must be scoped by server-verified org/trainer ownership."""
    router = (ROOT / "Backend/app/features/subscription/router.py").read_text(encoding="utf-8")
    edge = (ROOT / "supabase/functions/verify-iap-order/main.ts").read_text(encoding="utf-8")
    backend_tests = (ROOT / "Backend/tests/test_subscription_security.py").read_text(encoding="utf-8")
    migration = (MIGRATIONS / "20260601000300_b2b_iap_order_scope.sql").read_text(encoding="utf-8")

    assert "verify_b2b_iap_context" in router
    assert "B2B_IAP_SCOPE_REQUIRED" in router
    assert "OrgMember.role.in_([OrgMemberRole.OWNER.value, OrgMemberRole.MANAGER.value])" in router
    assert "trainer plans can only be bought for the current trainer" in router.lower()
    assert "B2B IAP context requires server-side membership verification" in edge
    assert "B2B IAP product requires orgId or trainerUserId" in edge
    assert "B2B_IAP_ORG_ID_INVALID" in edge
    assert "B2B_IAP_TRAINER_ID_INVALID" in edge
    assert "orgId must be a UUID" in edge
    assert "trainerUserId must be a UUID" in edge
    assert "(row.org_id ?? null) === (body.orgId ?? null)" in edge
    assert "(row.trainer_user_id ?? null) === (body.trainerUserId ?? null)" in edge
    assert "await finalizeGrantStateAfterActivation" in edge
    assert "activateOrgSubscriptionFn ?? activateOrgSubscription" in edge
    assert "ORG_SUBSCRIPTION_ACTIVATION_FAILED" in edge
    assert "test_iap_proxy_rejects_b2c_product_with_org_scope" in backend_tests
    assert "test_iap_proxy_rejects_b2c_product_with_trainer_scope" in backend_tests
    assert "ADD COLUMN IF NOT EXISTS org_id uuid" in migration
    assert "ADD COLUMN IF NOT EXISTS trainer_user_id uuid" in migration


def test_verify_iap_order_ignores_body_user_id_without_service_role() -> None:
    """IAP-001: direct client calls must bind user_id to internal JWT verification, not body.userId."""
    source = (ROOT / "supabase/functions/verify-iap-order/main.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/verify-iap-order-auth.test.ts").read_text(encoding="utf-8")
    helper_section = source[
        source.index("export function resolveIapRequestUserId"):
        source.index("/**\n * 구독/토큰 활성화")
    ]
    handler_section = source[source.index("async function handleRequest"):]

    assert "export function resolveIapRequestUserId" in source
    assert "const UUID_PATTERN" in source
    assert "function isUuid" in source
    assert "userId must be a UUID" in helper_section
    assert "Invalid authenticated user id" in helper_section
    assert "return ok({ userId: params.authUserId });" in helper_section
    assert "return ok({ userId: params.bodyUserId });" in helper_section
    assert "resolveIapRequestUserId({" in handler_section
    assert "bodyUserId: body.userId" in handler_section
    assert "authUserId: resolvedUserId" in handler_section
    assert "non-service callers ignore body.userId" in tests
    assert "service role callers must provide the FastAPI-verified body.userId" in tests
    assert "service role callers must provide a UUID userId" in tests
    assert "test_iap_proxy_endpoint_forwards_authenticated_user_id_not_body_user_id" in (
        ROOT / "Backend/tests/test_subscription_security.py"
    ).read_text(encoding="utf-8")


def test_toss_s2s_edge_functions_use_fail_closed_mtls_resolver() -> None:
    """IAP-001/MSG-001/AUTH-001: Toss S2S functions must not hard-code mock mTLS mode."""
    s2s_entrypoints = [
        "supabase/functions/login-with-toss/index.ts",
        "supabase/functions/verify-iap-order/main.ts",
        "supabase/functions/grant-toss-points/index.ts",
        "supabase/functions/send-smart-message/index.ts",
    ]

    for relative in s2s_entrypoints:
        source = (ROOT / relative).read_text(encoding="utf-8")
        assert "resolveMtlsMode" in source, relative
        assert "createMTLSClient(resolveMtlsMode())" in source, relative
        assert "createMTLSClient('mock')" not in source, relative
        assert 'createMTLSClient("mock")' not in source, relative


def test_mtls_resolver_fails_closed_for_production_like_modes() -> None:
    source = (ROOT / "supabase/functions/_shared/mtlsMode.ts").read_text(encoding="utf-8")
    client = (ROOT / "supabase/functions/_shared/mTLSClient.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/_shared/__tests__/mtlsMode.test.ts").read_text(encoding="utf-8")

    for env_name in ["APP_ENV", "NODE_ENV", "DENO_ENV", "ENVIRONMENT", "TOSS_RUNTIME_MODE"]:
        assert f"read('{env_name}')" in source

    assert "if (isProductionLike(read)) return 'real';" in source
    assert "value === 'sandbox_real'" in source
    assert "value === 'prod_read'" in source
    assert "explicit === 'mock' && isExplicitDevLocal(read)" in source
    assert "if (!explicit && isExplicitDevLocal(read)) return 'mock';" in source
    assert "export function createMTLSClient(mode: 'mock' | 'real' = 'real')" in client
    assert "fails closed to real when mock is configured without explicit dev-local mode" in tests
    assert "uses mock by default only in explicit dev-local mode" in tests
    assert "production fails closed to real mode even if mock is configured" in tests
    assert "prod-ready mode fails closed to real mode without certs" in tests
    assert "runtime mode %s ignores explicit mock and fails closed to real" in tests
    assert "SANDBOX_REAL" in tests
    assert "PROD_READ" in tests
    assert "wins over NODE_ENV=test and fails closed to real" in tests
    assert "missing mode and missing certs still fail closed to real" in tests
    assert "propagates Toss upstream network failures instead of returning success" in (
        ROOT / "supabase/functions/_shared/__tests__/mTLSClient.test.ts"
    ).read_text(encoding="utf-8")
    assert "TOSS_UPSTREAM_NETWORK" in client


def test_generate_report_mock_ai_is_dev_local_only() -> None:
    """B2B-001: uploaded/prod report generation must not silently use mock AI output."""
    source = (ROOT / "supabase/functions/generate-report/index.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/generate-report.test.ts").read_text(encoding="utf-8")

    assert "function isDevLocalMode" in source
    assert "if (mode === 'mock' && isDevLocalMode(getEnv)) return 'mock';" in source
    assert "return 'real';" in source
    assert "fails closed to real AI mode outside DEV_LOCAL even when REPORT_AI_MODE=mock" in tests


def test_generate_report_binds_requested_dog_to_report_row() -> None:
    """B2B-001/RLS: report generation must not accept a dog_id from a different report/user."""
    source = (ROOT / "supabase/functions/generate-report/index.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/generate-report.test.ts").read_text(encoding="utf-8")

    assert "dog_id: string;" in source
    assert "daily_reports?select=dog_id,created_by_org_id,created_by_trainer_id" in source
    assert "const report = await fetchReportGenerationScope(report_id" in source
    assert "if (!report || report.dog_id !== dog_id)" in source
    assert "await hasReportMembershipAccess(report, context" in source
    assert "if (report.created_by_org_id)" in source
    assert "return report.created_by_trainer_id === context.userId;" in source
    assert "daily_reports?id=eq.${encodeURIComponent(report_id)}" in source
    assert "rejects mismatched report and dog ids before AI generation or update" in tests
    assert "service_role still rejects mismatched report and dog ids before update" in tests
    assert "requires org membership even when an org report also has matching trainer id" in tests


def test_generate_report_membership_roles_are_standard_b2b_roles() -> None:
    """B2B-001/AUTH-001: report generation must not allow legacy/non-standard admin roles."""
    source = (ROOT / "supabase/functions/generate-report/index.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/__tests__/generate-report.test.ts").read_text(encoding="utf-8")

    assert "const REPORT_MEMBERSHIP_ROLES = new Set(['owner', 'manager', 'staff', 'trainer']);" in source
    assert "REPORT_MEMBERSHIP_ROLES.has(membership.role)" in source
    assert "admin" not in source
    assert "rejects non-standard admin org membership role" in tests


def test_edge_pii_guard_redacts_unstructured_log_strings() -> None:
    """AUTH-001: Edge logs must redact tokens/PII even when they arrive inside error strings."""
    source = (ROOT / "supabase/functions/_shared/piiGuard.ts").read_text(encoding="utf-8")
    tests = (ROOT / "supabase/functions/_shared/__tests__/piiGuard.test.ts").read_text(encoding="utf-8")

    assert "export function redactText" in source
    assert "BEARER_TOKEN" in source
    assert "JWT_LIKE" in source
    assert "SENSITIVE_ASSIGNMENT" in source
    assert "service[_-]?role[_-]?key" in source
    assert "supabase[_-]?service[_-]?role[_-]?key" in source
    assert "api[_-]?key" in source
    assert "EMAIL" in source
    assert "PHONE" in source
    assert "return value.map((item) => sanitizeValue(item));" in source
    assert "return redactText(value);" in source
    assert "redacts pii embedded in unstructured log strings" in tests
    assert "safeLogPayload redacts pii strings even when keys are not sensitive" in tests


def test_org_dogs_pii_has_no_direct_public_access() -> None:
    sql = _compact(_all_migrations_sql())

    for policy_name in [
        "pii_no_direct_select",
        "pii_no_direct_insert",
        "pii_no_direct_update",
        "pii_no_direct_delete",
    ]:
        assert f"create policy \"{policy_name}\"" in sql

    assert "on public.org_dogs_pii for select" in sql and "using (false)" in sql
    assert "on public.org_dogs_pii for insert" in sql and "with check (false)" in sql
    assert "on public.org_dogs_pii for update" in sql and "using (false)" in sql
    assert "on public.org_dogs_pii for delete" in sql and "using (false)" in sql
