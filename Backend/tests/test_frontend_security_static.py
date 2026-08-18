from __future__ import annotations

import re
import subprocess
import json
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


SENSITIVE_AIT_MARKERS = [
    "SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "JWT_SECRET",
    "AUTH_BRIDGE_SECRET",
    "SUPER_SECRET_PEPPER",
    "SUPER_SECRET_PEPPER_V1",
    "SUPER_SECRET_PEPPER_V2",
    "TOSS_PII_DECRYPTION_KEY",
    "TOSS_PII_DECRYPTION_KEY_BASE64",
    "TOSS_PROFILE_DECRYPTION_KEY",
    "TOSS_PROFILE_DECRYPTION_KEY_BASE64",
    "OPENAI_API_KEY",
    "TOSS_CLIENT_SECRET",
    "TOSS_CLIENT_KEY",
    "TOSS_CLIENT_CERT",
    "TOSS_CALLBACK_AUTH_ID",
    "TOSS_CALLBACK_AUTH_PW",
    "TOSS_BASIC_AUTH",
    "TOSS_MTLS_CERT",
    "TOSS_MTLS_KEY",
    "TOSS_MTLS_MODE=mock",
    "TOSS_MTLS_MODE mock",
    "REPORT_AI_MODE=mock",
    "TOSS_RUNTIME_MODE=DEV_LOCAL",
    "TOSS_RUNTIME_MODE DEV_LOCAL",
    "TOSS_RUNTIME_MODE=PROD_READY",
    "TOSS_RUNTIME_MODE PROD_READY",
    "EXPO_PUBLIC_SHOW_DEV_MENU=true",
    "EXPO_PUBLIC_SHOW_DEV_MENU true",
    "sourceMappingURL=",
    "http://localhost",
    "https://localhost",
    "http://127.0.0.1",
    "http://10.0.2.2",
    "http://192.168.",
    "Mock Login",
    "setDevPlanOverride",
    "setDevGuardBypass",
    "toss_mockstableuser001",
    "TestPass1234!",
    "mock_stable_user_001",
    "mock_access_",
    "TOSS_MOCK_STABLE_USER=true",
    "DEV_LOOPBACK_BACKEND_URL",
    "DEV_LOCAL",
    "SANDBOX_REAL",
    "PROD_READ",
    "PROD_READY",
    "Dev Navigator",
    "가드 우회",
    "IAP 바이패스",
    "[DEV] IAP",
    "[DEV] 지급",
    "[DEV] 에러",
    "BEGIN CERTIFICATE",
    "BEGIN PRIVATE KEY",
    "PRIVATE KEY",
    "Bearer eyJ",
    "authorization: Bearer",
    "access_token=",
    "refresh_token=",
    "authorizationCode=",
    "authCode=",
    "id_token=eyJ",
    "jwt=eyJ",
    "toss_user_key=",
    "userKey=",
    "phone=",
    "email=",
    "ait-ad-test-",
]


