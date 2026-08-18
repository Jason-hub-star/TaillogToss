import { createGrantTossPointsHandler } from '../grant-toss-points/index.ts';
import { InMemoryIdempotencyStore } from '../_shared/idempotency.ts';
import { InMemoryCircuitBreaker } from '../_shared/circuitBreaker.ts';
import { buildEdgeContext } from '../_shared/httpAdapter.ts';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createJwt(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('grant-toss-points handler', () => {
  function createDeps() {
    return {
      idempotency: new InMemoryIdempotencyStore(),
      breaker: new InMemoryCircuitBreaker({ failureThreshold: 5, openForMs: 30_000 }),
      usedGrantKeys: new Set<string>(),
      mTLSClient: {
        exchangeAuthorizationCode: jest.fn(),
        getLoginProfile: jest.fn(),
        getIAPOrderStatus: jest.fn(),
        sendSmartMessage: jest.fn(),
        getPointsGrantKey: jest.fn(async () => ({ grantKey: 'grant-key-1' })),
        executePointsGrant: jest.fn(async () => ({ executionId: 'execution-1' })),
        getPointsGrantResult: jest.fn(async () => ({
          status: 'COMPLETED',
          transactionId: 'tx-1',
        })),
      },
    };
  }

  test('grants points for service_role only', async () => {
    const handler = createGrantTossPointsHandler({ usedGrantKeys: new Set<string>() });

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-11111111-1111-4111-8111-111111111111',
      },
      { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' }
    );

    expect(result.ok).toBe(true);
    expect(result.data?.status).toBe('granted');
  });

  test.each([
    ['general user', 'user'],
    ['trainer', 'trainer'],
    ['org owner', 'org_owner'],
    ['org staff', 'org_staff'],
  ] as const)('rejects %s before requesting a grant key', async (_label, role) => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-22222222-2222-4222-8222-222222222222',
      },
      { clientKey: 'client-a', role }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(deps.mTLSClient.getPointsGrantKey).not.toHaveBeenCalled();
  });

  test('ignores x-user-role spoofing before requesting a grant key', async () => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);
    const token = createJwt({ role: 'authenticated', sub: 'user-1' });
    const request = new Request('https://example.com/functions/v1/grant-toss-points', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-user-role': 'trainer',
      },
    });
    const context = buildEdgeContext(request);

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-33333333-3333-4333-8333-333333333333',
      },
      context
    );

    expect(context.role).toBeUndefined();
    expect(context.userId).toBe('user-1');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(deps.mTLSClient.getPointsGrantKey).not.toHaveBeenCalled();
    expect(deps.mTLSClient.executePointsGrant).not.toHaveBeenCalled();
  });

  test('does not grant points when only user_metadata claims a staff role', async () => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);
    const token = createJwt({
      role: 'authenticated',
      sub: 'user-1',
      user_metadata: { role: 'trainer' },
    });
    const request = new Request('https://example.com/functions/v1/grant-toss-points', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const context = buildEdgeContext(request);

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-44444444-4444-4444-8444-444444444444',
      },
      context
    );

    expect(context.role).toBeUndefined();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(deps.mTLSClient.getPointsGrantKey).not.toHaveBeenCalled();
    expect(deps.mTLSClient.executePointsGrant).not.toHaveBeenCalled();
  });

  test('service_role may grant to the event target selected by the point drainer', async () => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);

    const result = await handler(
      {
        userId: '55555555-5555-4555-8555-555555555555',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-55555555-5555-4555-8555-555555555555',
      },
      { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' }
    );

    expect(result.ok).toBe(true);
    expect(deps.mTLSClient.executePointsGrant).toHaveBeenCalledWith({
      grantKey: 'grant-key-1',
      userId: '55555555-5555-4555-8555-555555555555',
      points: 100,
      reasonCode: 'referral_reward',
    });
  });

  test.each([
    [
      'non-uuid userId',
      {
        userId: 'attacker-user',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-99999999-9999-4999-8999-999999999999',
      },
    ],
    [
      'non-event idempotency key',
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'manual-grant-99999999-9999-4999-8999-999999999999',
      },
    ],
    [
      'unapproved reason code',
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'manual-grant',
        idempotencyKey: 'point-event-99999999-9999-4999-8999-999999999999',
      },
    ],
    [
      'ad reward reason code',
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'ad_reward',
        idempotencyKey: 'point-event-99999999-9999-4999-8999-999999999999',
      },
    ],
  ])('rejects %s before requesting a grant key', async (_label, request) => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);

    const result = await handler(request, {
      clientKey: 'client-a',
      role: 'service_role',
      userId: 'service-worker',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(deps.mTLSClient.getPointsGrantKey).not.toHaveBeenCalled();
    expect(deps.mTLSClient.executePointsGrant).not.toHaveBeenCalled();
  });

  test('replays completed idempotency responses without a second Toss grant', async () => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);
    const request = {
      userId: '11111111-1111-4111-8111-111111111111',
      points: 100,
      reasonCode: 'referral_reward',
      idempotencyKey: 'point-event-66666666-6666-4666-8666-666666666666',
    };

    const first = await handler(request, { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' });
    const second = await handler(request, { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.data).toEqual(first.data);
    expect(deps.mTLSClient.getPointsGrantKey).toHaveBeenCalledTimes(1);
    expect(deps.mTLSClient.executePointsGrant).toHaveBeenCalledTimes(1);
  });

  test('rejects same idempotency key when the point grant target changes', async () => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);
    const request = {
      userId: '11111111-1111-4111-8111-111111111111',
      points: 100,
      reasonCode: 'referral_reward',
      idempotencyKey: 'point-event-66666666-6666-4666-8666-666666666666',
    };

    const first = await handler(request, { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' });
    const second = await handler(
      {
        ...request,
        userId: '22222222-2222-4222-8222-222222222222',
      },
      { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' }
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.status).toBe(409);
    expect(second.error?.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect(deps.mTLSClient.getPointsGrantKey).toHaveBeenCalledTimes(1);
    expect(deps.mTLSClient.executePointsGrant).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['point amount changes', { points: 500 }],
    ['approved reason code changes', { reasonCode: 'first_coaching_bonus' }],
  ])('rejects same idempotency key when the %s', async (_label, patch) => {
    const deps = createDeps();
    const handler = createGrantTossPointsHandler(deps);
    const request = {
      userId: '11111111-1111-4111-8111-111111111111',
      points: 100,
      reasonCode: 'referral_reward',
      idempotencyKey: 'point-event-11111111-2222-4222-8222-333333333333',
    };

    const first = await handler(request, { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' });
    const second = await handler(
      {
        ...request,
        ...patch,
      },
      { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' }
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.status).toBe(409);
    expect(second.error?.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect(deps.mTLSClient.getPointsGrantKey).toHaveBeenCalledTimes(1);
    expect(deps.mTLSClient.executePointsGrant).toHaveBeenCalledTimes(1);
  });

  test('prevents reusing a Toss grant key for a different idempotency key', async () => {
    const deps = createDeps();
    deps.usedGrantKeys.add('grant-key-1');
    const handler = createGrantTossPointsHandler(deps);

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-77777777-7777-4777-8777-777777777777',
      },
      { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' }
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TOSS_4109');
    expect(deps.mTLSClient.executePointsGrant).not.toHaveBeenCalled();
  });

  test('maps toss error codes on failure', async () => {
    const deps = createDeps();
    deps.mTLSClient.getPointsGrantResult = jest.fn(async () => ({
      status: 'FAILED',
      transactionId: 'tx-failed',
      errorCode: '4109',
    }));
    const handler = createGrantTossPointsHandler(deps);

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        points: 100,
        reasonCode: 'referral_reward',
        idempotencyKey: 'point-event-88888888-8888-4888-8888-888888888888',
      },
      { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' }
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TOSS_4109');
  });
});
