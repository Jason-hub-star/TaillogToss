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
        authorizationCode: 'valid-code',
        referrer: 'SANDBOX',
        nonce: 'nonce-12345678',
        flow: 'B2C',
      },
      { clientKey: 'client-a' }
    );

    expect(result.ok).toBe(true);
    expect(result.data?.user.toss_user_key).toBe('toss_valid-code');
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
        authorizationCode: 'valid-code',
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
});
