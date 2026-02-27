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

type TossLoginReferrer = 'DEFAULT' | 'sandbox' | string;

export interface LoginWithTossRequest {
  authorizationCode: string;
  referrer?: TossLoginReferrer;
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

interface LoginHandlerDeps {
  mTLSClient: MTLSClient;
  peppers: PepperConfig[];
  tossPiiDecryptionKey: string | null;
  rateLimiter: InMemoryRateLimiter;
  now: () => Date;
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

function readEnv(name: string): string | undefined {
  const fromNode = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[name];
  if (fromNode) return fromNode;

  const fromDeno = (globalThis as { Deno?: { env?: { get: (key: string) => string | undefined } } })
    .Deno?.env?.get(name);
  return fromDeno;
}

function resolveTossPiiDecryptionKey(): string | null {
  return (
    readEnv('TOSS_PII_DECRYPTION_KEY_BASE64') ??
    readEnv('TOSS_PROFILE_DECRYPTION_KEY_BASE64') ??
    readEnv('TOSS_PROFILE_DECRYPTION_KEY') ??
    null
  );
}

function resolveMtlsMode(): 'real' | 'mock' {
  const explicit = readEnv('TOSS_MTLS_MODE')?.trim().toLowerCase();
  if (explicit === 'real') return 'real';
  if (explicit === 'mock') return 'mock';

  // 기본은 실연동 우선. 단, 인증서/키가 둘 다 없으면 로컬 개발을 위해 mock으로 폴백한다.
  const cert = readEnv('TOSS_CLIENT_CERT_BASE64');
  const key = readEnv('TOSS_CLIENT_KEY_BASE64');
  return cert && key ? 'real' : 'mock';
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
    logger: (event: string, payload: Record<string, unknown>) => {
      console.log(`[login-with-toss] ${event}`, JSON.stringify(payload));
    },
  };
}

function normalizeRequest(input: LoginWithTossRequest): LoginWithTossRequest {
  return {
    authorizationCode: input.authorizationCode?.trim() ?? '',
    referrer: input.referrer?.trim() ?? undefined,
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
        request.referrer ?? 'DEFAULT'
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
      const sessionHint = pepper.password.slice(-8);
      const userId = `user_${profile.userKey}`;
      const timestamp = now.toISOString();

      const response: LoginWithTossResponse = {
        access_token: `sb_access_${sessionHint}`,
        refresh_token: `sb_refresh_${sessionHint}`,
        user: {
          id: userId,
          toss_user_key: profile.userKey,
          role: 'user',
          status: 'active',
          pepper_version: pepper.pepperVersion,
          timezone: 'Asia/Seoul',
          last_login_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
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
