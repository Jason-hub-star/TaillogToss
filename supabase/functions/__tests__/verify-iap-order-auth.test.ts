import { isTrustedServiceRoleToken } from '../verify-iap-order/auth.ts';
import {
  buildExistingTossOrderLookupFilter,
  finalizeGrantStateAfterActivation,
  isIapReplayCompatible,
  resolveIapRequestUserId,
  validateGrantedReplayEntitlement,
  type TossOrderPersistedRow,
} from '../verify-iap-order/main.ts';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createUnsignedJwt(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  return `${header}.${body}.forged-signature`;
}

describe('verify-iap-order service role auth', () => {
  test('does not trust an unsigned role=service_role payload', () => {
    const forgedToken = createUnsignedJwt({ role: 'service_role' });

    expect(isTrustedServiceRoleToken(forgedToken, 'real-service-role-key')).toBe(false);
  });

  test('accepts only the configured service role key', () => {
    expect(isTrustedServiceRoleToken('real-service-role-key', 'real-service-role-key')).toBe(true);
  });
});

describe('verify-iap-order idempotency binding', () => {
  const existing: TossOrderPersistedRow = {
    id: 'order-row-1',
    user_id: 'user-1',
    product_id: 'pro-monthly',
    idempotency_key: 'idem-order-1',
    toss_status: 'PAYMENT_COMPLETED',
    grant_status: 'granted',
    amount: 7900,
    toss_order_id: 'toss-order-1',
    org_id: null,
    trainer_user_id: null,
    error_code: null,
    retry_count: 0,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };

  test('accepts an exact replay of the same user/product/order binding', () => {
    expect(
      isIapReplayCompatible(
        existing,
        {
          orderId: 'toss-order-1',
          productId: 'pro-monthly',
          idempotencyKey: 'idem-order-1',
        },
        'user-1',
      ),
    ).toBe(true);
  });

  test('rejects reuse of an idempotency key for another user', () => {
    expect(
      isIapReplayCompatible(
        existing,
        {
          orderId: 'toss-order-1',
          productId: 'pro-monthly',
          idempotencyKey: 'idem-order-1',
        },
        'user-2',
      ),
    ).toBe(false);
  });

  test('rejects reuse of an idempotency key for another product or order', () => {
    expect(
      isIapReplayCompatible(
        existing,
        {
          orderId: 'toss-order-1',
          productId: 'token-30',
          idempotencyKey: 'idem-order-1',
        },
        'user-1',
      ),
    ).toBe(false);

    expect(
      isIapReplayCompatible(
        existing,
        {
          orderId: 'toss-order-2',
          productId: 'pro-monthly',
          idempotencyKey: 'idem-order-1',
        },
        'user-1',
      ),
    ).toBe(false);
  });

  test('looks up both idempotency key and Toss order id before any grant side effects', () => {
    const filter = buildExistingTossOrderLookupFilter('idem order/1', 'toss order/1');

    expect(filter).toContain('idempotency_key.eq.idem%20order%2F1');
    expect(filter).toContain('toss_order_id.eq.toss%20order%2F1');
  });

  test('rejects replay of the same Toss order id with a different idempotency key', () => {
    expect(
      isIapReplayCompatible(
        existing,
        {
          orderId: 'toss-order-1',
          productId: 'pro-monthly',
          idempotencyKey: 'idem-order-2',
        },
        'user-1',
      ),
    ).toBe(false);
  });

  test('binds B2B idempotency replays to the original org/trainer scope', () => {
    const orgOrder = { ...existing, org_id: 'org-1' };

    expect(
      isIapReplayCompatible(
        orgOrder,
        {
          orderId: 'toss-order-1',
          productId: 'pro-monthly',
          idempotencyKey: 'idem-order-1',
          orgId: 'org-1',
        },
        'user-1',
      ),
    ).toBe(true);

    expect(
      isIapReplayCompatible(
        orgOrder,
        {
          orderId: 'toss-order-1',
          productId: 'pro-monthly',
          idempotencyKey: 'idem-order-1',
          orgId: 'org-2',
        },
        'user-1',
      ),
    ).toBe(false);
  });

  test('does not replay a granted order without verifying the entitlement ledger', async () => {
    const result = await validateGrantedReplayEntitlement(existing);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error?.code).toBe('SUPABASE_CONFIG_MISSING');
  });

  test('skips entitlement ledger checks for non-granted replay states', async () => {
    const result = await validateGrantedReplayEntitlement({
      ...existing,
      grant_status: 'grant_failed',
    });

    expect(result.ok).toBe(true);
  });
});

