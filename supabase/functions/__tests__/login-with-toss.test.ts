import { InMemoryRateLimiter } from '../_shared/rateLimiter.ts';
import { createMTLSClient } from '../_shared/mTLSClient.ts';
import { createLoginWithTossHandler } from '../login-with-toss/index.ts';

describe('login-with-toss handler', () => {
  test('returns session payload on valid request', async () => {
    const bridgeSession = jest.fn(async () => ({
      accessToken: 'test.mock.access',
      refreshToken: 'test.mock.refresh',
      userId: '11111111-1111-4111-8111-111111111111',
    }));
    const handler = createLoginWithTossHandler({
      mTLSClient: createMTLSClient('mock'),
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      now: () => new Date('2026-02-26T00:00:00.000Z'),
      bridgeSession,
    });

    const result = await handler(
      {
        authorizationCode: 'valid-code-b2c',
        referrer: 'SANDBOX',
        nonce: 'nonce-12345678',
        flow: 'B2C',
      },
      { clientKey: 'client-a' }
    );

    expect(result.ok).toBe(true);
    expect(result.data?.user.toss_user_key).toBe('toss_valid-code-b2c');
    expect(result.data?.user.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.data?.access_token.split('.').length).toBeGreaterThanOrEqual(3);
    expect(bridgeSession).toHaveBeenCalledWith(expect.objectContaining({ flow: 'B2C' }));
  });

  test('passes B2B flow through to bridge session', async () => {
    const bridgeSession = jest.fn(async () => ({
      accessToken: 'test.mock.access',
      refreshToken: 'test.mock.refresh',
      userId: '11111111-1111-4111-8111-111111111111',
    }));
    const handler = createLoginWithTossHandler({
      mTLSClient: createMTLSClient('mock'),
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      now: () => new Date('2026-02-26T00:00:00.000Z'),
      bridgeSession,
    });

    const result = await handler(
      {
        authorizationCode: 'valid-code-b2b',
        referrer: 'SANDBOX',
        nonce: 'nonce-12345678',
        flow: 'B2B',
      },
      { clientKey: 'client-b' }
    );

    expect(result.ok).toBe(true);
    expect(bridgeSession).toHaveBeenCalledWith(expect.objectContaining({ flow: 'B2B' }));
  });

  test('rejects short nonce', async () => {
    const handler = createLoginWithTossHandler({
      mTLSClient: createMTLSClient('mock'),
      bridgeSession: async () => ({
        accessToken: 'test.mock.access',
        refreshToken: 'test.mock.refresh',
        userId: '11111111-1111-4111-8111-111111111111',
      }),
    });
    const result = await handler(
      {
        authorizationCode: 'valid-code',
        referrer: 'DEFAULT',
        nonce: 'short',
      },
      { clientKey: 'client-a' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  test('rejects missing referrer', async () => {
    const handler = createLoginWithTossHandler({
      mTLSClient: createMTLSClient('mock'),
      bridgeSession: async () => ({
        accessToken: 'test.mock.access',
        refreshToken: 'test.mock.refresh',
        userId: '11111111-1111-4111-8111-111111111111',
      }),
    });
    const result = await handler(
      {
        authorizationCode: 'valid-code',
        nonce: 'nonce-12345678',
      },
      { clientKey: 'client-a' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(result.error?.message).toContain('referrer');
  });

  test('does not expose upstream auth code/token details on Toss login failure', async () => {
    const logger = jest.fn();
    const error = new Error('invalid_grant for authorizationCode=secret-code access_token=secret-token') as Error & {
      status?: number;
      code?: string;
    };
    error.status = 400;
    error.code = 'invalid_grant';
    const handler = createLoginWithTossHandler({
      mTLSClient: {
        exchangeAuthorizationCode: jest.fn(async () => {
          throw error;
        }),
        fetchLoginProfile: jest.fn(),
        verifyIapOrder: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      logger,
    });

    const result = await handler(
      {
        authorizationCode: 'secret-code',
        referrer: 'DEFAULT',
        nonce: 'nonce-12345678',
      },
      { clientKey: 'client-secret-test' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.error?.details).toEqual({
      upstreamStatus: 400,
      upstreamCode: 'invalid_grant',
    });
    expect(JSON.stringify(result)).not.toContain('secret-code');
    expect(JSON.stringify(result)).not.toContain('secret-token');
    expect(JSON.stringify(logger.mock.calls)).not.toContain('secret-code');
    expect(JSON.stringify(logger.mock.calls)).not.toContain('secret-token');
  });

  test('does not create a Supabase bridge session when auth code exchange fails', async () => {
    const exchangeAuthorizationCode = jest.fn(async () => {
      const error = new Error('invalid_grant') as Error & { status?: number; code?: string };
      error.status = 400;
      error.code = 'invalid_grant';
      throw error;
    });
    const fetchLoginProfile = jest.fn();
    const bridgeSession = jest.fn();
    const handler = createLoginWithTossHandler({
      mTLSClient: {
        exchangeAuthorizationCode,
        fetchLoginProfile,
        verifyIapOrder: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      bridgeSession,
    });

    const result = await handler(
      {
        authorizationCode: 'expired-or-reused-code',
        referrer: 'SANDBOX',
        nonce: 'nonce-12345678',
      },
      { clientKey: 'client-bridge-block' }
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('AUTH_LOGIN_FAILED');
    expect(exchangeAuthorizationCode).toHaveBeenCalledWith('expired-or-reused-code', 'SANDBOX');
    expect(fetchLoginProfile).not.toHaveBeenCalled();
    expect(bridgeSession).not.toHaveBeenCalled();
  });

  test('throttles repeated invalid auth code attempts before calling Toss again', async () => {
    const exchangeAuthorizationCode = jest.fn(async () => {
      const error = new Error('invalid_grant') as Error & { status?: number; code?: string };
      error.status = 400;
      error.code = 'invalid_grant';
      throw error;
    });
    const handler = createLoginWithTossHandler({
      mTLSClient: {
        exchangeAuthorizationCode,
        fetchLoginProfile: jest.fn(),
        verifyIapOrder: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      now: () => new Date('2026-02-26T00:00:00.000Z'),
      bridgeSession: jest.fn(),
    });
    const request = {
      authorizationCode: 'reused-code',
      referrer: 'SANDBOX' as const,
      nonce: 'nonce-12345678',
    };
    const context = { clientKey: 'client-throttle-invalid-code' };

    for (let i = 0; i < 5; i += 1) {
      const result = await handler(request, context);
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_LOGIN_FAILED');
    }

    const throttled = await handler(request, context);

    expect(throttled.ok).toBe(false);
    expect(throttled.status).toBe(429);
    expect(throttled.error?.code).toBe('AUTH_THROTTLED');
    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(5);
  });

  test('rejects reuse of a previously consumed auth code before calling Toss again', async () => {
    const exchangeAuthorizationCode = jest.fn(async (authorizationCode: string) => ({
      accessToken: `access-${authorizationCode}`,
    }));
    const bridgeSession = jest.fn(async () => ({
      accessToken: 'test.mock.access',
      refreshToken: 'test.mock.refresh',
      userId: '11111111-1111-4111-8111-111111111111',
    }));
    const handler = createLoginWithTossHandler({
      mTLSClient: {
        exchangeAuthorizationCode,
        fetchLoginProfile: jest.fn(async (accessToken: string) => ({
          userKey: accessToken.replace('access-', 'toss_'),
          isNewUser: false,
        })),
        verifyIapOrder: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      now: () => new Date('2026-02-26T00:00:00.000Z'),
      bridgeSession,
    });
    const request = {
      authorizationCode: 'consumed-code',
      referrer: 'SANDBOX' as const,
      nonce: 'nonce-12345678',
    };

    const first = await handler(request, { clientKey: 'client-consumed-code' });
    const replay = await handler(request, { clientKey: 'client-consumed-code' });

    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(false);
    expect(replay.status).toBe(400);
    expect(replay.error?.code).toBe('AUTH_CODE_REUSED');
    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(bridgeSession).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(replay)).not.toContain('consumed-code');
  });

  test('rejects consumed auth code replay even when referrer changes', async () => {
    const exchangeAuthorizationCode = jest.fn(async (authorizationCode: string) => ({
      accessToken: `access-${authorizationCode}`,
    }));
    const bridgeSession = jest.fn(async () => ({
      accessToken: 'test.mock.access',
      refreshToken: 'test.mock.refresh',
      userId: '11111111-1111-4111-8111-111111111111',
    }));
    const handler = createLoginWithTossHandler({
      mTLSClient: {
        exchangeAuthorizationCode,
        fetchLoginProfile: jest.fn(async (accessToken: string) => ({
          userKey: accessToken.replace('access-', 'toss_'),
          isNewUser: false,
        })),
        verifyIapOrder: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      now: () => new Date('2026-02-26T00:00:00.000Z'),
      bridgeSession,
    });

    const first = await handler(
      {
        authorizationCode: 'cross-referrer-consumed-code',
        referrer: 'SANDBOX',
        nonce: 'nonce-12345678',
      },
      { clientKey: 'client-cross-referrer-consumed-code' }
    );
    const replay = await handler(
      {
        authorizationCode: 'cross-referrer-consumed-code',
        referrer: 'DEFAULT',
        nonce: 'nonce-12345678',
      },
      { clientKey: 'client-cross-referrer-consumed-code' }
    );

    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(false);
    expect(replay.status).toBe(400);
    expect(replay.error?.code).toBe('AUTH_CODE_REUSED');
    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(bridgeSession).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(replay)).not.toContain('cross-referrer-consumed-code');
  });

  test('marks auth code consumed immediately after Toss exchange succeeds even if bridge session fails', async () => {
    const exchangeAuthorizationCode = jest.fn(async (authorizationCode: string) => ({
      accessToken: `access-${authorizationCode}`,
    }));
    const fetchLoginProfile = jest.fn(async (accessToken: string) => ({
      userKey: accessToken.replace('access-', 'toss_'),
      isNewUser: false,
    }));
    const bridgeSession = jest.fn(async () => {
      throw Object.assign(new Error('bridge failed for secret authCode=bridge-fail-code'), {
        status: 500,
        code: 'SUPABASE_AUTH_TOKEN_FAILED',
      });
    });
    const handler = createLoginWithTossHandler({
      mTLSClient: {
        exchangeAuthorizationCode,
        fetchLoginProfile,
        verifyIapOrder: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      now: () => new Date('2026-02-26T00:00:00.000Z'),
      bridgeSession,
      logger: jest.fn(),
    });
    const request = {
      authorizationCode: 'bridge-fail-code',
      referrer: 'SANDBOX' as const,
      nonce: 'nonce-12345678',
    };

    const first = await handler(request, { clientKey: 'client-bridge-fail-code' });
    const replay = await handler(request, { clientKey: 'client-bridge-fail-code' });

    expect(first.ok).toBe(false);
    expect(first.error?.code).toBe('AUTH_LOGIN_FAILED');
    expect(replay.ok).toBe(false);
    expect(replay.status).toBe(400);
    expect(replay.error?.code).toBe('AUTH_CODE_REUSED');
    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(fetchLoginProfile).toHaveBeenCalledTimes(1);
    expect(bridgeSession).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(first)).not.toContain('bridge-fail-code');
    expect(JSON.stringify(replay)).not.toContain('bridge-fail-code');
  });

  test('rejects malformed Supabase bridge access tokens before returning a session', async () => {
    const exchangeAuthorizationCode = jest.fn(async (authorizationCode: string) => ({
      accessToken: `access-${authorizationCode}`,
    }));
    const fetchLoginProfile = jest.fn(async (accessToken: string) => ({
      userKey: accessToken.replace('access-', 'toss_'),
      isNewUser: false,
    }));
    const bridgeSession = jest.fn(async () => ({
      accessToken: 'not-a-jwt',
      refreshToken: 'plain-refresh-token',
      userId: '11111111-1111-4111-8111-111111111111',
    }));
    const handler = createLoginWithTossHandler({
      mTLSClient: {
        exchangeAuthorizationCode,
        fetchLoginProfile,
        verifyIapOrder: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      rateLimiter: new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 }),
      now: () => new Date('2026-02-26T00:00:00.000Z'),
      bridgeSession,
      logger: jest.fn(),
    });

    const result = await handler(
      {
        authorizationCode: 'malformed-bridge-token-code',
        referrer: 'SANDBOX',
        nonce: 'nonce-12345678',
      },
      { clientKey: 'client-malformed-bridge-token' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.error?.code).toBe('AUTH_LOGIN_FAILED');
    expect(result.error?.details).toEqual({
      upstreamStatus: 502,
      upstreamCode: 'SUPABASE_AUTH_TOKEN_INVALID',
    });
    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(fetchLoginProfile).toHaveBeenCalledTimes(1);
    expect(bridgeSession).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('not-a-jwt');
    expect(JSON.stringify(result)).not.toContain('plain-refresh-token');
  });
});
