#!/usr/bin/env node
/**
 * Supabase live security audit helper.
 *
 * Parity: AUTH-001, IAP-001, B2B-001, SEC-EDGE, SEC-RLS, SEC-PII, SEC-AIT.
 * Runs live checks once the Supabase account has project privileges.
 * RLS probes require the full cross-user/cross-org fixture set by default, so a
 * partial run is not mistaken for complete data-isolation proof.
 * RLS write probes use PATCH {} with return=representation to detect update policy leaks
 * without intentionally changing row values.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const DEFAULT_PROJECT_REF = 'gxvtgrcqkbdibkyeqyil';
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_PROJECT_REF}.supabase.co`;
const DEFAULT_BACKEND_URL = 'https://taillogtoss-backend-l35lj.ondigitalocean.app';
const MALFORMED_JWT = 'not-a-valid.jwt';
const EXPIRED_TEST_JWT = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDAiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MX0',
  'expired-test-signature',
].join('.');
const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_RLS_ATTACKER_JWT_ROLES = new Set(['anon', 'service_role']);

const EXPECTED_FUNCTION_VERIFY_JWT = new Map([
  ['verify-iap-order', false],
  ['grant-toss-points', true],
  ['send-smart-message', true],
  ['generate-report', true],
  ['assign-b2b-role', false],
  ['withdraw-user', false],
]);

const LOCAL_EXPECTED_FUNCTION_VERIFY_JWT = new Map([
  ['login-with-toss', false],
  ...EXPECTED_FUNCTION_VERIFY_JWT,
]);

const INTERNAL_AUTH_FUNCTIONS = new Map([
  ['verify-iap-order', 'supabase/functions/verify-iap-order/main.ts'],
  ['assign-b2b-role', 'supabase/functions/assign-b2b-role/index.ts'],
  ['withdraw-user', 'supabase/functions/withdraw-user/index.ts'],
]);

const REQUIRED_MIGRATION_IDS = [
  '20260601000100',
  '20260601000200',
  '20260601000300',
  '20260601000400',
  '20260601000500',
  '20260601000600',
  '20260601000700',
  '20260601000800',
  '20260601000900',
  '20260601001000',
  '20260601001100',
  '20260601001200',
  '20260601001300',
  '20260601001400',
  '20260601001500',
  '20260601001600',
  '20260601001700',
];

const REQUIRED_SECRET_NAMES = [
  'TOSS_CLIENT_CERT_BASE64',
  'TOSS_CLIENT_KEY_BASE64',
  'TOSS_PII_DECRYPTION_KEY_BASE64',
  'OPENAI_API_KEY',
];

const REQUIRED_RLS_TABLES = [
  'dogs',
  'dog_env',
  'behavior_logs',
  'training_step_attempts',
  'case_intakes',
  'user_training_status',
  'training_behavior_snapshots',
  'ai_recommendation_snapshots',
  'ai_recommendation_feedback',
  'ai_coaching',
  'action_tracker',
  'coaching_generation_jobs',
  'subscriptions',
  'user_entitlements',
  'user_settings',
  'toss_orders',
  'organizations',
  'org_members',
  'org_dogs',
  'dog_assignments',
  'org_subscriptions',
  'media_assets',
  'daily_reports',
];

const SERVICE_ONLY_RLS_TABLES = [
  'ai_coaching',
  'action_tracker',
  'ai_recommendation_snapshots',
  'ai_recommendation_feedback',
  'media_assets',
  'training_behavior_snapshots',
];

const FORBIDDEN_LOG_MARKERS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SERVICE_ROLE_KEY',
  'AUTH_BRIDGE_SECRET',
  'SUPER_SECRET_PEPPER',
  'TOSS_PII_DECRYPTION_KEY',
  'TOSS_PROFILE_DECRYPTION_KEY',
  'OPENAI_API_KEY',
  'TOSS_CLIENT_SECRET',
  'TOSS_CLIENT_CERT',
  'TOSS_MTLS_KEY',
  'BEGIN PRIVATE KEY',
  'access_token=',
  'refresh_token=',
  'authorizationCode=',
  'authCode=',
  'id_token=eyJ',
  'jwt=eyJ',
  'Bearer eyJ',
  'authorization: Bearer',
  'phone=',
  'email=',
  'userKey=',
  'toss_user_key=',
];

const FORBIDDEN_LOG_PATTERNS = [
  {
    label: 'auth-code',
    pattern: /\b(?:authorization[_-]?code|authorizationCode|auth[_-]?code|authCode)\s*[:=]\s*["']?[^"'\s,}]+/i,
  },
  {
    label: 'jwt-token',
    pattern: /\b(?:access[_-]?token|accessToken|refresh[_-]?token|refreshToken|id[_-]?token|idToken|jwt)\s*[:=]\s*["']?eyJ/i,
  },
  {
    label: 'bearer-jwt',
    pattern: /\bBearer\s+eyJ/i,
  },
  {
    label: 'bearer-token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/i,
  },
  {
    label: 'service-or-api-key',
    pattern: /\b(?:service[_-]?role[_-]?key|serviceRoleKey|supabase[_-]?service[_-]?role[_-]?key|supabaseServiceRoleKey|api[_-]?key|apiKey)\s*[:=]\s*["']?[^"'\s,}]+/i,
  },
  {
    label: 'toss-user-key',
    pattern: /\b(?:toss[_-]?user[_-]?key|tossUserKey|userKey)\s*[:=]\s*["']?[^"'\s,}]+/i,
  },
  {
    label: 'private-key',
    pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i,
  },
  {
    label: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    label: 'phone',
    pattern: /(?:\b01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}\b|\b\+?1[-\s.]?\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4}\b)/,
  },
];

const EDGE_PROBES = [
  {
    name: 'verify-iap-order',
    body: {
      receipt: 'security-probe-receipt',
      orderId: 'security-probe-order',
      productId: 'PRO_MONTHLY',
      idempotencyKey: 'security-probe-idempotency',
      userId: '00000000-0000-4000-8000-000000000000',
    },
  },
  {
    name: 'grant-toss-points',
    body: {
      userId: '00000000-0000-4000-8000-000000000000',
      points: 1,
      reasonCode: 'ad_reward',
      idempotencyKey: 'point-event-00000000-0000-4000-8000-000000000000',
    },
  },
  {
    name: 'send-smart-message',
    body: {
      userId: '00000000-0000-4000-8000-000000000000',
      notificationType: 'training_reminder',
    },
  },
  {
    name: 'generate-report',
    body: {
      report_id: '00000000-0000-4000-8000-000000000000',
      dog_id: '00000000-0000-4000-8000-000000000000',
      report_date: '2026-06-01',
    },
  },
];

const LOGIN_AUTH_CODE_PROBES = [
  {
    scenario: 'invalid-auth-code',
    body: {
      authorizationCode: 'security-probe-expired-or-reused-auth-code',
      referrer: 'SANDBOX',
      nonce: 'security-probe-nonce-20260601',
    },
  },
];

const BACKEND_PROBES = [
  { method: 'GET', path: '/api/v1/auth/me' },
  { method: 'GET', path: '/api/v1/subscription/' },
  { method: 'GET', path: '/api/v1/dashboard/' },
  { method: 'GET', path: '/api/v1/dogs/' },
  { method: 'GET', path: '/api/v1/coaching/usage/daily' },
];

const BACKEND_MUTATION_PROBES = [
  {
    method: 'POST',
    path: '/api/v1/dogs/',
    body: {
      name: 'Security Probe Dog',
      breed: 'probe',
      sex: 'MALE',
      weight_kg: 10,
    },
  },
  {
    method: 'POST',
    path: '/api/v1/logs/quick',
    body: {
      dog_id: '00000000-0000-4000-8000-000000000000',
      category: 'barking',
      intensity: 3,
      occurrence_count: 1,
      occurred_at: '2026-06-01T00:00:00Z',
      memo: 'security-probe',
    },
  },
  {
    method: 'POST',
    path: '/api/v1/coaching/generation-jobs',
    body: {
      dog_id: '00000000-0000-4000-8000-000000000000',
      report_type: 'DAILY',
      window_days: 7,
      user_context: 'security-probe',
    },
  },
  {
    method: 'PATCH',
    path: '/api/v1/settings/',
    body: {
      marketing_agreed: true,
    },
  },
  {
    method: 'POST',
    path: '/api/v1/subscription/iap/verify',
    body: {
      userId: '00000000-0000-4000-8000-000000000000',
      productId: 'PRO_MONTHLY',
      orderId: 'security-probe-backend-order',
      receipt: 'security-probe-backend-receipt',
      idempotencyKey: 'security-probe-backend-idempotency',
    },
  },
  {
    method: 'POST',
    path: '/api/v1/report/',
    body: {
      dog_id: '00000000-0000-4000-8000-000000000000',
      report_date: '2026-06-01',
      template_type: 'daycare_general',
    },
  },
];

function parseArgs(argv) {
  const args = {
    projectRef: DEFAULT_PROJECT_REF,
    logFile: null,
    requireLogFile: false,
    logScanOnly: false,
    probeEdge: false,
    edgeProbesOnly: false,
    probeBackend: false,
    backendProbesOnly: false,
    probeRls: false,
    rlsProbesOnly: false,
    rlsAllowPartial: false,
    rlsFixtureFile: '',
    backendUrl: DEFAULT_BACKEND_URL,
    rlsAttackerJwt: process.env.SECURITY_RLS_ATTACKER_JWT || '',
    rlsVictimUserId: process.env.SECURITY_RLS_VICTIM_USER_ID || '',
    rlsDogId: process.env.SECURITY_RLS_DOG_ID || '',
    rlsCoachingId: process.env.SECURITY_RLS_COACHING_ID || '',
    rlsGenerationJobId: process.env.SECURITY_RLS_GENERATION_JOB_ID || '',
    rlsSubscriptionUserId: process.env.SECURITY_RLS_SUBSCRIPTION_USER_ID || '',
    rlsTossOrderId: process.env.SECURITY_RLS_TOSS_ORDER_ID || '',
    rlsOrgId: process.env.SECURITY_RLS_ORG_ID || '',
    rlsReportId: process.env.SECURITY_RLS_REPORT_ID || '',
  };

  const fixtureFileIndex = argv.indexOf('--rls-fixture-file');
  if (fixtureFileIndex !== -1) {
    args.rlsFixtureFile = argv[fixtureFileIndex + 1] || '';
    applyRlsFixtureFile(args, args.rlsFixtureFile);
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project-ref') {
      args.projectRef = argv[++i];
    } else if (arg === '--log-file') {
      args.logFile = argv[++i];
    } else if (arg === '--require-log-file') {
      args.requireLogFile = true;
    } else if (arg === '--log-scan-only') {
      args.logScanOnly = true;
      args.requireLogFile = true;
    } else if (arg === '--probe-edge') {
      args.probeEdge = true;
    } else if (arg === '--edge-probes-only') {
      args.edgeProbesOnly = true;
      args.probeEdge = true;
    } else if (arg === '--probe-backend') {
      args.probeBackend = true;
    } else if (arg === '--backend-probes-only') {
      args.backendProbesOnly = true;
      args.probeBackend = true;
    } else if (arg === '--probe-rls') {
      args.probeRls = true;
    } else if (arg === '--rls-probes-only') {
      args.rlsProbesOnly = true;
      args.probeRls = true;
    } else if (arg === '--rls-allow-partial') {
      args.rlsAllowPartial = true;
    } else if (arg === '--rls-fixture-file') {
      i += 1;
    } else if (arg === '--backend-url') {
      args.backendUrl = argv[++i];
    } else if (arg === '--rls-attacker-jwt') {
      args.rlsAttackerJwt = argv[++i];
    } else if (arg === '--rls-victim-user-id') {
      args.rlsVictimUserId = argv[++i];
    } else if (arg === '--rls-dog-id') {
      args.rlsDogId = argv[++i];
    } else if (arg === '--rls-coaching-id') {
      args.rlsCoachingId = argv[++i];
    } else if (arg === '--rls-generation-job-id') {
      args.rlsGenerationJobId = argv[++i];
    } else if (arg === '--rls-subscription-user-id') {
      args.rlsSubscriptionUserId = argv[++i];
    } else if (arg === '--rls-toss-order-id') {
      args.rlsTossOrderId = argv[++i];
    } else if (arg === '--rls-org-id') {
      args.rlsOrgId = argv[++i];
    } else if (arg === '--rls-report-id') {
      args.rlsReportId = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.projectRef) throw new Error('Missing --project-ref');
  if (!args.backendUrl) throw new Error('Missing --backend-url');
  if (args.logScanOnly && !args.logFile) throw new Error('Missing --log-file for --log-scan-only');
  return args;
}

function applyRlsFixtureFile(args, fixtureFile) {
  if (!fixtureFile) throw new Error('Missing --rls-fixture-file path');
  const absolutePath = path.resolve(root, fixtureFile);
  const fixture = parseJsonOutput(fs.readFileSync(absolutePath, 'utf8'), `RLS fixture file ${fixtureFile}`);
  const fieldMap = {
    attackerJwt: 'rlsAttackerJwt',
    victimUserId: 'rlsVictimUserId',
    dogId: 'rlsDogId',
    coachingId: 'rlsCoachingId',
    generationJobId: 'rlsGenerationJobId',
    subscriptionUserId: 'rlsSubscriptionUserId',
    tossOrderId: 'rlsTossOrderId',
    orgId: 'rlsOrgId',
    reportId: 'rlsReportId',
  };
  const unknownFields = Object.keys(fixture).filter((key) => !(key in fieldMap));
  if (unknownFields.length > 0) {
    throw new Error(`Unknown RLS fixture fields: ${unknownFields.join(', ')}`);
  }
  for (const [fixtureKey, argKey] of Object.entries(fieldMap)) {
    if (typeof fixture[fixtureKey] === 'string' && fixture[fixtureKey].length > 0) {
      args[argKey] = fixture[fixtureKey];
    }
  }
}

function readDotenvValue(key) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '') : '';
}

function resolveAnonKey() {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || readDotenvValue('EXPO_PUBLIC_SUPABASE_ANON_KEY')
    || readDotenvValue('SUPABASE_ANON_KEY');
}

function resolveSupabaseMcpCredentials() {
  const mcpPath = path.join(root, '.mcp.json');
  if (!fs.existsSync(mcpPath)) return {};
  try {
    const config = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    const supabaseArgs = config.mcpServers?.supabase?.args;
    if (!Array.isArray(supabaseArgs)) return {};
    const projectRefIndex = supabaseArgs.indexOf('--project-ref');
    const accessTokenIndex = supabaseArgs.indexOf('--access-token');
    return {
      projectRef: projectRefIndex === -1 ? '' : supabaseArgs[projectRefIndex + 1] || '',
      accessToken: accessTokenIndex === -1 ? '' : supabaseArgs[accessTokenIndex + 1] || '',
    };
  } catch {
    return {};
  }
}

function resolveSupabaseCliEnv() {
  const mcpCredentials = resolveSupabaseMcpCredentials();
  return {
    ...process.env,
    SUPABASE_PROJECT_REF: mcpCredentials.projectRef || DEFAULT_PROJECT_REF,
    SUPABASE_ACCESS_TOKEN: mcpCredentials.accessToken || process.env.SUPABASE_ACCESS_TOKEN || '',
  };
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: command === 'supabase' ? resolveSupabaseCliEnv() : process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}\n${output}`);
  }
  return result.stdout;
}

function auditReleaseArtifact() {
  const output = run('node', ['scripts/release-security-check.js']);
  if (output.trim()) process.stdout.write(output);
  console.log('[live-security-audit] PASS release artifact security scan');
}

function auditLocalRuntimeHardening() {
  const mtlsModeSource = fs.readFileSync(path.join(root, 'supabase/functions/_shared/mtlsMode.ts'), 'utf8');
  const mtlsClientSource = fs.readFileSync(path.join(root, 'supabase/functions/_shared/mTLSClient.ts'), 'utf8');
  const reportSource = fs.readFileSync(path.join(root, 'supabase/functions/generate-report/index.ts'), 'utf8');

  const requiredMtlsModeMarkers = [
    "if (isProductionLike(read)) return 'real';",
    "value === 'sandbox_real'",
    "value === 'prod_read'",
    "value === 'prod_ready'",
    "explicit === 'mock' && isExplicitDevLocal(read)",
    "return 'real';",
  ];
  const requiredMtlsClientMarkers = [
    "TOSS_CLIENT_CERT_BASE64 and TOSS_CLIENT_KEY_BASE64 must be set",
    'Deno.createHttpClient is required for real Toss mTLS calls',
    'TOSS_UPSTREAM_NETWORK',
  ];
  const requiredReportAiMarkers = [
    'function resolveReportAiMode',
    "if (mode === 'mock' && isDevLocalMode(getEnv)) return 'mock';",
    "return 'real';",
    "OPENAI_API_KEY is missing for REPORT_AI_MODE=real",
  ];

  const missing = [
    ...requiredMtlsModeMarkers.filter((marker) => !mtlsModeSource.includes(marker)),
    ...requiredMtlsClientMarkers.filter((marker) => !mtlsClientSource.includes(marker)),
    ...requiredReportAiMarkers.filter((marker) => !reportSource.includes(marker)),
  ];
  if (missing.length > 0) {
    throw new Error(`Local runtime hardening markers missing: ${missing.join(', ')}`);
  }
  console.log('[live-security-audit] PASS local runtime hardening source scan');
}

function parseLocalFunctionConfig(configText) {
  const functions = new Map();
  const sectionPattern = /^\[functions\.([^\]]+)\]\s*$/gm;
  const sections = [...configText.matchAll(sectionPattern)];

  for (let index = 0; index < sections.length; index += 1) {
    const match = sections[index];
    const name = match[1];
    const start = match.index + match[0].length;
    const next = sections[index + 1];
    const end = next ? next.index : configText.length;
    const block = configText.slice(start, end);
    const verifyJwtMatch = block.match(/^\s*verify_jwt\s*=\s*(true|false)\s*$/m);
    const enabledMatch = block.match(/^\s*enabled\s*=\s*(true|false)\s*$/m);
    const entrypointMatch = block.match(/^\s*entrypoint\s*=\s*"([^"]+)"\s*$/m);
    functions.set(name, {
      enabled: enabledMatch ? enabledMatch[1] === 'true' : undefined,
      verify_jwt: verifyJwtMatch ? verifyJwtMatch[1] === 'true' : undefined,
      entrypoint: entrypointMatch ? entrypointMatch[1] : undefined,
    });
  }

  return functions;
}

function assertSourceDoesNotReadRoleHeader(source, functionName) {
  const forbiddenMarkers = [
    "request.headers.get('x-user-role')",
    'request.headers.get("x-user-role")',
    "req.headers.get('x-user-role')",
    'req.headers.get("x-user-role")',
    "headers.get('x-user-role')",
    'headers.get("x-user-role")',
  ];
  const hit = forbiddenMarkers.find((marker) => source.includes(marker));
  if (hit) throw new Error(`${functionName} local source reads spoofable x-user-role header: ${hit}`);
}

function auditLocalFunctionConfig() {
  const configText = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
  const functions = parseLocalFunctionConfig(configText);

  for (const [name, expectedVerifyJwt] of LOCAL_EXPECTED_FUNCTION_VERIFY_JWT.entries()) {
    const fn = functions.get(name);
    if (!fn) throw new Error(`Missing local Edge function config: ${name}`);
    if (fn.enabled !== true) throw new Error(`${name} local config must be enabled`);
    if (fn.verify_jwt !== expectedVerifyJwt) {
      throw new Error(`${name} local verify_jwt expected ${expectedVerifyJwt}, got ${fn.verify_jwt}`);
    }
    if (!fn.entrypoint) throw new Error(`${name} local config is missing entrypoint`);
    const entrypoint = fn.entrypoint.replace(/^\.\//, '');
    if (!fs.existsSync(path.join(root, 'supabase', entrypoint))) {
      throw new Error(`${name} local entrypoint does not exist: ${fn.entrypoint}`);
    }
  }

  for (const [name, relativePath] of INTERNAL_AUTH_FUNCTIONS.entries()) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    if (!source.includes('/auth/v1/user')) {
      throw new Error(`${name} local source no longer contains internal /auth/v1/user verification`);
    }
    assertSourceDoesNotReadRoleHeader(source, name);
  }

  for (const name of ['grant-toss-points', 'send-smart-message', 'generate-report']) {
    const entrypoint = functions.get(name)?.entrypoint?.replace(/^\.\//, '');
    if (!entrypoint) throw new Error(`${name} local config is missing entrypoint`);
    const source = fs.readFileSync(path.join(root, 'supabase', entrypoint), 'utf8');
    if (!source.includes('buildEdgeContext(request)')) {
      throw new Error(`${name} local source no longer derives auth context from JWT`);
    }
    assertSourceDoesNotReadRoleHeader(source, name);
  }

  const loginSource = fs.readFileSync(path.join(root, 'supabase/functions/login-with-toss/index.ts'), 'utf8');
  const handlerStart = loginSource.indexOf('export function createLoginWithTossHandler');
  const rememberIndex = loginSource.indexOf('await rememberConsumedAuthCode', handlerStart);
  const profileIndex = loginSource.indexOf('const profile = await deps.mTLSClient.fetchLoginProfile', handlerStart);
  const bridgeIndex = loginSource.indexOf('const bridgeSession = await deps.bridgeSession', handlerStart);
  if (!loginSource.includes('exchangeAuthorizationCode') || rememberIndex < 0 || profileIndex < 0 || bridgeIndex < 0) {
    throw new Error('login-with-toss local source no longer has expected auth-code exchange/consumption boundary');
  }
  if (rememberIndex > profileIndex || rememberIndex > bridgeIndex) {
    throw new Error('login-with-toss local source must consume authCode before profile fetch or session bridge');
  }

  console.log(`[live-security-audit] PASS local Edge function config/source auth scan for ${LOCAL_EXPECTED_FUNCTION_VERIFY_JWT.size} functions`);
}

function compactSql(sql) {
  return sql.replace(/\s+/g, ' ').toLowerCase();
}

function readMigration(fileName) {
  return fs.readFileSync(path.join(root, 'supabase/migrations', fileName), 'utf8');
}

function readAllMigrationSql() {
  const migrationDir = path.join(root, 'supabase/migrations');
  return fs.readdirSync(migrationDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => fs.readFileSync(path.join(migrationDir, name), 'utf8'))
    .join('\n');
}

function hasRlsEnable(sql, tableName) {
  return new RegExp(`alter table (?:public\\.)?${tableName} enable row level security`, 'i').test(sql);
}

function assertServiceOnlyTable(sql, tableName) {
  if (!sql.includes(`create policy "service role full access" on public.${tableName} for all to service_role`)) {
    throw new Error(`${tableName} missing service_role-only full access policy`);
  }
  for (const role of ['public', 'authenticated']) {
    if (sql.includes(`on public.${tableName} for select to ${role}`)
      || sql.includes(`on public.${tableName} for insert to ${role}`)
      || sql.includes(`on public.${tableName} for update to ${role}`)
      || sql.includes(`on public.${tableName} for delete to ${role}`)
      || sql.includes(`on public.${tableName} for all to ${role}`)) {
      throw new Error(`${tableName} exposes direct ${role} RLS access`);
    }
  }
}

function auditLocalRlsPolicySource() {
  const allSql = compactSql(readAllMigrationSql());
  const missingRls = REQUIRED_RLS_TABLES.filter((table) => !hasRlsEnable(allSql, table));
  if (missingRls.length > 0) {
    throw new Error(`Missing local RLS enable statements for: ${missingRls.join(', ')}`);
  }

  for (const table of SERVICE_ONLY_RLS_TABLES) {
    assertServiceOnlyTable(allSql, table);
  }

  const userSettings = compactSql(readMigration('20260301133009_add_user_settings_rls_write_policies.sql'));
  for (const marker of [
    'alter table public.user_settings enable row level security',
    'create policy "users insert own settings"',
    'create policy "users update own settings"',
    'create policy "users delete own settings"',
    'auth.uid() = user_id',
  ]) {
    if (!userSettings.includes(marker)) throw new Error(`user_settings RLS marker missing: ${marker}`);
  }

  const subscriptions = compactSql(readMigration('20260601001100_lock_subscriptions_client_writes.sql'));
  for (const marker of [
    'drop policy if exists "subscriptions_user_insert"',
    'drop policy if exists "subscriptions_user_update"',
    'drop policy if exists "subscriptions_user_delete"',
    'create policy "users read own subscriptions"',
    'user_id = (select auth.uid())',
  ]) {
    if (!subscriptions.includes(marker)) throw new Error(`subscriptions RLS marker missing: ${marker}`);
  }
  for (const forbidden of ['for insert to public', 'for update to public', 'for delete to public']) {
    if (subscriptions.includes(forbidden)) throw new Error(`subscriptions latest lock migration still contains ${forbidden}`);
  }

  const tossOrders = compactSql(readMigration('20260601000400_lock_toss_orders_client_writes.sql'));
  for (const marker of [
    'drop policy if exists "toss_orders_user_insert"',
    'drop policy if exists "toss_orders_user_update"',
    'create policy "toss_orders_user_select"',
    'user_id = (select auth.uid())',
  ]) {
    if (!tossOrders.includes(marker)) throw new Error(`toss_orders RLS marker missing: ${marker}`);
  }
  for (const forbidden of ['for insert to public', 'for update to public']) {
    if (tossOrders.includes(forbidden)) throw new Error(`toss_orders latest lock migration still contains ${forbidden}`);
  }

  const orgDogs = compactSql(readMigration('20260601001300_lock_org_dogs_insert_owner_scope.sql'));
  for (const marker of [
    'public.is_org_member_with_role(org_id, array[\'owner\',\'manager\',\'staff\'])',
    'parent_user_id = (select auth.uid())',
    'd.user_id = (select auth.uid())',
    'da.trainer_user_id = (select auth.uid())',
    'da.status = \'active\'',
    'with check',
  ]) {
    if (!orgDogs.includes(marker)) throw new Error(`org_dogs RLS marker missing: ${marker}`);
  }
  if (orgDogs.includes('public.is_org_member(org_id)')) {
    throw new Error('org_dogs latest policy regressed to broad is_org_member access');
  }

  const dailyReports = compactSql(readMigration('20260601001400_lock_daily_reports_trainer_dog_scope.sql'));
  for (const marker of [
    'create policy "daily_reports_select"',
    'create policy "daily_reports_insert"',
    'create policy "daily_reports_update"',
    'created_by_trainer_id = (select auth.uid())',
    'd.id = daily_reports.dog_id',
    'd.user_id = (select auth.uid())',
  ]) {
    if (!dailyReports.includes(marker)) throw new Error(`daily_reports RLS marker missing: ${marker}`);
  }

  console.log(`[live-security-audit] PASS local RLS policy source scan for ${REQUIRED_RLS_TABLES.length} tables`);
}

async function collectAuditFailure(label, failures, fn) {
  try {
    await fn();
  } catch (error) {
    failures.push({ label, error });
    console.error(`[live-security-audit] BLOCKED ${label}: ${error.message}`);
  }
}

function parseJsonOutput(output, label) {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error.message}`);
  }
}

function normalizeFunctions(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.functions)) return raw.functions;
  if (Array.isArray(raw.data)) return raw.data;
  throw new Error('Unexpected functions list JSON shape');
}

function normalizeSecretNames(raw) {
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw.secrets) ? raw.secrets : Array.isArray(raw.data) ? raw.data : [];
  const names = rows
    .map((row) => {
      if (typeof row === 'string') return row;
      if (row && typeof row === 'object') {
        return row.name || row.key || row.secret_name || row.secretName;
      }
      return '';
    })
    .filter((name) => typeof name === 'string' && name.length > 0);
  if (names.length === 0) throw new Error('Unexpected secrets list JSON shape');
  return names;
}

function getFunctionName(fn) {
  return fn.name || fn.slug || fn.id || fn.function_name;
}

function getVerifyJwt(fn) {
  if (typeof fn.verify_jwt === 'boolean') return fn.verify_jwt;
  if (typeof fn.verifyJwt === 'boolean') return fn.verifyJwt;
  if (typeof fn.verifyJWT === 'boolean') return fn.verifyJWT;
  if (typeof fn.import_map === 'object' && typeof fn.import_map.verify_jwt === 'boolean') {
    return fn.import_map.verify_jwt;
  }
  return undefined;
}

function auditFunctions(projectRef) {
  const output = run('supabase', ['functions', 'list', '--project-ref', projectRef, '--output', 'json']);
  const functions = normalizeFunctions(parseJsonOutput(output, 'supabase functions list'));
  const byName = new Map(functions.map((fn) => [getFunctionName(fn), fn]));

  for (const [name, expectedVerifyJwt] of EXPECTED_FUNCTION_VERIFY_JWT.entries()) {
    const fn = byName.get(name);
    if (!fn) throw new Error(`Missing live Edge function: ${name}`);
    const actualVerifyJwt = getVerifyJwt(fn);
    if (actualVerifyJwt !== expectedVerifyJwt) {
      throw new Error(`${name} verify_jwt expected ${expectedVerifyJwt}, got ${actualVerifyJwt}`);
    }
  }

  for (const [name, relativePath] of INTERNAL_AUTH_FUNCTIONS.entries()) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    if (!source.includes('/auth/v1/user')) {
      throw new Error(`${name} local source no longer contains internal /auth/v1/user verification`);
    }
  }

  console.log(`[live-security-audit] PASS functions verify_jwt for ${EXPECTED_FUNCTION_VERIFY_JWT.size} functions`);
}

function auditMigrations() {
  const output = run('supabase', ['migration', 'list', '--linked', '--output', 'json']);
  const migrationText = output.toLowerCase();
  const missing = REQUIRED_MIGRATION_IDS.filter((id) => !migrationText.includes(id));
  if (missing.length > 0) {
    throw new Error(`Missing linked Supabase migrations: ${missing.join(', ')}`);
  }
  console.log(`[live-security-audit] PASS linked migrations ${REQUIRED_MIGRATION_IDS.length}/${REQUIRED_MIGRATION_IDS.length}`);
}

function auditSecrets(projectRef) {
  const output = run('supabase', ['secrets', 'list', '--project-ref', projectRef, '--output', 'json']);
  const names = new Set(normalizeSecretNames(parseJsonOutput(output, 'supabase secrets list')));
  const missing = REQUIRED_SECRET_NAMES.filter((name) => !names.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing required Supabase Edge secret names: ${missing.join(', ')}`);
  }
  console.log(`[live-security-audit] PASS required Edge secret names ${REQUIRED_SECRET_NAMES.length}/${REQUIRED_SECRET_NAMES.length}`);
}

function auditLogFile(logFile, requireLogFile) {
  if (!logFile) {
    if (requireLogFile) throw new Error('Missing --log-file for required live log PII scan');
    console.log('[live-security-audit] SKIP log scan: pass --log-file <edge-log-export> to scan live logs');
    return;
  }

  const absolutePath = path.resolve(root, logFile);
  const logText = fs.readFileSync(absolutePath, 'utf8');
  if (logText.trim().length === 0) {
    throw new Error('Live log export is empty; provide a real Edge log export');
  }
  const leaks = findForbiddenLogLeaks(logText);
  if (leaks.markers.length > 0 || leaks.patterns.length > 0) {
    throw new Error(
      `Live log export contains forbidden sensitive values: markers=${leaks.markers.join(', ') || 'none'} patterns=${leaks.patterns.join(', ') || 'none'}`,
    );
  }
  console.log(`[live-security-audit] PASS log scan ${path.relative(root, absolutePath)}`);
}

function flattenJsonForLogScan(value, prefix = '') {
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') {
    return prefix ? [`${prefix}=${String(value)}`] : [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenJsonForLogScan(item, `${prefix}[${index}]`));
  }

  const entries = Object.entries(value);
  const flattened = [];
  const keyName = typeof value.key === 'string' ? value.key : typeof value.name === 'string' ? value.name : '';
  const keyedValue = typeof value.value === 'string' ? value.value : typeof value.message === 'string' ? value.message : '';
  if (keyName && keyedValue) flattened.push(`${keyName}=${keyedValue}`);

  for (const [key, child] of entries) {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    flattened.push(...flattenJsonForLogScan(child, childPrefix));
  }
  return flattened;
}

function normalizeLogTextForScan(logText) {
  const normalized = [logText];
  for (const candidate of [logText, ...logText.split(/\r?\n/).filter(Boolean)]) {
    try {
      normalized.push(flattenJsonForLogScan(JSON.parse(candidate)).join('\n'));
    } catch {
      // Non-JSON log exports are still scanned as raw text.
    }
  }
  return normalized.join('\n');
}

function findForbiddenLogLeaks(logText) {
  const scanText = normalizeLogTextForScan(logText);
  return {
    markers: FORBIDDEN_LOG_MARKERS.filter((marker) => scanText.includes(marker)),
    patterns: FORBIDDEN_LOG_PATTERNS
      .filter(({ pattern }) => pattern.test(scanText))
      .map(({ label }) => label),
  };
}

function assertNoForbiddenResponseLeaks(label, responseText) {
  const leaks = findForbiddenLogLeaks(responseText);
  if (leaks.markers.length > 0 || leaks.patterns.length > 0) {
    throw new Error(
      `${label} response body leaked forbidden sensitive values: markers=${leaks.markers.join(', ') || 'none'} patterns=${leaks.patterns.join(', ') || 'none'}`,
    );
  }
}

async function postEdgeProbe(supabaseUrl, name, body, anonKey, spoofRole, bearerToken = anonKey) {
  const headers = {
    apikey: anonKey,
    authorization: `Bearer ${bearerToken}`,
    'content-type': 'application/json',
  };
  if (spoofRole) headers['x-user-role'] = spoofRole;

  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  assertNoForbiddenResponseLeaks(`edge ${name}`, responseText);
  return {
    status: response.status,
    requestId: response.headers.get('sb-request-id') || response.headers.get('x-request-id') || '',
    responseText,
  };
}

function assertProbePairBlocked(probeName, scenario, baseline, spoofed) {
  if (baseline.status >= 200 && baseline.status < 300) {
    throw new Error(`${probeName} ${scenario} baseline probe unexpectedly succeeded with ${baseline.status}`);
  }
  if (spoofed.status >= 200 && spoofed.status < 300) {
    throw new Error(`${probeName} ${scenario} x-user-role spoof probe unexpectedly succeeded with ${spoofed.status}`);
  }
  if (baseline.status !== spoofed.status) {
    throw new Error(
      `${probeName} ${scenario} x-user-role spoof changed status ${baseline.status} -> ${spoofed.status}`,
    );
  }
}

async function auditEdgeProbes(projectRef) {
  const anonKey = resolveAnonKey();
  if (!anonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY for --probe-edge');
  }
  const supabaseUrl = `https://${projectRef}.supabase.co`;

  for (const probe of LOGIN_AUTH_CODE_PROBES) {
    const baseline = await postEdgeProbe(supabaseUrl, 'login-with-toss', probe.body, anonKey, null);
    const spoofed = await postEdgeProbe(supabaseUrl, 'login-with-toss', probe.body, anonKey, 'trainer');
    assertProbePairBlocked('login-with-toss', probe.scenario, baseline, spoofed);
    console.log(
      `[live-security-audit] PASS auth code probe login-with-toss ${probe.scenario} status=${baseline.status}/${spoofed.status} request_id=${spoofed.requestId || baseline.requestId || 'n/a'}`,
    );
  }

  for (const probe of EDGE_PROBES) {
    const baseline = await postEdgeProbe(supabaseUrl, probe.name, probe.body, anonKey, null);
    const spoofed = await postEdgeProbe(supabaseUrl, probe.name, probe.body, anonKey, 'trainer');
    assertProbePairBlocked(probe.name, 'anon', baseline, spoofed);
    const badJwt = await postEdgeProbe(supabaseUrl, probe.name, probe.body, anonKey, null, MALFORMED_JWT);
    const spoofedBadJwt = await postEdgeProbe(supabaseUrl, probe.name, probe.body, anonKey, 'trainer', MALFORMED_JWT);
    assertProbePairBlocked(probe.name, 'malformed-jwt', badJwt, spoofedBadJwt);
    const expiredJwt = await postEdgeProbe(supabaseUrl, probe.name, probe.body, anonKey, null, EXPIRED_TEST_JWT);
    const spoofedExpiredJwt = await postEdgeProbe(supabaseUrl, probe.name, probe.body, anonKey, 'trainer', EXPIRED_TEST_JWT);
    assertProbePairBlocked(probe.name, 'expired-test-jwt', expiredJwt, spoofedExpiredJwt);
    console.log(
      `[live-security-audit] PASS edge probe ${probe.name} anon=${baseline.status}/${spoofed.status} malformed_jwt=${badJwt.status}/${spoofedBadJwt.status} expired_test_jwt=${expiredJwt.status}/${spoofedExpiredJwt.status} request_id=${spoofedExpiredJwt.requestId || spoofedBadJwt.requestId || spoofed.requestId || 'n/a'}`,
    );
  }
}

async function getBackendProbe(backendUrl, probe, bearerToken = null, spoofRole = null) {
  const baseUrl = backendUrl.replace(/\/+$/, '');
  const headers = {
    accept: 'application/json',
  };
  if (probe.body) headers['content-type'] = 'application/json';
  if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;
  if (spoofRole) headers['x-user-role'] = spoofRole;
  const response = await fetch(`${baseUrl}${probe.path}`, {
    method: probe.method,
    headers,
    body: probe.body ? JSON.stringify(probe.body) : undefined,
  });
  const responseText = await response.text();
  assertNoForbiddenResponseLeaks(`backend ${probe.method} ${probe.path}`, responseText);
  return {
    status: response.status,
    requestId: response.headers.get('x-request-id') || '',
    responseText,
  };
}

function assertBackendProbeBlocked(probe, scenario, baseline, spoofed) {
  if (baseline.status !== 401) {
    throw new Error(
      `backend ${scenario} probe ${probe.method} ${probe.path} expected 401, got ${baseline.status}`,
    );
  }
  if (spoofed.status !== 401) {
    throw new Error(
      `backend ${scenario} x-user-role spoof probe ${probe.method} ${probe.path} expected 401, got ${spoofed.status}`,
    );
  }
  if (baseline.status !== spoofed.status) {
    throw new Error(
      `backend ${scenario} x-user-role spoof changed status ${probe.method} ${probe.path} ${baseline.status} -> ${spoofed.status}`,
    );
  }
}

async function auditBackendProbes(backendUrl) {
  const scenarios = [
    ['no-auth', null],
    ['malformed-jwt', MALFORMED_JWT],
    ['expired-test-jwt', EXPIRED_TEST_JWT],
  ];
  for (const probe of [...BACKEND_PROBES, ...BACKEND_MUTATION_PROBES]) {
    const statuses = [];
    let requestId = '';
    for (const [scenario, bearerToken] of scenarios) {
      const baseline = await getBackendProbe(backendUrl, probe, bearerToken);
      const spoofed = await getBackendProbe(backendUrl, probe, bearerToken, 'trainer');
      assertBackendProbeBlocked(probe, scenario, baseline, spoofed);
      statuses.push(`${scenario}=${baseline.status}/${spoofed.status}`);
      requestId = spoofed.requestId || baseline.requestId || requestId;
    }
    console.log(
      `[live-security-audit] PASS backend auth probe ${probe.method} ${probe.path} ${statuses.join(' ')} request_id=${requestId || 'n/a'}`,
    );
  }
}

function buildRlsRestProbes(args) {
  return [
    args.rlsDogId && { table: 'dogs', query: `id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'dog_env', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'behavior_logs', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'training_step_attempts', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'case_intakes', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'user_training_status', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'training_behavior_snapshots', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'ai_recommendation_snapshots', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsCoachingId && { table: 'ai_coaching', query: `id=eq.${encodeURIComponent(args.rlsCoachingId)}` },
    args.rlsCoachingId && { table: 'action_tracker', query: `coaching_id=eq.${encodeURIComponent(args.rlsCoachingId)}` },
    args.rlsGenerationJobId && {
      table: 'coaching_generation_jobs',
      query: `id=eq.${encodeURIComponent(args.rlsGenerationJobId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'ai_recommendation_feedback',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'subscriptions',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'user_entitlements',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'user_settings',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsTossOrderId && { table: 'toss_orders', query: `id=eq.${encodeURIComponent(args.rlsTossOrderId)}` },
    args.rlsOrgId && { table: 'organizations', query: `id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'org_members', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'org_dogs', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'dog_assignments', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'org_subscriptions', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'media_assets', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsReportId && { table: 'daily_reports', query: `id=eq.${encodeURIComponent(args.rlsReportId)}` },
    args.rlsReportId && { table: 'media_assets', query: `report_id=eq.${encodeURIComponent(args.rlsReportId)}` },
  ].filter(Boolean);
}

function buildRlsRestWriteProbes(args) {
  return [
    args.rlsDogId && { table: 'dogs', query: `id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'dog_env', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'behavior_logs', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'training_step_attempts', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'case_intakes', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'user_training_status', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'training_behavior_snapshots', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { table: 'ai_recommendation_snapshots', query: `dog_id=eq.${encodeURIComponent(args.rlsDogId)}` },
    args.rlsCoachingId && { table: 'ai_coaching', query: `id=eq.${encodeURIComponent(args.rlsCoachingId)}` },
    args.rlsCoachingId && { table: 'action_tracker', query: `coaching_id=eq.${encodeURIComponent(args.rlsCoachingId)}` },
    args.rlsGenerationJobId && {
      table: 'coaching_generation_jobs',
      query: `id=eq.${encodeURIComponent(args.rlsGenerationJobId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'ai_recommendation_feedback',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'subscriptions',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'user_entitlements',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsSubscriptionUserId && {
      table: 'user_settings',
      query: `user_id=eq.${encodeURIComponent(args.rlsSubscriptionUserId)}`,
    },
    args.rlsTossOrderId && { table: 'toss_orders', query: `id=eq.${encodeURIComponent(args.rlsTossOrderId)}` },
    args.rlsOrgId && { table: 'organizations', query: `id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'org_members', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'org_dogs', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'dog_assignments', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'org_subscriptions', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { table: 'media_assets', query: `org_id=eq.${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsReportId && { table: 'daily_reports', query: `id=eq.${encodeURIComponent(args.rlsReportId)}` },
    args.rlsReportId && { table: 'media_assets', query: `report_id=eq.${encodeURIComponent(args.rlsReportId)}` },
  ].filter(Boolean);
}

function buildRlsRestInsertProbes(args) {
  const zeroUserId = '00000000-0000-4000-8000-000000000000';
  const targetUserId = args.rlsVictimUserId || args.rlsSubscriptionUserId || zeroUserId;
  const targetDogId = args.rlsDogId || '00000000-0000-4000-8000-000000000000';
  const probeSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}`;

  return [
    args.rlsDogId && {
      table: 'coaching_generation_jobs',
      body: {
        dog_id: targetDogId,
        status: 'completed',
        source: 'security-probe',
      },
    },
    args.rlsDogId && {
      table: 'case_intakes',
      body: {
        dog_id: targetDogId,
        author_user_id: targetUserId,
        source_context: 'pro_intake',
        status: 'submitted',
        version: 1,
        sections: {},
        behavior_episodes: [],
      },
    },
    args.rlsDogId && {
      table: 'user_training_status',
      body: {
        user_id: targetUserId,
        dog_id: targetDogId,
        curriculum_id: 'security_probe_curriculum',
        stage_id: 'security_probe_stage',
        step_number: 1,
        status: 'COMPLETED',
      },
    },
    args.rlsDogId && {
      table: 'ai_recommendation_snapshots',
      body: {
        dog_id: targetDogId,
        user_id: targetUserId,
        window_days: 7,
        dedupe_key: `security-probe-recommendation-${probeSuffix}`,
        prompt_version: 'SECURITY_PROBE',
        model: 'security-probe',
        summary_hash: `security-probe-${probeSuffix}`,
        issue: 'security-probe',
        recommendations: [],
        rationale: 'security-probe',
        source: 'security-probe',
        expires_at: '2026-06-02T00:00:00Z',
      },
    },
    args.rlsCoachingId && {
      table: 'action_tracker',
      body: {
        coaching_id: args.rlsCoachingId,
        action_item_id: `security-probe-${probeSuffix}`,
        is_completed: true,
      },
    },
    args.rlsSubscriptionUserId && {
      table: 'subscriptions',
      body: {
        user_id: targetUserId,
        plan_type: 'PRO_MONTHLY',
        is_active: true,
        ai_tokens_remaining: 999,
        ai_tokens_total: 999,
      },
    },
    args.rlsSubscriptionUserId && {
      table: 'user_entitlements',
      body: {
        user_id: targetUserId,
        type: 'PRO_DAY_PASS',
        source: 'contacts_viral',
        source_module_id: `security-probe-${probeSuffix}`,
        expires_at: '2026-06-02T00:00:00Z',
      },
    },
    args.rlsSubscriptionUserId && {
      table: 'user_settings',
      body: {
        user_id: targetUserId,
        notification_pref: { security_probe: true },
        marketing_agreed: true,
      },
    },
    args.rlsSubscriptionUserId && {
      table: 'toss_orders',
      body: {
        user_id: targetUserId,
        product_id: 'security-probe-product',
        idempotency_key: `security-probe-idempotency-${probeSuffix}`,
        toss_order_id: `security-probe-order-${probeSuffix}`,
        toss_status: 'PAYMENT_COMPLETED',
        grant_status: 'granted',
        amount: 1,
      },
    },
    args.rlsOrgId && {
      table: 'organizations',
      body: {
        id: args.rlsOrgId,
        name: 'security-probe-org',
        status: 'active',
      },
    },
    args.rlsOrgId && {
      table: 'org_members',
      body: {
        org_id: args.rlsOrgId,
        user_id: targetUserId,
        role: 'owner',
        status: 'active',
      },
    },
    args.rlsOrgId && {
      table: 'org_subscriptions',
      body: {
        org_id: args.rlsOrgId,
        plan_type: 'center_basic',
        toss_order_id: `security-probe-b2b-order-${probeSuffix}`,
        price_krw: 29000,
        max_dogs: 30,
        max_staff: 5,
        billing_cycle: 'monthly',
        started_at: '2026-06-01T00:00:00Z',
        expires_at: '2026-07-01T00:00:00Z',
        status: 'active',
      },
    },
    args.rlsOrgId && args.rlsDogId && {
      table: 'org_dogs',
      body: {
        org_id: args.rlsOrgId,
        dog_id: targetDogId,
        status: 'active',
      },
    },
    args.rlsOrgId && args.rlsDogId && {
      table: 'dog_assignments',
      body: {
        org_id: args.rlsOrgId,
        dog_id: targetDogId,
        trainer_user_id: targetUserId,
        role: 'primary',
        status: 'active',
      },
    },
    args.rlsOrgId && args.rlsDogId && {
      table: 'daily_reports',
      body: {
        dog_id: targetDogId,
        report_date: '2026-06-01',
        template_type: 'daily',
        created_by_org_id: args.rlsOrgId,
        generation_status: 'sent',
      },
    },
    (args.rlsOrgId || args.rlsReportId) && {
      table: 'media_assets',
      body: {
        report_id: args.rlsReportId || null,
        org_id: args.rlsOrgId || null,
        storage_url: 'https://security-probe.invalid/media.jpg',
        asset_type: 'photo',
        is_highlight: true,
      },
    },
  ].filter(Boolean);
}

function buildRlsBackendProbes(args) {
  return [
    args.rlsDogId && { method: 'GET', path: `/api/v1/dogs/${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { method: 'GET', path: `/api/v1/logs/${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { method: 'GET', path: `/api/v1/coaching/${encodeURIComponent(args.rlsDogId)}` },
    args.rlsDogId && { method: 'GET', path: `/api/v1/coaching/${encodeURIComponent(args.rlsDogId)}/latest` },
    args.rlsDogId && { method: 'GET', path: `/api/v1/report/dog/${encodeURIComponent(args.rlsDogId)}` },
    args.rlsOrgId && { method: 'GET', path: `/api/v1/org/${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsOrgId && { method: 'GET', path: `/api/v1/org/${encodeURIComponent(args.rlsOrgId)}/members` },
    args.rlsOrgId && { method: 'GET', path: `/api/v1/org/${encodeURIComponent(args.rlsOrgId)}/dogs` },
    args.rlsOrgId && { method: 'GET', path: `/api/v1/org/${encodeURIComponent(args.rlsOrgId)}/assignments` },
    args.rlsOrgId && { method: 'GET', path: `/api/v1/report/org/${encodeURIComponent(args.rlsOrgId)}` },
    args.rlsReportId && { method: 'GET', path: `/api/v1/report/${encodeURIComponent(args.rlsReportId)}` },
  ].filter(Boolean);
}

function buildRlsBackendMutationProbes(args) {
  const targetDogId = args.rlsDogId || '00000000-0000-4000-8000-000000000000';
  const targetUserId = args.rlsVictimUserId || args.rlsSubscriptionUserId || '00000000-0000-4000-8000-000000000000';

  return [
    args.rlsDogId && {
      method: 'PUT',
      path: `/api/v1/dogs/${encodeURIComponent(args.rlsDogId)}`,
      body: {},
    },
    args.rlsDogId && {
      method: 'POST',
      path: '/api/v1/logs/quick',
      body: {
        dog_id: targetDogId,
        category: 'barking',
        intensity: 3,
        occurrence_count: 1,
        occurred_at: '2026-06-01T00:00:00Z',
        memo: 'security-rls-cross-user-probe',
      },
    },
    args.rlsDogId && {
      method: 'POST',
      path: '/api/v1/coaching/generation-jobs',
      body: {
        dog_id: targetDogId,
        report_type: 'DAILY',
        window_days: 7,
        user_context: 'security-rls-cross-user-probe',
      },
    },
    args.rlsDogId && {
      method: 'POST',
      path: '/api/v1/training/status',
      body: {
        dog_id: targetDogId,
        curriculum_id: 'security_probe_curriculum',
        stage_id: 'security_probe_stage',
        step_number: 1,
        status: 'COMPLETED',
        current_variant: 'A',
        memo: 'security-rls-cross-user-probe',
      },
    },
    args.rlsOrgId && {
      method: 'PATCH',
      path: `/api/v1/org/${encodeURIComponent(args.rlsOrgId)}`,
      body: {},
    },
    args.rlsOrgId && {
      method: 'POST',
      path: '/api/v1/org/members/invite',
      body: {
        org_id: args.rlsOrgId,
        user_id: targetUserId,
        role: 'owner',
      },
    },
    args.rlsOrgId && args.rlsDogId && {
      method: 'POST',
      path: '/api/v1/org/dogs/enroll',
      body: {
        org_id: args.rlsOrgId,
        dog_id: targetDogId,
        group_tag: 'security-probe',
      },
    },
    args.rlsOrgId && args.rlsDogId && {
      method: 'POST',
      path: '/api/v1/org/assignments',
      body: {
        org_id: args.rlsOrgId,
        dog_id: targetDogId,
        trainer_user_id: targetUserId,
        role: 'primary',
      },
    },
    args.rlsDogId && {
      method: 'POST',
      path: '/api/v1/report/',
      body: {
        dog_id: targetDogId,
        report_date: '2026-06-01',
        template_type: 'daycare_general',
        created_by_org_id: args.rlsOrgId || undefined,
      },
    },
    args.rlsReportId && {
      method: 'PATCH',
      path: `/api/v1/report/${encodeURIComponent(args.rlsReportId)}`,
      body: {},
    },
    args.rlsReportId && {
      method: 'PATCH',
      path: `/api/v1/report/${encodeURIComponent(args.rlsReportId)}/send`,
      body: {},
    },
  ].filter(Boolean);
}

function getMissingRequiredRlsResourceArgs(args) {
  const required = [
    ['--rls-victim-user-id', args.rlsVictimUserId],
    ['--rls-dog-id', args.rlsDogId],
    ['--rls-coaching-id', args.rlsCoachingId],
    ['--rls-generation-job-id', args.rlsGenerationJobId],
    ['--rls-subscription-user-id', args.rlsSubscriptionUserId],
    ['--rls-toss-order-id', args.rlsTossOrderId],
    ['--rls-org-id', args.rlsOrgId],
    ['--rls-report-id', args.rlsReportId],
  ];
  return required.filter(([, value]) => !value).map(([name]) => name);
}

function decodeJwtPayload(jwt) {
  const parts = jwt.split('.');
  if (parts.length < 2) throw new Error('RLS attacker JWT is not a JWT-shaped token');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    throw new Error('RLS attacker JWT payload is not valid JSON');
  }
}

function resolveJwtSubject(payload) {
  const subject = payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new Error('RLS attacker JWT is missing a sub claim');
  }
  if (!UUID_V4ISH_PATTERN.test(subject)) {
    throw new Error('RLS attacker JWT subject must be a Supabase user UUID');
  }
  return subject;
}

function assertRlsAttackerJwtClaims(payload) {
  const role = typeof payload.role === 'string' ? payload.role : '';
  if (FORBIDDEN_RLS_ATTACKER_JWT_ROLES.has(role)) {
    throw new Error(`RLS attacker JWT role ${role} cannot prove user-level RLS isolation`);
  }
  if (typeof payload.exp !== 'number') {
    throw new Error('RLS attacker JWT is missing numeric exp claim');
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) {
    throw new Error('RLS attacker JWT is expired; refresh the attacker fixture');
  }
}

function assertRlsCrossUserFixture(args) {
  const attackerPayload = decodeJwtPayload(args.rlsAttackerJwt);
  assertRlsAttackerJwtClaims(attackerPayload);
  const attackerUserId = resolveJwtSubject(attackerPayload);
  if (args.rlsVictimUserId && attackerUserId === args.rlsVictimUserId) {
    throw new Error('RLS attacker JWT subject matches --rls-victim-user-id; fixtures must be cross-user');
  }
  if (args.rlsSubscriptionUserId && attackerUserId === args.rlsSubscriptionUserId) {
    throw new Error('RLS attacker JWT subject matches --rls-subscription-user-id; use another user ledger row');
  }
}

async function auditRlsRestProbes(projectRef, anonKey, attackerJwt, probes) {
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  for (const probe of probes) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${probe.table}?select=id&${probe.query}`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${attackerJwt}`,
        accept: 'application/json',
      },
    });
    const text = await response.text();
    assertNoForbiddenResponseLeaks(`rls rest ${probe.table}`, text);
    let rows = [];
    if (response.status === 200) {
      rows = parseJsonOutput(text || '[]', `RLS REST ${probe.table}`);
      if (!Array.isArray(rows)) {
        throw new Error(`RLS REST ${probe.table} did not return an array`);
      }
      if (rows.length > 0) {
        throw new Error(`RLS REST ${probe.table}?${probe.query} leaked ${rows.length} row(s) to attacker JWT`);
      }
    } else if (![401, 403, 404].includes(response.status)) {
      throw new Error(`RLS REST ${probe.table}?${probe.query} expected empty/blocked response, got ${response.status}: ${text.slice(0, 200)}`);
    }
    console.log(`[live-security-audit] PASS rls rest probe ${probe.table}?${probe.query} status=${response.status} rows=${rows.length}`);
  }
}

async function auditRlsRestWriteProbes(projectRef, anonKey, attackerJwt, probes) {
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  for (const probe of probes) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${probe.table}?select=id&${probe.query}`, {
      method: 'PATCH',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${attackerJwt}`,
        accept: 'application/json',
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify({}),
    });
    const text = await response.text();
    assertNoForbiddenResponseLeaks(`rls rest write ${probe.table}`, text);
    let rows = [];
    if (response.status === 200) {
      rows = parseJsonOutput(text || '[]', `RLS REST write ${probe.table}`);
      if (!Array.isArray(rows)) {
        throw new Error(`RLS REST write ${probe.table} did not return an array`);
      }
      if (rows.length > 0) {
        throw new Error(`RLS REST write ${probe.table}?${probe.query} allowed ${rows.length} row update(s) to attacker JWT`);
      }
    } else if (![204, 401, 403, 404].includes(response.status)) {
      throw new Error(`RLS REST write ${probe.table}?${probe.query} expected empty/blocked response, got ${response.status}: ${text.slice(0, 200)}`);
    }
    console.log(`[live-security-audit] PASS rls rest write probe ${probe.table}?${probe.query} status=${response.status} rows=${rows.length}`);
  }
}

async function auditRlsRestInsertProbes(projectRef, anonKey, attackerJwt, probes) {
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  for (const probe of probes) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${probe.table}?select=id`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${attackerJwt}`,
        accept: 'application/json',
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify(probe.body),
    });
    const text = await response.text();
    assertNoForbiddenResponseLeaks(`rls rest insert ${probe.table}`, text);
    if (response.status >= 200 && response.status < 300) {
      throw new Error(`RLS REST insert ${probe.table} allowed forged row to attacker JWT: ${text.slice(0, 200)}`);
    }
    if (![400, 401, 403, 404, 409, 422].includes(response.status)) {
      throw new Error(`RLS REST insert ${probe.table} expected blocked/rejected response, got ${response.status}: ${text.slice(0, 200)}`);
    }
    console.log(`[live-security-audit] PASS rls rest insert probe ${probe.table} status=${response.status}`);
  }
}

async function auditRlsBackendProbes(backendUrl, attackerJwt, probes) {
  const baseUrl = backendUrl.replace(/\/+$/, '');
  for (const probe of probes) {
    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${attackerJwt}`,
    };
    if (probe.body) headers['content-type'] = 'application/json';
    const response = await fetch(`${baseUrl}${probe.path}`, {
      method: probe.method,
      headers,
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    });
    const text = await response.text();
    assertNoForbiddenResponseLeaks(`rls backend ${probe.method} ${probe.path}`, text);
    if (response.status >= 200 && response.status < 300) {
      throw new Error(`RLS backend ${probe.method} ${probe.path} unexpectedly returned ${response.status} to attacker JWT`);
    }
    if (![401, 403, 404].includes(response.status)) {
      throw new Error(`RLS backend ${probe.method} ${probe.path} expected 401/403/404, got ${response.status}`);
    }
    console.log(`[live-security-audit] PASS rls backend probe ${probe.method} ${probe.path} status=${response.status}`);
  }
}

async function auditRlsProbes(args) {
  const anonKey = resolveAnonKey();
  if (!anonKey) throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY for --probe-rls');
  if (!args.rlsAttackerJwt) throw new Error('Missing --rls-attacker-jwt or SECURITY_RLS_ATTACKER_JWT for --probe-rls');
  assertRlsCrossUserFixture(args);

  const missingRequiredResources = getMissingRequiredRlsResourceArgs(args);
  if (!args.rlsAllowPartial && missingRequiredResources.length > 0) {
    throw new Error(
      `Missing required RLS resource ids for complete probe: ${missingRequiredResources.join(', ')}. ` +
      'Pass --rls-allow-partial only for a deliberately scoped diagnostic run.',
    );
  }

  const restProbes = buildRlsRestProbes(args);
  const restWriteProbes = buildRlsRestWriteProbes(args);
  const restInsertProbes = buildRlsRestInsertProbes(args);
  const backendProbes = buildRlsBackendProbes(args);
  const backendMutationProbes = buildRlsBackendMutationProbes(args);
  if (
    restProbes.length === 0
    && restWriteProbes.length === 0
    && restInsertProbes.length === 0
    && backendProbes.length === 0
    && backendMutationProbes.length === 0
  ) {
    throw new Error('Missing RLS resource ids; pass at least one of --rls-dog-id, --rls-coaching-id, --rls-generation-job-id, --rls-subscription-user-id, --rls-toss-order-id, --rls-org-id, --rls-report-id');
  }

  await auditRlsRestProbes(args.projectRef, anonKey, args.rlsAttackerJwt, restProbes);
  await auditRlsRestWriteProbes(args.projectRef, anonKey, args.rlsAttackerJwt, restWriteProbes);
  await auditRlsRestInsertProbes(args.projectRef, anonKey, args.rlsAttackerJwt, restInsertProbes);
  await auditRlsBackendProbes(args.backendUrl, args.rlsAttackerJwt, backendProbes);
  await auditRlsBackendProbes(args.backendUrl, args.rlsAttackerJwt, backendMutationProbes);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const failures = [];
  const fullAudit = !args.edgeProbesOnly && !args.backendProbesOnly && !args.rlsProbesOnly && !args.logScanOnly;
  const requireLiveLogFile = fullAudit || args.requireLogFile;

  if (args.logScanOnly) {
    auditLogFile(args.logFile, true);
    return;
  }

  if (fullAudit) {
    await collectAuditFailure('release artifact security scan', failures, () => auditReleaseArtifact());
    await collectAuditFailure('local runtime hardening source scan', failures, () => auditLocalRuntimeHardening());
    await collectAuditFailure('local Edge function config/source auth scan', failures, () => auditLocalFunctionConfig());
    await collectAuditFailure('local RLS policy source scan', failures, () => auditLocalRlsPolicySource());
    await collectAuditFailure('functions verify_jwt management check', failures, () => auditFunctions(args.projectRef));
    await collectAuditFailure('linked migrations management check', failures, () => auditMigrations());
    await collectAuditFailure('required Edge secret names check', failures, () => auditSecrets(args.projectRef));
    await collectAuditFailure('live log PII scan', failures, () => auditLogFile(args.logFile, requireLiveLogFile));
  }
  if (args.probeEdge || fullAudit) {
    await collectAuditFailure('public Edge spoof probes', failures, () => auditEdgeProbes(args.projectRef));
  }
  if (args.probeBackend || fullAudit) {
    await collectAuditFailure('public Backend auth probes', failures, () => auditBackendProbes(args.backendUrl));
  }
  if (args.probeRls || fullAudit) {
    await collectAuditFailure('authenticated RLS cross-access probes', failures, () => auditRlsProbes(args));
  }

  const hardFailures = failures.filter((failure) => failure.label !== 'live log PII scan' || requireLiveLogFile);
  if (hardFailures.length > 0) {
    throw new Error(
      `security live audit incomplete: ${hardFailures
        .map((failure) => `${failure.label}: ${failure.error.message.split('\n')[0]}`)
        .join(' | ')}`,
    );
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  BACKEND_MUTATION_PROBES,
  BACKEND_PROBES,
  buildRlsBackendMutationProbes,
  buildRlsBackendProbes,
  buildRlsRestInsertProbes,
  buildRlsRestProbes,
  buildRlsRestWriteProbes,
  DEFAULT_BACKEND_URL,
  EDGE_PROBES,
  EXPIRED_TEST_JWT,
  EXPECTED_FUNCTION_VERIFY_JWT,
  FORBIDDEN_LOG_MARKERS,
  FORBIDDEN_LOG_PATTERNS,
  LOGIN_AUTH_CODE_PROBES,
  MALFORMED_JWT,
  REQUIRED_MIGRATION_IDS,
  REQUIRED_SECRET_NAMES,
  auditLocalFunctionConfig,
  auditLocalRlsPolicySource,
  auditLocalRuntimeHardening,
  auditSecrets,
  assertNoForbiddenResponseLeaks,
  findForbiddenLogLeaks,
  flattenJsonForLogScan,
  normalizeLogTextForScan,
  resolveAnonKey,
  normalizeFunctions,
  normalizeSecretNames,
  parseArgs,
  applyRlsFixtureFile,
  getMissingRequiredRlsResourceArgs,
  assertRlsCrossUserFixture,
  decodeJwtPayload,
  resolveJwtSubject,
};