describe('verify-iap-order user id binding', () => {
  const verifiedUserId = '11111111-1111-4111-8111-111111111111';
  const attackerUserId = '22222222-2222-4222-8222-222222222222';

  test('non-service callers ignore body.userId and use the internally verified auth user id', () => {
    const result = resolveIapRequestUserId({
      isServiceRole: false,
      bodyUserId: attackerUserId,
      authUserId: verifiedUserId,
    });

    expect(result.ok).toBe(true);
    expect(result.data?.userId).toBe(verifiedUserId);
  });

  test('service role callers must provide the FastAPI-verified body.userId', () => {
    const missing = resolveIapRequestUserId({
      isServiceRole: true,
      authUserId: undefined,
    });

    expect(missing.ok).toBe(false);
    expect(missing.status).toBe(400);
    expect(missing.error?.code).toBe('VALIDATION_ERROR');

    const result = resolveIapRequestUserId({
      isServiceRole: true,
      bodyUserId: verifiedUserId,
      authUserId: undefined,
    });

    expect(result.ok).toBe(true);
    expect(result.data?.userId).toBe(verifiedUserId);
  });

  test('service role callers must provide a UUID userId', () => {
    const result = resolveIapRequestUserId({
      isServiceRole: true,
      bodyUserId: 'backend-verified-user-id',
      authUserId: undefined,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  test('non-service callers without a verified auth user id fail closed', () => {
    const result = resolveIapRequestUserId({
      isServiceRole: false,
      bodyUserId: attackerUserId,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error?.code).toBe('AUTH_UNAUTHORIZED');
  });
});

describe('verify-iap-order grant finalization', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const proProductId = 'ait.0000020829.09e69bf9.90a91624b0.7443236299';
  const tokenProductId = 'ait.0000020829.32dc32cf.49e67a4cfa.7443541064';

  test('marks B2C subscription activation failures as grant_failed before order persistence', async () => {
    const result = await finalizeGrantStateAfterActivation({
      grantStatus: 'granted',
      errorCode: null,
      userId,
      productId: proProductId,
      body: {
        orderId: 'order-pro',
        productId: proProductId,
        transactionId: 'tx-pro',
        idempotencyKey: 'idem-pro',
      },
      tossOrderId: 'toss-order-pro',
      hasB2BGrant: false,
      activateSubscriptionFn: async () => {
        throw new Error('subscription write failed');
      },
    });

    expect(result).toEqual({
      grantStatus: 'grant_failed',
      errorCode: 'SUBSCRIPTION_ACTIVATION_FAILED',
    });
  });

  test('does not run B2B activation after B2C activation already failed closed', async () => {
    const activateOrgSubscriptionFn = jest.fn();

    const result = await finalizeGrantStateAfterActivation({
      grantStatus: 'granted',
      errorCode: null,
      userId,
      productId: proProductId,
      body: {
        orderId: 'order-pro',
        productId: proProductId,
        transactionId: 'tx-pro',
        idempotencyKey: 'idem-pro',
      },
      tossOrderId: 'toss-order-pro',
      hasB2BGrant: true,
      activateSubscriptionFn: async () => {
        throw new Error('subscription write failed');
      },
      activateOrgSubscriptionFn,
    });

    expect(result.grantStatus).toBe('grant_failed');
    expect(result.errorCode).toBe('SUBSCRIPTION_ACTIVATION_FAILED');
    expect(activateOrgSubscriptionFn).not.toHaveBeenCalled();
  });

  test('marks B2C token activation failures as grant_failed before order persistence', async () => {
    const result = await finalizeGrantStateAfterActivation({
      grantStatus: 'granted',
      errorCode: null,
      userId,
      productId: tokenProductId,
      body: {
        orderId: 'order-token',
        productId: tokenProductId,
        transactionId: 'tx-token',
        idempotencyKey: 'idem-token',
      },
      tossOrderId: 'toss-order-token',
      hasB2BGrant: false,
      activateSubscriptionFn: async () => {
        throw new Error('token increment failed');
      },
    });

    expect(result).toEqual({
      grantStatus: 'grant_failed',
      errorCode: 'SUBSCRIPTION_ACTIVATION_FAILED',
    });
  });

  test('marks B2B subscription activation failures as grant_failed before order persistence', async () => {
    const result = await finalizeGrantStateAfterActivation({
      grantStatus: 'granted',
      errorCode: null,
      userId,
      productId: 'center_basic',
      body: {
        orderId: 'order-b2b',
        productId: 'center_basic',
        transactionId: 'tx-b2b',
        idempotencyKey: 'idem-b2b',
        orgId: '22222222-2222-4222-8222-222222222222',
      },
      tossOrderId: 'toss-order-b2b',
      hasB2BGrant: true,
      activateOrgSubscriptionFn: async () => {
        throw new Error('org subscription write failed');
      },
    });

    expect(result).toEqual({
      grantStatus: 'grant_failed',
      errorCode: 'ORG_SUBSCRIPTION_ACTIVATION_FAILED',
    });
  });

  test('marks unknown granted products as grant_failed before order persistence', async () => {
    const result = await finalizeGrantStateAfterActivation({
      grantStatus: 'granted',
      errorCode: null,
      userId,
      productId: 'unknown-product',
      body: {
        orderId: 'order-unknown',
        productId: 'unknown-product',
        transactionId: 'tx-unknown',
        idempotencyKey: 'idem-unknown',
      },
      tossOrderId: 'toss-order-unknown',
      hasB2BGrant: false,
    });

    expect(result).toEqual({
      grantStatus: 'grant_failed',
      errorCode: 'IAP_PRODUCT_GRANT_UNKNOWN',
    });
  });
});
