/**
 * login-with-toss — Toss OAuth2 코드를 세션으로 교환하는 무인증 Edge Function.
 * Parity: AUTH-001 (verify_jwt=false)
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import { createMTLSClient, type MTLSClient } from '../_shared/mTLSClient.ts';
import { resolvePeppersFromEnv, deriveWithLatestPepper, type PepperConfig } from '../_shared/pepperRotation.ts';
import { safeLogPayload } from '../_shared/piiGuard.ts';
import { loginRateLimiter, type InMemoryRateLimiter } from '../_shared/rateLimiter.ts';

type UnlinkReferrer = 'UNLINK' | 'WITHDRAWAL_TERMS' | 'WITHDRAWAL_TOSS';

export interface LoginWithTossRequest {
  authorizationCode: string;
  referrer?: UnlinkReferrer;
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

interface LoginHandlerDeps {
  mTLSClient: MTLSClient;
  peppers: PepperConfig[];
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

function defaultLoginDeps(): LoginHandlerDeps {
  return {
    mTLSClient: createMTLSClient('mock'),
    peppers: resolvePeppersFromEnv({
      SUPER_SECRET_PEPPER: process.env.SUPER_SECRET_PEPPER,
      SUPER_SECRET_PEPPER_V1: process.env.SUPER_SECRET_PEPPER_V1,
      SUPER_SECRET_PEPPER_V2: process.env.SUPER_SECRET_PEPPER_V2,
    }),
    rateLimiter: loginRateLimiter,
    now: () => new Date(),
  };
}

function normalizeRequest(input: LoginWithTossRequest): LoginWithTossRequest {
  return {
    authorizationCode: input.authorizationCode?.trim() ?? '',
    referrer: input.referrer,
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
      const token = await deps.mTLSClient.exchangeAuthorizationCode(request.authorizationCode);
      const profile = await deps.mTLSClient.fetchLoginProfile(token.accessToken);

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
        })
      );

      clearLoginFailure(context.clientKey);
      return ok(response);
    } catch (error) {
      const retryAfterSeconds = updateLoginFailure(context.clientKey, nowMs);
      deps.logger?.('login_with_toss_failure',
        safeLogPayload({
          clientKey: context.clientKey,
          referrer: request.referrer,
          errorMessage: error instanceof Error ? error.message : 'unknown',
        })
      );

      return fail('AUTH_LOGIN_FAILED', 'Failed to complete Toss login', 502, {
        retryable: true,
        details: retryAfterSeconds > 0 ? { retryAfterSeconds } : undefined,
      });
    }
  };
}

export const handleLoginWithToss = createLoginWithTossHandler();
