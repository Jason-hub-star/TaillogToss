/**
 * login-with-toss — Toss OAuth2 코드를 세션으로 교환하는 무인증 Edge Function.
 * Parity: AUTH-001 (verify_jwt=false)
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import { createMTLSClient, type MTLSClient } from '../_shared/mTLSClient.ts';
import { resolvePeppersFromEnv, deriveWithLatestPepper, type PepperConfig } from '../_shared/pepperRotation.ts';
import { safeLogPayload } from '../_shared/piiGuard.ts';
import { loginRateLimiter, type InMemoryRateLimiter } from '../_shared/rateLimiter.ts';
import { decryptTossPiiField, isTossEncryptedField } from '../_shared/tossPiiDecrypt.ts';
import { readEnv, resolveMtlsMode } from '../_shared/mtlsMode.ts';

type TossLoginReferrer = 'DEFAULT' | 'SANDBOX';

export interface LoginWithTossRequest {
  authorizationCode: string;
  referrer?: string;
  nonce: string;
}

export interface LoginWithTossResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    toss_user_key: string;
    role: 'user';
    status: 'active';
    pepper_version: number;
    timezone: 'Asia/Seoul';
    last_login_at: string;
    created_at: string;
    updated_at: string;
  };
  is_new_user: boolean;
}

interface LoginFailureState {
  consecutiveFailures: number;
  blockedUntil?: number;
}

interface TossStatusError extends Error {
  status?: number;
  code?: string;
}

interface BridgeSessionResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BridgeSessionInput {
  tossUserKey: string;
  pepperVersion: number;
  nowIso: string;
}

interface LoginHandlerDeps {
  mTLSClient: MTLSClient;
  peppers: PepperConfig[];
  tossPiiDecryptionKey: string | null;
  rateLimiter: InMemoryRateLimiter;
  now: () => Date;
  bridgeSession: (input: BridgeSessionInput) => Promise<BridgeSessionResult>;
  logger?: (event: string, payload: Record<string, unknown>) => void;
}

const loginFailures = new Map<string, LoginFailureState>();

function updateLoginFailure(clientKey: string, nowMs: number): number {
  const prev = loginFailures.get(clientKey) ?? { consecutiveFailures: 0 };
  const next = prev.consecutiveFailures + 1;

  if (next >= 5) {
    loginFailures.set(clientKey, {
      consecutiveFailures: next,
      blockedUntil: nowMs + 30_000,
    });
    return 30;
  }

  loginFailures.set(clientKey, { consecutiveFailures: next });
  return 0;
}

function clearLoginFailure(clientKey: string): void {
  loginFailures.delete(clientKey);
}

function getBlockRetrySeconds(clientKey: string, nowMs: number): number {
  const state = loginFailures.get(clientKey);
  if (!state?.blockedUntil) return 0;

  const remainingMs = state.blockedUntil - nowMs;
  if (remainingMs <= 0) {
    loginFailures.delete(clientKey);
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
}

function resolveTossPiiDecryptionKey(): string | null {
  return (
    readEnv('TOSS_PII_DECRYPTION_KEY_BASE64') ??
    readEnv('TOSS_PROFILE_DECRYPTION_KEY_BASE64') ??
    readEnv('TOSS_PROFILE_DECRYPTION_KEY') ??
    null
  );
}

function normalizeTossUserKey(raw: string | undefined): string {
  return (raw ?? '').trim();
}

function toBridgeEmail(tossUserKey: string): string {
  const safe = tossUserKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  const local = safe.length > 0 ? safe.slice(0, 48) : `uk_${Date.now().toString(36)}`;
  return `toss_${local}@taillog.local`;
}

function toStatusError(message: string, status: number, code: string): TossStatusError {
  const error = new Error(message) as TossStatusError;
  error.status = status;
  error.code = code;
  return error;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

async function deriveBridgePassword(tossUserKey: string): Promise<string> {
  const bridgeSecret = readEnv('AUTH_BRIDGE_SECRET') ?? readEnv('SUPER_SECRET_PEPPER') ?? 'dev-bridge-secret';
  const payload = `${tossUserKey}:${bridgeSecret}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const encoded = bytesToBase64(new Uint8Array(digest)).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  return `${encoded}Aa1!`;
}

function getSupabaseBridgeEnv(): { supabaseUrl: string; serviceRoleKey: string } {
  const supabaseUrl = readEnv('SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw toStatusError(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
      500,
      'SUPABASE_ENV_MISSING',
    );
  }
  return { supabaseUrl, serviceRoleKey };
}

async function ensureAuthUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string,
  tossUserKey: string,
): Promise<void> {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        toss_user_key: tossUserKey,
        role: 'user',
        status: 'active',
        timezone: 'Asia/Seoul',
      },
      app_metadata: {
        provider: 'toss',
        providers: ['toss'],
      },
    }),
  });

  if (response.ok) return;

  const body = await response.text().catch(() => '');
  if (
    response.status === 422 ||
    body.toLowerCase().includes('already') ||
    body.toLowerCase().includes('exists')
  ) {
    return;
  }

  throw toStatusError(
    `Failed to provision auth user: ${response.status} ${body}`,
    response.status,
    'SUPABASE_AUTH_PROVISION_FAILED',
  );
}

async function signInBridgeUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string; createdAt?: string; updatedAt?: string }> {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.text().catch(() => '');
  if (!response.ok) {
    throw toStatusError(
      `Failed to issue auth session: ${response.status} ${body}`,
      response.status,
      'SUPABASE_AUTH_TOKEN_FAILED',
    );
  }

  const parsed = JSON.parse(body) as {
    access_token?: string;
    refresh_token?: string;
    user?: { id?: string; created_at?: string; updated_at?: string };
  };

  const accessToken = parsed.access_token;
  const refreshToken = parsed.refresh_token;
  const userId = parsed.user?.id;

  if (!accessToken || !refreshToken || !userId) {
    throw toStatusError('Invalid token payload from Supabase Auth', 502, 'SUPABASE_AUTH_TOKEN_INVALID');
  }

  return {
    accessToken,
    refreshToken,
    userId,
    createdAt: parsed.user?.created_at,
    updatedAt: parsed.user?.updated_at,
  };
}

async function upsertPublicUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  tossUserKey: string,
  pepperVersion: number,
  nowIso: string,
): Promise<{ createdAt?: string; updatedAt?: string }> {
  const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([
      {
        id: userId,
        toss_user_key: tossUserKey,
        role: 'user',
        status: 'active',
        timezone: 'Asia/Seoul',
        pepper_version: pepperVersion,
        last_login_at: nowIso,
        updated_at: nowIso,
      },
    ]),
  });

  const body = await response.text().catch(() => '');
  if (!response.ok) {
    throw toStatusError(
      `Failed to upsert public user: ${response.status} ${body}`,
      response.status,
      'SUPABASE_PUBLIC_USER_UPSERT_FAILED',
    );
  }

  const rows = JSON.parse(body) as Array<{ created_at?: string; updated_at?: string }>;
  const row = rows[0];
  return { createdAt: row?.created_at, updatedAt: row?.updated_at };
}

async function bridgeSessionWithSupabase(input: BridgeSessionInput): Promise<BridgeSessionResult> {
  const tossUserKey = normalizeTossUserKey(input.tossUserKey);
  if (!tossUserKey) {
    throw toStatusError('toss_user_key is empty', 400, 'INVALID_TOSS_USER_KEY');
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseBridgeEnv();
  const email = toBridgeEmail(tossUserKey);
  const password = await deriveBridgePassword(tossUserKey);

  await ensureAuthUser(supabaseUrl, serviceRoleKey, email, password, tossUserKey);

  const session = await signInBridgeUser(supabaseUrl, serviceRoleKey, email, password);
  const userRow = await upsertPublicUser(
    supabaseUrl,
    serviceRoleKey,
    session.userId,
    tossUserKey,
    input.pepperVersion,
    input.nowIso,
  );

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userId: session.userId,
    createdAt: userRow.createdAt ?? session.createdAt,
    updatedAt: userRow.updatedAt ?? session.updatedAt,
  };
}

function defaultLoginDeps(): LoginHandlerDeps {
  return {
    mTLSClient: createMTLSClient(resolveMtlsMode()),
    peppers: resolvePeppersFromEnv({
      SUPER_SECRET_PEPPER: readEnv('SUPER_SECRET_PEPPER'),
      SUPER_SECRET_PEPPER_V1: readEnv('SUPER_SECRET_PEPPER_V1'),
      SUPER_SECRET_PEPPER_V2: readEnv('SUPER_SECRET_PEPPER_V2'),
    }),
    tossPiiDecryptionKey: resolveTossPiiDecryptionKey(),
    rateLimiter: loginRateLimiter,
    now: () => new Date(),
    bridgeSession: bridgeSessionWithSupabase,
    logger: (event: string, payload: Record<string, unknown>) => {
      console.log(`[login-with-toss] ${event}`, JSON.stringify(payload));
    },
  };
}

function normalizeRequest(input: LoginWithTossRequest): LoginWithTossRequest {
  const rawReferrer = input.referrer?.trim();
  const normalizedReferrer = rawReferrer
    ? (rawReferrer.toUpperCase() === 'SANDBOX' ? 'SANDBOX' : (rawReferrer.toUpperCase() === 'DEFAULT' ? 'DEFAULT' : undefined))
    : undefined;
  return {
    authorizationCode: input.authorizationCode?.trim() ?? '',
    referrer: normalizedReferrer,
    nonce: input.nonce?.trim() ?? '',
  };
}

export function createLoginWithTossHandler(overrides?: Partial<LoginHandlerDeps>) {
  const deps = { ...defaultLoginDeps(), ...(overrides ?? {}) };

  return async (
    input: LoginWithTossRequest,
    context: EdgeContext
  ): Promise<EdgeResult<LoginWithTossResponse>> => {
    const request = normalizeRequest(input);
    const now = deps.now();
    const nowMs = now.getTime();

    if (!request.authorizationCode) {
      return fail('VALIDATION_ERROR', 'authorizationCode is required', 400);
    }

    if (!request.referrer) {
      return fail('VALIDATION_ERROR', 'referrer must be DEFAULT or SANDBOX', 400);
    }

    if (request.nonce.length < 8) {
      return fail('VALIDATION_ERROR', 'nonce must be at least 8 chars', 400);
    }

    const blockedRetry = getBlockRetrySeconds(context.clientKey, nowMs);
    if (blockedRetry > 0) {
      return fail('AUTH_THROTTLED', 'Too many failed attempts', 429, {
        retryable: true,
        details: { retryAfterSeconds: blockedRetry },
      });
    }

    const rateLimit = deps.rateLimiter.consume(`login:${context.clientKey}`, nowMs);
    if (!rateLimit.allowed) {
      return fail('RATE_LIMITED', 'Too many requests', 429, {
        retryable: true,
        details: { retryAfterSeconds: rateLimit.retryAfterSeconds },
      });
    }

    try {
      const token = await deps.mTLSClient.exchangeAuthorizationCode(
        request.authorizationCode,
        request.referrer
      );
      const profile = await deps.mTLSClient.fetchLoginProfile(token.accessToken);
      const encryptedPiiCount = [
        profile.name,
        profile.phone,
        profile.birthday,
        profile.ci,
        profile.gender,
        profile.nationality,
        profile.email,
      ].filter(isTossEncryptedField).length;

      try {
        // 복호화 결과는 필요한 순간에만 사용하고, 로그/응답에는 포함하지 않는다.
        await Promise.all([
          decryptTossPiiField(profile.name, deps.tossPiiDecryptionKey),
          decryptTossPiiField(profile.phone, deps.tossPiiDecryptionKey),
          decryptTossPiiField(profile.birthday, deps.tossPiiDecryptionKey),
          decryptTossPiiField(profile.ci, deps.tossPiiDecryptionKey),
          decryptTossPiiField(profile.gender, deps.tossPiiDecryptionKey),
          decryptTossPiiField(profile.nationality, deps.tossPiiDecryptionKey),
          decryptTossPiiField(profile.email, deps.tossPiiDecryptionKey),
        ]);
      } catch (error) {
        deps.logger?.(
          'login_with_toss_pii_decrypt_failed',
          safeLogPayload({
            clientKey: context.clientKey,
            referrer: request.referrer,
            encryptedPiiCount,
            keyConfigured: !!deps.tossPiiDecryptionKey,
            errorMessage: error instanceof Error ? error.message : 'unknown',
          })
        );
      }

      const pepper = deriveWithLatestPepper(profile.userKey, deps.peppers);
      const timestamp = now.toISOString();
      const bridgeSession = await deps.bridgeSession({
        tossUserKey: profile.userKey,
        pepperVersion: pepper.pepperVersion,
        nowIso: timestamp,
      });

      const response: LoginWithTossResponse = {
        access_token: bridgeSession.accessToken,
        refresh_token: bridgeSession.refreshToken,
        user: {
          id: bridgeSession.userId,
          toss_user_key: profile.userKey,
          role: 'user',
          status: 'active',
          pepper_version: pepper.pepperVersion,
          timezone: 'Asia/Seoul',
          last_login_at: timestamp,
          created_at: bridgeSession.createdAt ?? timestamp,
          updated_at: bridgeSession.updatedAt ?? timestamp,
        },
        is_new_user: profile.isNewUser ?? false,
      };

      deps.logger?.('login_with_toss_success',
        safeLogPayload({
          clientKey: context.clientKey,
          referrer: request.referrer,
          userKey: profile.userKey,
          encryptedPiiCount,
          piiKeyConfigured: !!deps.tossPiiDecryptionKey,
        })
      );

      clearLoginFailure(context.clientKey);
      return ok(response);
    } catch (error) {
      const retryAfterSeconds = updateLoginFailure(context.clientKey, nowMs);
      const statusError = error as TossStatusError;
      const upstreamStatus = typeof statusError.status === 'number' ? statusError.status : undefined;
      const upstreamCode = typeof statusError.code === 'string' ? statusError.code : undefined;
      const upstreamMessage = statusError.message?.slice(0, 240);

      deps.logger?.('login_with_toss_failure',
        safeLogPayload({
          clientKey: context.clientKey,
          referrer: request.referrer,
          upstreamStatus,
          upstreamCode,
          errorMessage: upstreamMessage ?? 'unknown',
        })
      );

      const details: Record<string, unknown> = {};
      if (retryAfterSeconds > 0) details.retryAfterSeconds = retryAfterSeconds;
      if (upstreamStatus !== undefined) details.upstreamStatus = upstreamStatus;
      if (upstreamCode !== undefined) details.upstreamCode = upstreamCode;
      if (upstreamMessage) details.upstreamMessage = upstreamMessage;

      return fail('AUTH_LOGIN_FAILED', 'Failed to complete Toss login', 502, {
        retryable: true,
        details: Object.keys(details).length > 0 ? details : undefined,
      });
    }
  };
}

export const handleLoginWithToss = createLoginWithTossHandler();