def _strings(path: Path) -> str:
    result = subprocess.run(
        ["strings", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def _ait_js_bundle_text(path: Path) -> str:
    import zipfile

    with zipfile.ZipFile(path) as archive:
        js_names = [name for name in archive.namelist() if name.endswith(".js")]
        return "\n".join(archive.read(name).decode("utf-8", errors="ignore") for name in js_names)


def _ait_text_payload(path: Path) -> str:
    import zipfile

    text_suffixes = (".js", ".map", ".json", ".env", ".txt")
    with zipfile.ZipFile(path) as archive:
        text_names = [name for name in archive.namelist() if name.endswith(text_suffixes)]
        return "\n".join(archive.read(name).decode("utf-8", errors="ignore") for name in text_names)


def _leaked_sensitive_ait_markers(bundle_text: str) -> list[str]:
    return [marker for marker in SENSITIVE_AIT_MARKERS if marker in bundle_text]


def test_current_ait_bundle_has_no_sensitive_or_dev_markers() -> None:
    """AUTH-001/IAP-001: uploaded AIT proof must not carry secrets, mock login, or local URLs."""
    ait_path = ROOT / "taillog-app.ait"
    assert ait_path.exists(), "taillog-app.ait must exist before release bundle security scan"

    bundle_text = _strings(ait_path)
    leaked = _leaked_sensitive_ait_markers(bundle_text)
    assert leaked == []


def test_current_ait_text_payload_has_no_sensitive_or_dev_markers() -> None:
    """AUTH-001/IAP-001: source maps inside AIT must not carry secrets, mocks, or local URLs."""
    ait_path = ROOT / "taillog-app.ait"
    assert ait_path.exists(), "taillog-app.ait must exist before release text payload security scan"

    bundle_text = _ait_text_payload(ait_path)
    leaked = _leaked_sensitive_ait_markers(bundle_text)
    assert leaked == []


def test_dev_tool_gate_is_disabled_outside_dev_builds() -> None:
    """APP-001/IAP-001: DevMenu plan override must be unreachable in production builds."""
    source = (ROOT / "src/lib/devTools.ts").read_text(encoding="utf-8")
    bypass = (ROOT / "src/lib/devGuardBypass.ts").read_text(encoding="utf-8")
    plan_override = (ROOT / "src/lib/devPlanOverride.ts").read_text(encoding="utf-8")
    dev_menu = (ROOT / "src/components/shared/DevMenu.tsx").read_text(encoding="utf-8")
    app = (ROOT / "src/_app.tsx").read_text(encoding="utf-8")
    granite = (ROOT / "granite.config.ts").read_text(encoding="utf-8")

    assert "return __DEV__ && process.env.EXPO_PUBLIC_SHOW_DEV_MENU === 'true';" in source
    assert "return isDevToolsEnabled() && _bypass;" in bypass
    assert "return isDevToolsEnabled() ? _override : null;" in plan_override
    assert "import { DevMenu } from 'components/shared/DevMenu';" not in app
    assert "const DevMenuComponent = __DEV__" in app
    assert "require('components/shared/DevMenu')" in app
    assert "{DevMenuComponent && isDevToolsEnabled() && <DevMenuComponent />}" in app
    assert "function getDevMenuFlag()" in granite
    assert "if (process.env.NODE_ENV === 'production') return '';" in granite
    assert "'process.env.EXPO_PUBLIC_SHOW_DEV_MENU': JSON.stringify(getDevMenuFlag())" in granite
    assert "signInWithPassword" not in dev_menu
    assert "toss_mockstableuser001" not in dev_menu
    assert "TestPass1234" not in dev_menu


def test_skip_auth_usage_is_limited_to_public_entry_routes() -> None:
    """AUTH-001: protected app pages must not opt out of the auth guard."""
    allowed = {
        "src/pages/onboarding/welcome.tsx",
        "src/pages/parent/reports.tsx",
        "src/pages/report/[shareToken].tsx",
    }
    violations: list[str] = []

    for path in (ROOT / "src/pages").rglob("*.tsx"):
        source = path.read_text(encoding="utf-8")
        if not re.search(r"skipAuth\s*:\s*true", source):
            continue
        relative = str(path.relative_to(ROOT))
        if relative not in allowed:
            violations.append(relative)

    assert violations == []


def test_route_pages_are_guarded_or_explicitly_public() -> None:
    """AUTH-001: route files must not render protected screens before usePageGuard runs."""
    explicit_public_or_redirect = {
        "src/pages/_404.tsx",
        "src/pages/index.tsx",
        "src/pages/legal/privacy.tsx",
        "src/pages/legal/terms.tsx",
    }
    violations: list[str] = []

    for path in (ROOT / "src/pages").rglob("*.tsx"):
        relative = str(path.relative_to(ROOT))
        source = path.read_text(encoding="utf-8")
        if "createRoute(" not in source:
            continue
        if relative in explicit_public_or_redirect:
            continue
        if "usePageGuard(" not in source:
            violations.append(relative)

    assert violations == []


def test_route_guard_inventory_matches_expected_auth_boundaries() -> None:
    """AUTH-001/B2B-001: every route's auth boundary must be explicit and reviewable."""
    public_or_redirect_routes = {
        "src/pages/_404.tsx",
        "src/pages/index.tsx",
        "src/pages/legal/privacy.tsx",
        "src/pages/legal/terms.tsx",
    }
    public_skip_auth_routes = {
        "src/pages/onboarding/welcome.tsx": "/onboarding/welcome",
        "src/pages/report/[shareToken].tsx": "/report/[shareToken]",
    }
    onboarding_routes = {
        "src/pages/onboarding/notification.tsx": "/onboarding/notification",
        "src/pages/onboarding/stage1-form.tsx": "/onboarding/stage1-form",
        "src/pages/onboarding/stage2-form.tsx": "/onboarding/stage2-form",
        "src/pages/onboarding/stage3-form.tsx": "/onboarding/stage3-form",
        "src/pages/onboarding/survey-result.tsx": "/onboarding/survey-result",
        "src/pages/onboarding/survey.tsx": "/onboarding/survey",
    }
    protected_routes = {
        "src/pages/coaching/result.tsx": "/coaching/result",
        "src/pages/dashboard/analysis.tsx": "/dashboard/analysis",
        "src/pages/dashboard/index.tsx": "/dashboard",
        "src/pages/dashboard/quick-log.tsx": "/dashboard/quick-log",
        "src/pages/dog/add.tsx": "/dog/add",
        "src/pages/dog/profile.tsx": "/dog/profile",
        "src/pages/dog/switcher.tsx": "/dog/switcher",
        "src/pages/settings/index.tsx": "/settings",
        "src/pages/settings/subscription.tsx": "/settings/subscription",
        "src/pages/training/academy.tsx": "/training/academy",
        "src/pages/training/detail.tsx": "/training/detail",
    }
    b2b_routes = {
        "src/pages/ops/dog-add.tsx": "/ops/dog-add",
        "src/pages/ops/settings.tsx": "/ops/settings",
        "src/pages/ops/setup.tsx": "/ops/setup",
        "src/pages/ops/today.tsx": "/ops/today",
        "src/pages/parent/reports.tsx": "/parent/reports",
    }
    expected_route_files = (
        public_or_redirect_routes
        | set(public_skip_auth_routes)
        | set(onboarding_routes)
        | set(protected_routes)
        | set(b2b_routes)
    )

    routed_files = {
        str(path.relative_to(ROOT))
        for path in (ROOT / "src/pages").rglob("*.tsx")
        if "createRoute(" in path.read_text(encoding="utf-8")
    }
    assert routed_files == expected_route_files

    for relative, route in {**protected_routes, **onboarding_routes, **b2b_routes}.items():
        source = (ROOT / relative).read_text(encoding="utf-8")
        assert "usePageGuard(" in source, relative
        assert f"currentPath: '{route}'" in source, relative
        if relative != "src/pages/parent/reports.tsx":
            assert "skipAuth: true" not in source, relative

    for relative, route in public_skip_auth_routes.items():
        source = (ROOT / relative).read_text(encoding="utf-8")
        assert "usePageGuard(" in source, relative
        assert f"currentPath: '{route}'" in source, relative
        assert "skipAuth: true" in source, relative
        assert "skipOnboarding: true" in source, relative

    for relative in onboarding_routes:
        source = (ROOT / relative).read_text(encoding="utf-8")
        assert "skipOnboarding: true" in source, relative

    for relative in b2b_routes:
        source = (ROOT / relative).read_text(encoding="utf-8")
        assert "requireFeature: 'b2bOnly'" in source, relative

    parent_reports = (ROOT / "src/pages/parent/reports.tsx").read_text(encoding="utf-8")
    assert parent_reports.count("usePageGuard(") == 2
    assert "function AuthenticatedParentReports()" in parent_reports
    assert "function SharedReportEntry" in parent_reports


def test_release_backend_url_does_not_use_local_loopback() -> None:
    """APP-001/IAP-001: release backend resolution must choose the public backend before dev loopback."""
    source = (ROOT / "src/lib/api/backend.ts").read_text(encoding="utf-8")
    granite = (ROOT / "granite.config.ts").read_text(encoding="utf-8")

    assert "function isPublicReleaseBackendUrl" in source
    assert "parsed.protocol !== 'https:'" in source
    assert "LOCAL_BACKEND_HOSTS.has(parsed.hostname)" in source
    assert "parsed.hostname.startsWith('192.168.')" in source
    assert "function devLoopbackBackendUrl()" in source
    assert "127.0.0.1:8765" not in source
    assert "if (!__DEV__) return isPublicReleaseBackendUrl(fromEnv) ? fromEnv.trim() : PUBLIC_BACKEND_URL;" in source

    assert "function getPublicReleaseBackendUrl()" in granite
    assert "parsed.protocol === 'https:' && !isLocal ? value : ''" in granite
    assert "'process.env.EXPO_PUBLIC_BACKEND_URL': JSON.stringify(getPublicReleaseBackendUrl())" in granite


def test_ait_build_uses_sanitized_env_allowlist() -> None:
    """AUTH-001/IAP-001: release AIT builds must not source the full secret-bearing .env."""
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    build_command = package["scripts"]["build"]
    release_check_command = package["scripts"]["release:security-check"]
    release_preflight_command = package["scripts"]["release:preflight"]
    build_script = (ROOT / "scripts/build-ait-release.js").read_text(encoding="utf-8")
    check_script = (ROOT / "scripts/release-security-check.js").read_text(encoding="utf-8")

    assert build_command == "node scripts/build-ait-release.js"
    assert release_check_command == "node scripts/release-security-check.js"
    assert release_preflight_command == "npm run typecheck && npm run release:security-check"
    assert "source .env" not in build_command
    assert "set -a" not in build_command
    assert "const ALLOWED_DOTENV_KEYS = new Set([" in build_script
    assert "SUPABASE_SERVICE_ROLE_KEY" not in build_script
    assert "AIT_DEPLOY_API_KEY" not in build_script
    assert "env.NODE_ENV = 'production';" in build_script
    assert "env.EXPO_PUBLIC_SHOW_DEV_MENU = '';" in build_script
    assert "Refusing to pass sensitive AIT build env key" in build_script
    assert "require('./release-security-check')" in build_script
    assert "assertReleaseArtifactIsClean(aitPath);" in build_script
    assert "assertReleaseArtifactIsClean(versionedPath);" in build_script
    assert "function assertReleaseArtifactIsClean(artifactPath)" in check_script
    assert "maxBuffer: 200 * 1024 * 1024" in check_script
    assert "FORBIDDEN_RELEASE_MARKERS.filter" in check_script
    assert "FORBIDDEN_RELEASE_PATTERNS" in check_script
    assert "FORBIDDEN_RELEASE_FILE_PATTERNS" in check_script
    assert "\\.env(?:\\.[^/]+)?$" in check_script
    assert "pem|key|p12|pfx|crt|cer" in check_script
    assert "contains forbidden release files" in check_script
    assert "['\"]?\\bTOSS[_-]?MTLS[_-]?MODE\\b['\"]?" in check_script
    assert "['\"]?mock" in check_script
    assert "['\"]?\\bREPORT[_-]?AI[_-]?MODE\\b['\"]?" in check_script
    assert "['\"]?\\bTOSS[_-]?RUNTIME[_-]?MODE\\b['\"]?" in check_script
    assert "['\"]?\\bEXPO_PUBLIC_SHOW_DEV_MENU\\b['\"]?" in check_script
    assert "EXPO_PUBLIC_SHOW_DEV_MENU" in check_script
    assert "sourceMappingURL" in check_script
    assert "0\\.0\\.0\\.0" in check_script
    assert "172\\.(?:1[6-9]|2\\d|3[01])" in check_script
    assert "169\\.254" in check_script
    assert "\\[::1\\]" in check_script
    assert "(Bearer|jwt|id_token|idToken|access_token|accessToken|refresh_token|refreshToken)" in check_script
    assert "accessToken" in check_script
    assert "refreshToken" in check_script
    assert "serviceRoleKey" in check_script
    assert "supabaseServiceRoleKey" in check_script
    assert "authorizationCode" in check_script
    assert "tossUserKey" in check_script
    assert "\\bemail\\b" in check_script
    assert "\\bphone\\b" in check_script
    assert "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY" in check_script
    assert "leakedPatterns" in check_script
    assert "contains forbidden release markers" in check_script
    assert "still contains source maps" in check_script
    assert "return fs.existsSync(canonicalPath) ? [canonicalPath] : [];" in check_script
    assert "No AIT artifacts found. Run npm run build before release:security-check." in check_script


def test_release_security_check_rejects_pattern_variants(tmp_path: Path) -> None:
    """SEC-AIT/SEC-MTLS: release scanner must catch non-exact mock/dev/local leak variants."""
    artifact = tmp_path / "taillog-pattern-leak.ait"
    with zipfile.ZipFile(artifact, "w") as archive:
        archive.writestr(
            "bundle.android.js",
            "\n".join(
                [
                    "const cfg = { TOSS_MTLS_MODE: 'mock' };",
                    "process.env.REPORT_AI_MODE = 'mock';",
                    "{\"TOSS_MTLS_MODE\":\"mock\",\"REPORT_AI_MODE\":\"mock\"}",
                    "{\"TOSS_RUNTIME_MODE\":\"DEV_LOCAL\",\"EXPO_PUBLIC_SHOW_DEV_MENU\":\"true\"}",
                    "require('components/shared/DevMenu');",
                    "setDevPlanOverride('PRO');",
                    "const localApi = 'http://127.0.0.1:8765/api/v1/auth/me';",
                    "const privateApi = 'http://172.16.0.4:8765/api/v1/auth/me';",
                    "const zeroApi = 'http://0.0.0.0:8765/health';",
                    "const loopbackV6 = 'http://[::1]:8765/health';",
                    "const token = 'Bearer eyJfake.jwt.payload';",
                    "const accessToken = 'eyJfake.jwt.payload';",
                    "serviceRoleKey=service-role-secret;",
                    "tossUserKey=toss-user-key;",
                    "authCode=auth-code-secret;",
                    "email=parent@example.com;",
                    "phone=010-1234-5678;",
                    "//# sourceMappingURL=bundle.android.js.map",
                ]
            ),
        )

    result = subprocess.run(
        ["node", "scripts/release-security-check.js", str(artifact)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    output = result.stdout + result.stderr
    assert "contains forbidden release markers" in output
    assert "TOSS[_-]?MTLS[_-]?MODE" in output
    assert "REPORT[_-]?AI[_-]?MODE" in output
    assert "TOSS[_-]?RUNTIME[_-]?MODE" in output
    assert "EXPO_PUBLIC_SHOW_DEV_MENU" in output
    assert "sourceMappingURL" in output
    assert "172\\.(?:1[6-9]|2\\d|3[01])" in output
    assert "accessToken" in output
    assert "serviceRoleKey" in output
    assert "tossUserKey" in output
    assert "authorization" in output


def test_release_security_check_rejects_secret_bearing_files(tmp_path: Path) -> None:
    """SEC-AIT/SEC-PII: release scanner must block secret files even if contents are not marker-shaped."""
    artifact = tmp_path / "taillog-secret-files.ait"
    with zipfile.ZipFile(artifact, "w") as archive:
        archive.writestr("bundle.android.js", "console.log('release bundle');")
        archive.writestr(".env.production", "EXPO_PUBLIC_SUPABASE_URL=https://gxvtgrcqkbdibkyeqyil.supabase.co")
        archive.writestr("certs/toss-client.p12", "binary-cert-placeholder")
        archive.writestr("keys/id_ed25519", "ssh-private-key-placeholder")

    result = subprocess.run(
        ["node", "scripts/release-security-check.js", str(artifact)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    output = result.stdout + result.stderr
    assert "contains forbidden release files" in output
    assert ".env.production" in output
    assert "certs/toss-client.p12" in output
    assert "keys/id_ed25519" in output


def test_strip_release_source_maps_recurses_nested_paths() -> None:
    """SEC-AIT: build wrapper must remove nested source maps before upload scanning."""
    script = (ROOT / "scripts/strip-release-source-maps.js").read_text(encoding="utf-8")

    assert "function removeSourceMaps(directory)" in script
    assert "withFileTypes: true" in script
    assert "entry.isDirectory()" in script
    assert "removeSourceMaps(fullPath);" in script
    assert "entry.isFile() && entry.name.endsWith('.map')" in script
    assert "sourceMappingURL" in script
    assert "removeSourceMaps(tempDir);" in script
    assert "removeSourceMaps(distPath);" in script


def test_live_security_audit_script_covers_supabase_blocker_requirements() -> None:
    """AUTH-001/IAP-001/B2B-001: live audit must be executable once Supabase access is restored."""
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    script = (ROOT / "scripts/live-security-audit.js").read_text(encoding="utf-8")
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")

    assert package["scripts"]["security:live-audit"] == "node scripts/live-security-audit.js"
    assert "security-rls-fixture*.json" in gitignore
    assert ".security-rls-fixture*.json" in gitignore
    assert "Parity: AUTH-001, IAP-001, B2B-001, SEC-EDGE, SEC-RLS, SEC-PII, SEC-AIT." in script
    assert "const DEFAULT_PROJECT_REF = 'gxvtgrcqkbdibkyeqyil';" in script
    assert "const DEFAULT_BACKEND_URL = 'https://taillogtoss-backend-l35lj.ondigitalocean.app';" in script
    assert "projectRef: DEFAULT_PROJECT_REF" in script
    assert "process.env.SUPABASE_PROJECT_REF" not in script
    assert "function resolveSupabaseMcpCredentials()" in script
    assert "SUPABASE_ACCESS_TOKEN: mcpCredentials.accessToken" in script
    assert "supabase', ['functions', 'list', '--project-ref', projectRef, '--output', 'json']" in script
    assert "supabase', ['migration', 'list', '--linked', '--output', 'json']" in script
    assert "supabase', ['secrets', 'list', '--project-ref', projectRef, '--output', 'json']" in script
    assert "['verify-iap-order', false]" in script
    assert "['grant-toss-points', true]" in script
    assert "['send-smart-message', true]" in script
    assert "['generate-report', true]" in script
    assert "['assign-b2b-role', false]" in script
    assert "['withdraw-user', false]" in script
    assert "INTERNAL_AUTH_FUNCTIONS" in script
    assert "'/auth/v1/user'" in script
    assert "REQUIRED_MIGRATION_IDS" in script
    assert "REQUIRED_SECRET_NAMES" in script
    assert "'TOSS_CLIENT_CERT_BASE64'" in script
    assert "'TOSS_CLIENT_KEY_BASE64'" in script
    assert "'TOSS_PII_DECRYPTION_KEY_BASE64'" in script
    assert "'OPENAI_API_KEY'" in script
    required_secret_block = script.split("const REQUIRED_SECRET_NAMES = [", 1)[1].split("];", 1)[0]
    assert "'TOSS_CLIENT_SECRET'" not in required_secret_block
    assert "'TOSS_CLIENT_SECRET'" in script
    assert "function normalizeSecretNames(raw)" in script
    assert "Missing required Supabase Edge secret names" in script
    assert "collectAuditFailure('required Edge secret names check'" in script
    assert "20260601001400" in script
    assert "20260601001500" in script
    assert "20260601001600" in script
    assert "20260601001700" in script
    assert "FORBIDDEN_LOG_MARKERS" in script
    assert "FORBIDDEN_LOG_PATTERNS" in script
    assert "function findForbiddenLogLeaks(logText)" in script
    assert "function normalizeLogTextForScan(logText)" in script
    assert "function flattenJsonForLogScan(value" in script
    assert "Live log export is empty; provide a real Edge log export" in script
    assert "keyName && keyedValue" in script
    assert "function assertNoForbiddenResponseLeaks(label, responseText)" in script
    assert "response body leaked forbidden sensitive values" in script
    assert "findForbiddenLogLeaks," in script
    assert "assertNoForbiddenResponseLeaks," in script
    assert "leaks.patterns" in script
    assert "SUPABASE_SERVICE_ROLE_KEY" in script
    assert "Bearer eyJ" in script
    assert "bearer-token" in script
    assert "authCode=" in script
    assert "accessToken" in script
    assert "refreshToken" in script
    assert "serviceRoleKey" in script
    assert "supabaseServiceRoleKey" in script
    assert "tossUserKey" in script
    assert "email" in script
    assert "phone" in script
    assert "--log-scan-only" in script
    assert "args.logScanOnly = true" in script
    assert "args.requireLogFile = true" in script
    assert "Missing --log-file for --log-scan-only" in script
    assert "&& !args.logScanOnly" in script
    assert "auditLogFile(args.logFile, true)" in script
    assert "--require-log-file" in script
    assert "const requireLiveLogFile = fullAudit || args.requireLogFile;" in script
    assert "auditLogFile(args.logFile, requireLiveLogFile)" in script
    assert "failure.label !== 'live log PII scan' || requireLiveLogFile" in script
    assert "SKIP log scan" in script
    assert "LOGIN_AUTH_CODE_PROBES" in script
    assert "security-probe-expired-or-reused-auth-code" in script
    assert "referrer: 'SANDBOX'" in script
    assert "nonce: 'security-probe-nonce-20260601'" in script
    assert "postEdgeProbe(supabaseUrl, 'login-with-toss'" in script
    assert "const responseText = await response.text();" in script
    assert "assertNoForbiddenResponseLeaks(`edge ${name}`, responseText);" in script
    assert "assertNoForbiddenResponseLeaks(`backend ${probe.method} ${probe.path}`, responseText);" in script
    assert "PASS auth code probe login-with-toss" in script
    assert "EDGE_PROBES" in script
    assert "--probe-edge" in script
    assert "--edge-probes-only" in script
    assert "const fullAudit = !args.edgeProbesOnly && !args.backendProbesOnly" in script
    assert "collectAuditFailure('functions verify_jwt management check'" in script
    assert "collectAuditFailure('public Edge spoof probes'" in script
    assert "collectAuditFailure('public Backend auth probes'" in script
    assert "function auditReleaseArtifact()" in script
    assert "node', ['scripts/release-security-check.js']" in script
    assert "collectAuditFailure('release artifact security scan'" in script
    assert "PASS release artifact security scan" in script
    assert "function auditLocalRuntimeHardening()" in script
    assert "collectAuditFailure('local runtime hardening source scan'" in script
    assert "Local runtime hardening markers missing" in script
    assert "PASS local runtime hardening source scan" in script
    assert "TOSS_CLIENT_CERT_BASE64 and TOSS_CLIENT_KEY_BASE64 must be set" in script
    assert "Deno.createHttpClient is required for real Toss mTLS calls" in script
    assert "OPENAI_API_KEY is missing for REPORT_AI_MODE=real" in script
    assert "value === 'sandbox_real'" in script
    assert "value === 'prod_ready'" in script
    assert "function auditLocalFunctionConfig()" in script
    assert "parseLocalFunctionConfig(configText)" in script
    assert "LOCAL_EXPECTED_FUNCTION_VERIFY_JWT" in script
    assert "collectAuditFailure('local Edge function config/source auth scan'" in script
    assert "PASS local Edge function config/source auth scan" in script
    assert "local source no longer contains internal /auth/v1/user verification" in script
    assert "local source reads spoofable x-user-role header" in script
    assert "local source no longer derives auth context from JWT" in script
    assert "login-with-toss local source must consume authCode before profile fetch or session bridge" in script
    assert "function auditLocalRlsPolicySource()" in script
    assert "REQUIRED_RLS_TABLES" in script
    assert "SERVICE_ONLY_RLS_TABLES" in script
    assert "collectAuditFailure('local RLS policy source scan'" in script
    assert "PASS local RLS policy source scan" in script
    assert "Missing local RLS enable statements for" in script
    assert "exposes direct ${role} RLS access" in script
    assert "subscriptions latest lock migration still contains" in script
    assert "toss_orders latest lock migration still contains" in script
    assert "org_dogs latest policy regressed to broad is_org_member access" in script
    assert "if (args.probeRls || fullAudit)" in script
    assert "collectAuditFailure('authenticated RLS cross-access probes'" in script
    assert "security live audit incomplete" in script
    assert "report_date: '2026-06-01'" in script
    assert "const MALFORMED_JWT = 'not-a-valid.jwt';" in script
    assert "const EXPIRED_TEST_JWT = [" in script
    assert "expired-test-signature" in script
    assert "bearerToken = anonKey" in script
    assert "const supabaseUrl = `https://${projectRef}.supabase.co`" in script
    assert "assertProbePairBlocked(probe.name, 'malformed-jwt'" in script
    assert "assertProbePairBlocked(probe.name, 'expired-test-jwt'" in script
    assert "malformed_jwt=" in script
    assert "expired_test_jwt=" in script
    assert "'x-user-role'] = spoofRole" in script
    assert "x-user-role spoof probe unexpectedly succeeded" in script
    assert "x-user-role spoof changed status" in script
    assert "EXPO_PUBLIC_SUPABASE_ANON_KEY" in script
    assert "BACKEND_PROBES" in script
    assert "BACKEND_MUTATION_PROBES" in script
    assert "'/api/v1/dogs/'" in script
    assert "'/api/v1/logs/quick'" in script
    assert "'/api/v1/coaching/generation-jobs'" in script
    assert "'/api/v1/settings/'" in script
    assert "'/api/v1/subscription/iap/verify'" in script
    assert "'/api/v1/report/'" in script
    assert "if (probe.body) headers['content-type'] = 'application/json';" in script
    assert "body: probe.body ? JSON.stringify(probe.body) : undefined" in script
    assert "...BACKEND_MUTATION_PROBES" in script
    assert "--probe-backend" in script
    assert "--backend-probes-only" in script
    assert "--backend-url" in script
    assert "--probe-rls" in script
    assert "--rls-probes-only" in script
    assert "--rls-allow-partial" in script
    assert "--rls-fixture-file" in script
    assert "applyRlsFixtureFile(args, args.rlsFixtureFile)" in script
    assert "Unknown RLS fixture fields" in script
    assert "attackerJwt: 'rlsAttackerJwt'" in script
    assert "victimUserId: 'rlsVictimUserId'" in script
    assert "dogId: 'rlsDogId'" in script
    assert "subscriptionUserId: 'rlsSubscriptionUserId'" in script
    assert "rlsAllowPartial: false" in script
    assert "getMissingRequiredRlsResourceArgs" in script
    assert "Missing required RLS resource ids for complete probe" in script
    assert "Pass --rls-allow-partial only for a deliberately scoped diagnostic run." in script
    assert "--rls-attacker-jwt" in script
    assert "--rls-victim-user-id" in script
    assert "--rls-generation-job-id" in script
    assert "SECURITY_RLS_ATTACKER_JWT" in script
    assert "SECURITY_RLS_VICTIM_USER_ID" in script
    assert "SECURITY_RLS_GENERATION_JOB_ID" in script
    assert "assertRlsCrossUserFixture(args)" in script
    assert "assertRlsAttackerJwtClaims(attackerPayload)" in script
    assert "const UUID_V4ISH_PATTERN" in script
    assert "FORBIDDEN_RLS_ATTACKER_JWT_ROLES" in script
    assert "RLS attacker JWT subject must be a Supabase user UUID" in script
    assert "RLS attacker JWT role ${role} cannot prove user-level RLS isolation" in script
    assert "RLS attacker JWT is missing numeric exp claim" in script
    assert "RLS attacker JWT is expired; refresh the attacker fixture" in script
    assert "RLS attacker JWT subject matches --rls-victim-user-id" in script
    assert "RLS attacker JWT subject matches --rls-subscription-user-id" in script
    assert "buildRlsRestProbes" in script
    assert "buildRlsRestWriteProbes" in script
    assert "buildRlsRestInsertProbes" in script
    assert "buildRlsBackendProbes" in script
    assert "buildRlsBackendMutationProbes" in script
    assert "authenticated RLS cross-access probes" in script
    assert "RLS REST ${probe.table}?${probe.query} leaked" in script
    assert "assertNoForbiddenResponseLeaks(`rls rest ${probe.table}`, text);" in script
    assert "method: 'PATCH'" in script
    assert "prefer: 'return=representation'" in script
    assert "JSON.stringify({})" in script
    assert "RLS REST write ${probe.table}?${probe.query} allowed" in script
    assert "assertNoForbiddenResponseLeaks(`rls rest write ${probe.table}`, text);" in script
    assert "PASS rls rest write probe" in script
    assert "method: 'POST'" in script
    assert "RLS REST insert ${probe.table} allowed forged row to attacker JWT" in script
    assert "assertNoForbiddenResponseLeaks(`rls rest insert ${probe.table}`, text);" in script
    assert "PASS rls rest insert probe" in script
    assert "security-probe-idempotency-" in script
    assert "security-probe-order-" in script
    assert "args.rlsVictimUserId || args.rlsSubscriptionUserId" in script
    assert "ai_tokens_remaining: 999" in script
    assert "grant_status: 'granted'" in script
    assert "unexpectedly returned ${response.status} to attacker JWT" in script
    assert "assertNoForbiddenResponseLeaks(`rls backend ${probe.method} ${probe.path}`, text);" in script
    assert "body: probe.body ? JSON.stringify(probe.body) : undefined" in script
    assert "if (probe.body) headers['content-type'] = 'application/json';" in script
    assert "'dogs'" in script
    assert "'dog_env'" in script
    assert "'behavior_logs'" in script
    assert "'case_intakes'" in script
    assert "'user_training_status'" in script
    assert "'training_behavior_snapshots'" in script
    assert "'ai_recommendation_snapshots'" in script
    assert "'ai_recommendation_feedback'" in script
    assert "'ai_coaching'" in script
    assert "'action_tracker'" in script
    assert "'coaching_generation_jobs'" in script
    assert "'subscriptions'" in script
    assert "'user_entitlements'" in script
    assert "'user_settings'" in script
    assert "'toss_orders'" in script
    assert "'media_assets'" in script
    assert "'organizations'" in script
    assert "'org_members'" in script
    assert "'org_dogs'" in script
    assert "'dog_assignments'" in script
    assert "'org_subscriptions'" in script
    assert "'daily_reports'" in script
    assert "security-probe-b2b-order-" in script
    assert "plan_type: 'center_basic'" in script
    assert "/api/v1/report/org/" in script
    assert "/api/v1/training/status" in script
    assert "/api/v1/org/members/invite" in script
    assert "/api/v1/org/dogs/enroll" in script
    assert "/api/v1/org/assignments" in script
    assert "security-rls-cross-user-probe" in script
    assert "'/api/v1/auth/me'" in script
    assert "'/api/v1/subscription/'" in script
    assert "'/api/v1/dashboard/'" in script
    assert "'/api/v1/dogs/'" in script
    assert "'/api/v1/coaching/usage/daily'" in script
    assert "backend auth probe" in script
    assert "['no-auth', null]" in script
    assert "['malformed-jwt', MALFORMED_JWT]" in script
    assert "['expired-test-jwt', EXPIRED_TEST_JWT]" in script
    assert "expected 401" in script
    assert "backend ${scenario} x-user-role spoof probe" in script
    assert "backend ${scenario} x-user-role spoof changed status" in script
    assert "statuses.join(' ')" in script


def test_security_preflight_workflow_runs_release_and_static_gates() -> None:
    """SEC-AIT/SEC-EDGE: CI must keep release and static security gates visible on PRs."""
    workflow = (ROOT / ".github/workflows/security-preflight.yml").read_text(encoding="utf-8")
    github_claude = (ROOT / ".github/CLAUDE.md").read_text(encoding="utf-8")
    workflow_claude = (ROOT / ".github/workflows/CLAUDE.md").read_text(encoding="utf-8")
    github_rules = (ROOT / ".github/AGENTS.md").read_text(encoding="utf-8")
    workflow_rules = (ROOT / ".github/workflows/AGENTS.md").read_text(encoding="utf-8")

    assert "AUTH-001" in github_claude
    assert "SEC-AIT" in github_claude
    assert "AUTH-001" in workflow_claude
    assert "test_supabase_security_static.py" in workflow_claude
    assert "주인님이라고 불러" in github_rules
    assert "주인님이라고 불러" in workflow_rules
    assert "name: Security Preflight" in workflow
    assert "node-version-file: .nvmrc" in workflow
    assert "npm ci" in workflow
    assert "Backend/venv/bin/pip install -r Backend/requirements.txt" in workflow
    assert "npm run typecheck" in workflow
    assert "node --check scripts/build-ait-release.js" in workflow
    assert "node --check scripts/release-security-check.js" in workflow
    assert "node --check scripts/live-security-audit.js" in workflow
    assert "Backend/venv/bin/pytest" in workflow
    assert "Backend/tests/test_frontend_security_static.py" in workflow
    assert "Backend/tests/test_supabase_security_static.py" in workflow
    assert "Backend security regression tests" in workflow
    for backend_security_test in [
        "Backend/tests/test_security.py",
        "Backend/tests/test_log_redaction.py",
        "Backend/tests/test_org_security.py",
        "Backend/tests/test_coaching_security.py",
        "Backend/tests/test_report_service.py",
        "Backend/tests/test_referral_security.py",
        "Backend/tests/test_subscription_security.py",
        "Backend/tests/test_subscription_entitlements.py",
        "Backend/tests/test_log_security.py",
        "Backend/tests/test_dashboard_service.py",
    ]:
        assert backend_security_test in workflow
    assert "npm run test:edge" in workflow
    assert "npm run release:security-check" in workflow
    assert "taillog-app.ait is not checked in" in workflow
    assert "npm run build enforces the release artifact scan before upload" in workflow


def test_backend_client_validates_session_token_before_authorization_header() -> None:
    """AUTH-001: frontend must not attach forged local sessions to FastAPI requests."""
    source = (ROOT / "src/lib/api/backend.ts").read_text(encoding="utf-8")
    sanitize_section = source[
        source.index("function sanitizeCallerHeaders"):
        source.index("function redactPerformancePath")
    ]
    protected_section = source[
        source.index("async function getAccessTokenOrThrow"):
        source.index("async function getAccessTokenOptional")
    ]
    optional_section = source[
        source.index("async function getAccessTokenOptional"):
        source.index("function toBackendApiError")
    ]

    assert "function isJwtLike" in source
    assert "supabase.auth.getUser(accessToken)" in source
    assert "await supabase.auth.signOut()" in source
    assert "const UNTRUSTED_AUTH_HEADER_NAMES = new Set([" in source
    assert "'authorization'" in source
    assert "'apikey'" in source
    assert "'x-user-role'" in source
    assert "'x-user-id'" in source
    assert "'x-org-role'" in source
    assert "UNTRUSTED_AUTH_HEADER_NAMES.has(key.toLowerCase())" in sanitize_section
    assert "...sanitizeCallerHeaders(options?.headers)" in source
    assert "validateAccessToken(data.session?.access_token, true)" in protected_section
    assert "validateAccessToken(data.session?.access_token, false)" in optional_section


def test_backend_client_dev_logs_are_redacted() -> None:
    """AUTH-001: debug logs must not print authCode/JWT/Toss userKey/PII values in cleartext."""
    source = (ROOT / "src/lib/api/backend.ts").read_text(encoding="utf-8")
    redaction = (ROOT / "src/lib/api/logRedaction.ts").read_text(encoding="utf-8")
    tests = (ROOT / "src/lib/api/__tests__/logRedaction.test.ts").read_text(encoding="utf-8")

    assert "redactSerializedBodyForLog(serializedBody)" in source
    assert "redactLogValue(detail)" in source
    assert "console.log(`[FE-BE] ${method} ${path} body:`, serializedBody)" not in source
    assert "console.warn(`[FE-BE] ${method} ${path} → ${response.status}`, detail)" not in source

    for marker in [
        "authorizationCode",
        "auth[_-]?code",
        "access[_-]?token",
        "refresh[_-]?token",
        "id[_-]?token",
        "toss[_-]?user[_-]?key",
        "service[_-]?role[_-]?key",
        "supabase[_-]?service[_-]?role[_-]?key",
        "api[_-]?key",
        "Bearer",
        "JWT_LIKE",
        "EMAIL",
        "PHONE",
    ]:
        assert marker in redaction

    assert "masks auth tokens, Toss userKey, and PII inside structured payloads" in tests
    assert "redacts serialized request bodies before dev logging" in tests


def test_auth_edge_callers_validate_session_token_before_authorization_header() -> None:
    """AUTH-001: frontend must not attach forged local sessions to protected Edge functions."""
    source = (ROOT / "src/lib/api/auth.ts").read_text(encoding="utf-8")
    withdraw_section = source[
        source.index("export async function withdrawUser"):
        source.index("/** 현재 세션 확인 */")
    ]
    assign_section = source[
        source.index("export async function assignB2BRole"):
    ]

    assert "async function getVerifiedAccessToken" in source
    assert "supabase.auth.getUser(accessToken)" in source
    assert "await clearInvalidSession()" in source
    assert "const accessToken = await getVerifiedAccessToken({ refreshIfMissing: true });" in withdraw_section
    assert "const accessToken = await getVerifiedAccessToken();" in assign_section
    assert "headers: { Authorization: `Bearer ${accessToken}` }" in withdraw_section
    assert "headers: { Authorization: `Bearer ${accessToken}` }" in assign_section


def test_auth_context_validates_auth_state_change_session_before_marking_authenticated() -> None:
    """AUTH-001: AuthProvider must not trust forged onAuthStateChange session.user blindly."""
    source = (ROOT / "src/stores/AuthContext.tsx").read_text(encoding="utf-8")
    verifier_section = source[
        source.index("async function verifySessionUser"):
        source.index("function buildUserFromSession")
    ]
    listener_section = source[
        source.index("supabase.auth.onAuthStateChange"):
        source.index("return () =>")
    ]

    assert "session?.access_token" in verifier_section
    assert "isJwtLike(accessToken)" in verifier_section
    assert "supabase.auth.getUser(accessToken)" in verifier_section
    assert "await authApi.logout().catch" in verifier_section
    assert "const verifiedUser = await verifySessionUser(session as SessionLike);" in listener_section
    assert "buildUserFromSessionWithPublicRole(" in listener_section
    assert "verifiedUser," in listener_section
    assert "session.user as SessionUserLike" not in listener_section


def test_auth_context_bootstrap_uses_verified_session_and_public_role() -> None:
    """AUTH-001/B2B-001: cold-start auth restore must use verified session and public role lookup."""
    source = (ROOT / "src/stores/AuthContext.tsx").read_text(encoding="utf-8")
    bootstrap_section = source[
        source.index("const bootstrap = async () =>"):
        source.index("void bootstrap();")
    ]

    assert "const session = await authApi.getSession();" in bootstrap_section
    assert "authApi.getSession()" in bootstrap_section
    assert "buildUserFromSessionWithPublicRole(" in bootstrap_section
    assert "session.user as SessionUserLike" in bootstrap_section
    assert "supabase.auth.getSession()" not in bootstrap_section


def test_b2b_route_guard_requires_verified_role_even_when_dog_list_is_loading() -> None:
    """AUTH-001/B2B-001: B2B pages must not open while role resolution is missing."""
    tests = (ROOT / "src/lib/hooks/__tests__/usePageGuard.test.ts").read_text(encoding="utf-8")
    role_tests = (ROOT / "src/lib/guards/__tests__/roleGuard.test.ts").read_text(encoding="utf-8")

    assert "b2bOnly feature redirects authenticated users until a verified B2B role is available" in tests
    assert "b2bOnly feature still runs auth guard before role checks" in tests
    assert "role lookup 완료 전 undefined 역할을 허용하지 않는다" in role_tests


def test_frontend_role_resolution_requires_public_role_for_b2b_privileges() -> None:
    """AUTH-001/B2B-001: forged user_metadata.role must not open B2B route guards by itself."""
    source = (ROOT / "src/stores/authRole.ts").read_text(encoding="utf-8")
    tests = (ROOT / "src/stores/__tests__/AuthContext.test.ts").read_text(encoding="utf-8")

    assert "if (isB2BAuthRole(input.publicRole)) return input.publicRole;" in source
    assert "isB2BAuthRole(input.sessionRole)" not in source
    assert "does not trust B2B session metadata when public role is not B2B" in tests
    assert "does not trust B2B session metadata when public role lookup is unavailable" in tests


def test_notification_edge_caller_validates_session_token_before_authorization_header() -> None:
    """AUTH-001/MSG-001: send-smart-message must not rely on caller-controlled body/userId only."""
    source = (ROOT / "src/lib/api/notification.ts").read_text(encoding="utf-8")
    send_section = source[
        source.index("export async function sendSmartMessage"):
        source.index("interface BackendNotificationRow")
    ]

    assert "async function getVerifiedAccessToken" in source
    assert "supabase.auth.getUser(accessToken)" in source
    assert "await clearInvalidSession()" in source
    assert "const accessToken = await getVerifiedAccessToken();" in send_section
    assert "supabase.functions.invoke('send-smart-message'" in send_section
    assert "headers: { Authorization: `Bearer ${accessToken}` }" in send_section


def test_frontend_edge_function_invokes_are_allowlisted_and_auth_guarded() -> None:
    """AUTH-001/IAP-001/MSG-001/B2B-001: UI must not directly call privileged Edge functions."""
    allowed_callers = {
        "login-with-toss": {"src/lib/api/auth.ts"},
        "withdraw-user": {"src/lib/api/auth.ts"},
        "assign-b2b-role": {"src/lib/api/auth.ts"},
        "verify-iap-order": {"src/lib/api/iap.ts", "src/lib/api/subscription.ts"},
        "send-smart-message": {"src/lib/api/notification.ts"},
        "generate-report": {"src/lib/api/report.ts"},
    }
    protected_functions = set(allowed_callers) - {"login-with-toss"}
    token_guard_markers = {
        "withdraw-user": "getVerifiedAccessToken",
        "assign-b2b-role": "getVerifiedAccessToken",
        "verify-iap-order": "resolveAccessTokenForInvoke",
        "send-smart-message": "getVerifiedAccessToken",
        "generate-report": "getVerifiedAccessToken",
    }

    violations: list[str] = []
    found: dict[str, set[str]] = {name: set() for name in allowed_callers}
    invoke_pattern = re.compile(r"supabase\.functions\.invoke[\s\S]{0,200}?\(\s*['\"]([^'\"]+)['\"]")

    for path in (ROOT / "src").rglob("*.ts*"):
        relative = str(path.relative_to(ROOT))
        if "__tests__" in relative:
            continue
        source = path.read_text(encoding="utf-8")

        for match in invoke_pattern.finditer(source):
            function_name = match.group(1)
            if function_name not in allowed_callers:
                violations.append(f"{relative}: unexpected Edge invoke {function_name}")
                continue
            if relative not in allowed_callers[function_name]:
                violations.append(f"{relative}: unauthorized caller for {function_name}")
                continue

            found[function_name].add(relative)

            if function_name in protected_functions:
                call_window = source[match.start(): match.start() + 500]
                token_guard = token_guard_markers[function_name]
                if token_guard not in source:
                    violations.append(f"{relative}: {function_name} lacks {token_guard}")
                if "Authorization: `Bearer ${" not in call_window:
                    violations.append(f"{relative}: {function_name} lacks Authorization header")

    missing = {
        function_name: callers - found[function_name]
        for function_name, callers in allowed_callers.items()
        if function_name != "login-with-toss" and not found[function_name]
    }

    assert violations == []
    assert missing == {}


def test_rewarded_ad_callbacks_do_not_grant_points_or_tokens() -> None:
    """AD-001/AUTH-001: client-side rewarded callbacks must not mint server rewards."""
    reward_button_usages: list[tuple[str, str]] = []
    forbidden_markers = [
        "grant-toss-points",
        "process-point-events",
        "point_events",
        "point_transactions",
        "ai_tokens_remaining",
        "ai_tokens_total",
        "verifyIAPOrder",
        "verifyAndGrant",
        "requestBackend<",
        "requestBackend(",
        "supabase.functions.invoke",
        "supabase.from",
    ]
    safe_reward_callbacks = {
        "setIsDetailUnlocked(true)",
        "navigation.navigate('/coaching/result')",
        "onRewarded={() => {}}",
    }

    for path in (ROOT / "src").rglob("*.tsx"):
        relative = str(path.relative_to(ROOT))
        if "__tests__" in relative:
            continue
        source = path.read_text(encoding="utf-8")
        if "<RewardedAdButton" not in source:
            continue

        for match in re.finditer(r"<RewardedAdButton[\s\S]{0,800}?/>", source):
            block = match.group(0)
            reward_button_usages.append((relative, block))
            for marker in forbidden_markers:
                assert marker not in block, f"{relative} rewarded callback contains {marker}"
            assert any(callback in block for callback in safe_reward_callbacks), relative

    assert {relative for relative, _block in reward_button_usages} == {
        "src/pages/coaching/CoachingDetailContent.tsx",
        "src/pages/dashboard/analysis.tsx",
        "src/pages/onboarding/survey-result.tsx",
    }


def test_notification_history_is_backend_only_from_frontend() -> None:
    """AUTH-001/MSG-001: notification history must be bound to backend JWT identity."""
    source = (ROOT / "src/lib/api/notification.ts").read_text(encoding="utf-8")

    assert "withBackendFallback" not in source
    assert ".from('noti_history')" not in source
    assert '.from("noti_history")' not in source
    assert "/api/v1/notification/" in source
    assert "/api/v1/notification/${notificationId}/read" in source


def test_settings_logs_reports_training_are_backend_only_from_frontend() -> None:
    """AUTH-001/RLS: sensitive user/dog/org data must not use direct Supabase fallbacks."""
    targets = {
        "src/lib/api/settings.ts": [
            "user_settings",
        ],
        "src/lib/api/log.ts": [
            "behavior_logs",
        ],
        "src/lib/api/report.ts": [
            "daily_reports",
            "parent_interactions",
        ],
        "src/lib/api/training.ts": [
            "user_training_status",
        ],
        "src/lib/api/training.rows.ts": [
            "user_training_status",
        ],
        "src/lib/api/training.feedback.ts": [
            "user_training_status",
            "training_step_attempts",
        ],
    }

    for relative, tables in targets.items():
        source = (ROOT / relative).read_text(encoding="utf-8")
        assert "withBackendFallback" not in source
        for table in tables:
            assert f".from('{table}')" not in source
            assert f'.from("{table}")' not in source

    report_source = (ROOT / "src/lib/api/report.ts").read_text(encoding="utf-8")
    assert "supabase.auth.getUser(accessToken)" in report_source
    assert "supabase.functions.invoke<EdgeResult<DailyReport>>" in report_source
    assert "headers: { Authorization: `Bearer ${accessToken}` }" in report_source


def test_dog_profile_data_is_backend_only_from_frontend() -> None:
    """AUTH-001/RLS: dogs/dog_env access must be bound to backend JWT identity."""
    dog_source = (ROOT / "src/lib/api/dog.ts").read_text(encoding="utf-8")
    stage1_source = (ROOT / "src/pages/onboarding/stage1-form.tsx").read_text(encoding="utf-8")

    for source in [dog_source, stage1_source]:
        assert ".from('dogs')" not in source
        assert '.from("dogs")' not in source
        assert ".from('dog_env')" not in source
        assert '.from("dog_env")' not in source

    assert "/api/v1/dogs/" in dog_source
    assert "/api/v1/onboarding/survey/stage1" in dog_source
    assert "await updateDog(dog.id, { profile_image_url: publicUrl });" in stage1_source


def test_rewarded_ad_fallback_does_not_grant_reward() -> None:
    """AD-001/IAP-001: ad no-fill/error paths must not be treated as earned rewards."""
    policy = (ROOT / "src/types/ads.ts").read_text(encoding="utf-8")
    hook = (ROOT / "src/lib/hooks/useRewardedAd.ts").read_text(encoding="utf-8")

    assert "unlock_on_no_fill: false" in policy
    assert "onRewarded: () =>" in hook
    assert "tracker.adRewarded" in hook
    assert "unlock_on_no_fill) onRewarded()" not in hook


def test_ad_and_share_surfaces_do_not_call_reward_grant_apis() -> None:
    """AD-001/GROWTH-001/IAP-001: client ad/share surfaces must not mint rewards directly."""
    surfaces = {
        "src/lib/hooks/useRewardedAd.ts": (ROOT / "src/lib/hooks/useRewardedAd.ts").read_text(
            encoding="utf-8"
        ),
        "src/components/shared/ads/RewardedAdButton.tsx": (
            ROOT / "src/components/shared/ads/RewardedAdButton.tsx"
        ).read_text(encoding="utf-8"),
        "src/components/features/dashboard/ShareRewardCard.tsx": (
            ROOT / "src/components/features/dashboard/ShareRewardCard.tsx"
        ).read_text(encoding="utf-8"),
    }
    forbidden = [
        "grantContactsViralProDayPass",
        "grant-toss-points",
        "verifyAndGrant",
        "verify-iap-order",
        "requestBackend",
        "/api/v1/referral/reward/contacts-viral",
        "/api/v1/subscription/iap/verify",
        "ai_tokens",
    ]

    violations = [
        f"{relative}: {marker}"
        for relative, source in surfaces.items()
        for marker in forbidden
        if marker in source
    ]
    assert violations == []

    share_source = surfaces["src/components/features/dashboard/ShareRewardCard.tsx"]
    assert "Share.share" in share_source
    assert "tracker.shareRewardSent()" in share_source


def test_contacts_viral_reward_grant_is_limited_to_sdk_send_event() -> None:
    """GROWTH-001/IAP-001: contactsViral reward requests must stay behind the SDK sendViral event."""
    allowed_callers = {
        "src/lib/api/referral.ts",
        "src/lib/hooks/useContactsViralReward.ts",
    }
    callers: list[str] = []

    for path in (ROOT / "src").rglob("*.ts*"):
        relative = str(path.relative_to(ROOT))
        if "__tests__" in relative:
            continue
        source = path.read_text(encoding="utf-8")
        if (
            "grantContactsViralProDayPass" in source
            or "/api/v1/referral/reward/contacts-viral" in source
        ):
            callers.append(relative)

    assert sorted(callers) == sorted(allowed_callers)

    hook = (ROOT / "src/lib/hooks/useContactsViralReward.ts").read_text(encoding="utf-8")
    send_event_section = hook[
        hook.index("if (event.type === 'sendViral')"):
        hook.index("if (event.data.closeReason === 'noReward')")
    ]
    assert "contactsViral({" in hook
    assert "grantMutation.mutate(event.data);" in send_event_section
    assert "grantMutation.mutate" not in hook[: hook.index("if (event.type === 'sendViral')")]


def test_contacts_viral_backend_rejects_missing_or_tampered_reward_metadata() -> None:
    """GROWTH-001/IAP-001: moduleId alone must not mint a day-pass reward."""
    source = (ROOT / "Backend/app/features/referral/router.py").read_text(encoding="utf-8")
    tests = (ROOT / "Backend/tests/test_referral_security.py").read_text(encoding="utf-8")

    assert "body.reward_amount != CONTACTS_VIRAL_REWARD_AMOUNT" in source
    assert "body.reward_unit != CONTACTS_VIRAL_REWARD_UNIT" in source
    assert "Invalid contactsViral reward metadata" in source
    assert "test_contacts_viral_reward_rejects_missing_reward_metadata" in tests
    assert "test_contacts_viral_reward_rejects_tampered_reward_metadata" in tests


def test_ai_coaching_client_uses_backend_only() -> None:
    """AUTH-001/AI-001: ai_coaching is service-role-only; clients must not bypass backend ownership checks."""
    source = (ROOT / "src/lib/api/coaching.ts").read_text(encoding="utf-8")

    assert "from './supabase'" not in source
    assert ".from('ai_coaching')" not in source
    assert '.from("ai_coaching")' not in source
    assert "withBackendFallback" not in source
    assert "/api/v1/coaching/" in source


def test_subscription_client_uses_backend_for_state_and_history() -> None:
    """AUTH-001/IAP-001: subscription state and order history must be bound to backend JWT identity."""
    source = (ROOT / "src/lib/api/subscription.ts").read_text(encoding="utf-8")

    assert "withBackendFallback" not in source
    assert ".from('subscriptions')" not in source
    assert '.from("subscriptions")' not in source
    assert ".from('toss_orders')" not in source
    assert '.from("toss_orders")' not in source
    assert "/api/v1/subscription/" in source
    assert "/api/v1/subscription/orders" in source


def test_iap_b2c_pending_recovery_uses_backend_for_toss_orders() -> None:
    """AUTH-001/IAP-001: B2C pending recovery must not read toss_orders with caller-controlled userId."""
    source = (ROOT / "src/lib/api/iap.ts").read_text(encoding="utf-8")
    section = source[
        source.index("export async function getPendingOrders("):
        source.index("export async function completeProductGrant")
    ]
    stale_section = source[
        source.index("async function resolveStalePendingOrderReason"):
        source.index("async function dismissStalePendingOrder")
    ]

    assert ".from('toss_orders')" not in section
    assert '.from("toss_orders")' not in section
    assert ".from('toss_orders')" not in stale_section
    assert '.from("toss_orders")' not in stale_section
    assert "/api/v1/subscription/orders/pending" in section
    assert "/api/v1/subscription/orders/stale-status" in stale_section


def test_iap_client_never_reads_toss_orders_directly() -> None:
    """AUTH-001/IAP-001/B2B-001: order recovery must be bound to backend identity, not client filters."""
    source = (ROOT / "src/lib/api/iap.ts").read_text(encoding="utf-8")

    assert ".from('toss_orders')" not in source
    assert '.from("toss_orders")' not in source
    assert "/api/v1/subscription/orders/pending/b2b" in source
    assert "/api/v1/subscription/iap/verify" in source


def test_org_dogs_pii_is_backend_only_from_frontend() -> None:
    """B2B-001/AUTH-001: org_dogs_pii has no public RLS path; frontend must use backend enroll."""
    source = (ROOT / "src/lib/api/org.ts").read_text(encoding="utf-8")
    enroll_section = source[
        source.index("export async function enrollDog"):
        source.index("/** 강아지 퇴소 */")
    ]

    assert ".from('org_dogs_pii')" not in source
    assert '.from("org_dogs_pii")' not in source
    assert "/api/v1/org/dogs/enroll" in enroll_section
    assert "parent_phone_enc" in enroll_section


def test_b2b_org_client_uses_backend_for_sensitive_org_tables() -> None:
    """B2B-001/AUTH-001: org membership/dog/assignment reads and writes must be backend-bound."""
    source = (ROOT / "src/lib/api/org.ts").read_text(encoding="utf-8")
    subscription_hook = (ROOT / "src/lib/hooks/useOrgSubscription.ts").read_text(encoding="utf-8")
    sensitive_tables = [
        "dogs",
        "org_members",
        "org_dogs",
        "org_dogs_pii",
        "dog_assignments",
        "behavior_logs",
        "daily_reports",
        "org_analytics_daily",
        "org_subscriptions",
    ]

    for source_text in [source, subscription_hook]:
        for table in sensitive_tables:
            assert f".from('{table}')" not in source_text
            assert f'.from("{table}")' not in source_text

    assert "withBackendFallback" not in source
    assert "withBackendFallback" not in subscription_hook
    assert "/api/v1/org/dogs/create" in source
    assert "/api/v1/org/members/invite" in source
    assert "/api/v1/org/assignments/unassign" in source
    assert "/api/v1/org/assignments/mine" in source
    assert "/api/v1/org/${orgId}/subscription" in subscription_hook
    assert "/api/v1/org/subscription/trainer/mine" in subscription_hook


def test_rewarded_ad_callbacks_do_not_grant_points_tokens_or_entitlements() -> None:
    """AD-001/IAP-001: ad reward callbacks must not become client-callable reward minting APIs."""
    rewarded_hook = (ROOT / "src/lib/hooks/useRewardedAd.ts").read_text(encoding="utf-8")
    survey_result = (ROOT / "src/pages/onboarding/survey-result.tsx").read_text(encoding="utf-8")
    analysis = (ROOT / "src/pages/dashboard/analysis.tsx").read_text(encoding="utf-8")
    coaching = (ROOT / "src/pages/coaching/CoachingDetailContent.tsx").read_text(encoding="utf-8")

    assert "onRewarded();" in rewarded_hook
    assert "tracker.adRewarded" in rewarded_hook
    assert "setIsDetailUnlocked(true)" in survey_result
    assert "navigation.navigate('/coaching/result')" in analysis
    assert "onRewarded={() => {}}" in coaching

    client_side_ad_sources = [rewarded_hook, survey_result, analysis, coaching]
    forbidden_reward_mutations = [
        "grant-toss-points",
        "process-point-events",
        "process-referral",
        "/api/v1/referral/reward/contacts-viral",
        "/api/v1/subscription/iap/verify",
        "/api/v1/coaching/generate",
        "ai_tokens_remaining",
        "ai_tokens_total",
        "PRO_DAY_PASS",
        "user_entitlements",
        "point_events",
        "point_transactions",
        ".from('subscriptions')",
        '.from("subscriptions")',
        ".from('toss_orders')",
        '.from("toss_orders")',
    ]

    for source in client_side_ad_sources:
        for forbidden in forbidden_reward_mutations:
            assert forbidden not in source


def test_current_ait_js_bundles_have_no_app_owned_dev_markers() -> None:
    """AUTH-001/IAP-001/AD-001: inspect unzipped JS bundles, not only the zip bytes."""
    ait_path = ROOT / "taillog-app.ait"
    assert ait_path.exists(), "taillog-app.ait must exist before release JS bundle security scan"

    bundle_text = _ait_js_bundle_text(ait_path)
    leaked = _leaked_sensitive_ait_markers(bundle_text)
    assert leaked == []


def test_dist_release_bundles_have_no_sensitive_or_dev_markers() -> None:
    """AUTH-001/IAP-001: local dist artifacts must pass the same upload-bundle security gate."""
    dist_path = ROOT / "dist"
    assert dist_path.exists(), "dist must exist before release bundle security scan"

    bundle_text = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in dist_path.iterdir()
        if path.suffix in {".js", ".map"}
    )
    leaked = _leaked_sensitive_ait_markers(bundle_text)
    assert leaked == []


def test_frontend_console_calls_are_dev_guarded() -> None:
    """AUTH-001/IAP-001/B2B-001: runtime diagnostics must not leak PII/order/auth data in release."""
    targets = [
        *(ROOT / "src").glob("*.ts"),
        *(ROOT / "src").glob("*.tsx"),
        *(ROOT / "src/lib").rglob("*.ts"),
        *(ROOT / "src/lib").rglob("*.tsx"),
        *(ROOT / "src/pages").rglob("*.ts"),
        *(ROOT / "src/pages").rglob("*.tsx"),
        *(ROOT / "src/components").rglob("*.ts"),
        *(ROOT / "src/components").rglob("*.tsx"),
    ]

    violations: list[str] = []
    for path in targets:
        if "__tests__" in path.parts:
            continue
        source = path.read_text(encoding="utf-8")
        lines = source.splitlines()

        for index, line in enumerate(lines):
            if "console." not in line:
                continue

            window = "\n".join(lines[max(0, index - 12): index + 1])
            helper_context = "\n".join(lines[max(0, index - 2): index + 1])
            if "function devLog" in helper_context or "function devWarn" in helper_context or "function devError" in helper_context:
                continue
            if "if (__DEV__)" in line or "if (__DEV__" in window:
                continue
            if "startupPerfLoggingEnabled" in window:
                continue
            if (
                path.match("*/src/lib/performance/startupPerformance.ts")
                and "const startupPerfLoggingEnabled = __DEV__" in source
            ):
                continue
            if (
                path.match("*/src/lib/api/backend.ts")
                and "[PERF][backend-server-timing]" in line
                and "function logBackendServerTiming" in source
                and "if (!__DEV__) return;" in source
            ):
                continue

            relative = path.relative_to(ROOT)
            violations.append(f"{relative}:{index + 1}: {line.strip()}")

    assert violations == []
