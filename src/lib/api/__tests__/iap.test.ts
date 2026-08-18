/**
 * iap.test.ts — IAP 래퍼 테스트 (verifyAndGrant, recoverPendingOrders, B2B 확장)
 * Parity: IAP-001, B2B-001
 */

const mockInvoke = jest.fn();
const mockFrom = jest.fn();
const mockRequestBackend = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockGetUser = jest.fn();
/** createOneTimePurchaseOrder 에 실제로 넘어가는 인자 모양 (SDK 계약) */
type CreateOrderArg = {
  options: { processProductGrant: (p: { orderId: string }) => Promise<unknown> };
  onEvent: (e: { type: string; result?: { orderId: string } }) => void;
};
const mockCreateOneTimePurchaseOrder = jest.fn((_arg: CreateOrderArg) => jest.fn());

/** 첫 호출 인자를 꺼낸다. 미호출이면 undefined 크래시 대신 명시적으로 실패시킨다. */
function firstOrderArg(): CreateOrderArg {
  const call = mockCreateOneTimePurchaseOrder.mock.calls[0];
  if (!call) throw new Error('createOneTimePurchaseOrder 가 호출되지 않았다');
  return call[0];
}
const mockCompleteProductGrant = jest.fn();
const mockGetPendingOrders = jest.fn();
const mockStorageGetItem = jest.fn();
const mockStorageSetItem = jest.fn();

jest.mock('@apps-in-toss/native-modules', () => ({
  IAP: {
    createOneTimePurchaseOrder: (...args: Parameters<typeof mockCreateOneTimePurchaseOrder>) => mockCreateOneTimePurchaseOrder(...args),
    completeProductGrant: (...args: Parameters<typeof mockCompleteProductGrant>) => mockCompleteProductGrant(...args),
    getPendingOrders: (...args: Parameters<typeof mockGetPendingOrders>) => mockGetPendingOrders(...args),
  },
}));

jest.mock('@apps-in-toss/framework', () => ({
  Storage: {
    getItem: (...args: unknown[]) => mockStorageGetItem(...args),
    setItem: (...args: unknown[]) => mockStorageSetItem(...args),
  },
}));

jest.mock('../backend', () => ({
  requestBackend: (...args: unknown[]) => mockRequestBackend(...args),
}));

jest.mock('lib/api/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
  getSupabasePublicConfig: () => ({
    url: 'https://test-project.supabase.co',
    anonKey: 'test-anon-key',
  }),
}));

import {
  verifyAndGrant,
  recoverPendingOrders,
  recoverPendingOrdersB2B,
  createOneTimePurchaseOrder,
} from '../iap';

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestBackend.mockResolvedValue([]);
  mockCreateOneTimePurchaseOrder.mockReturnValue(jest.fn());
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'eyJ.base.session' } },
    error: null,
  });
  mockRefreshSession.mockResolvedValue({
    data: { session: { access_token: 'eyJ.base.refreshed' } },
    error: null,
  });
  mockGetPendingOrders.mockResolvedValue(undefined);
  mockStorageGetItem.mockResolvedValue(null);
  mockStorageSetItem.mockResolvedValue(undefined);
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
});

describe('verifyAndGrant', () => {
  const receipt = { orderId: 'ord_1', productId: 'pro_monthly', transactionId: 'tx_1' };

  it('성공 시 true 반환', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    const result = await verifyAndGrant(receipt);
    expect(result).toBe(true);
  });

  it('Edge Function 에러 시 false 반환', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('fail') });
    const result = await verifyAndGrant(receipt);
    expect(result).toBe(false);
  });

  it('첫 호출 401이면 refresh 후 1회 재시도', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        data: null,
        error: { context: { status: 401 } },
      })
      .mockResolvedValueOnce({
        data: { data: { grant_status: 'granted' } },
        error: null,
      });

    const result = await verifyAndGrant(receipt);
    expect(result).toBe(true);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it('세션 토큰이 없으면 invoke 전 refresh로 토큰 확보', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'eyJ.from.refresh' } },
      error: null,
    });
    mockInvoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

    const result = await verifyAndGrant(receipt);
    expect(result).toBe(true);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith(
      'verify-iap-order',
      expect.objectContaining({
        headers: { Authorization: 'Bearer eyJ.from.refresh' },
      }),
    );
  });

  it('refresh 후에도 JWT가 아니면 호출하지 않고 false 반환', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'sb_publishable_not_jwt' } },
      error: null,
    });

    const result = await verifyAndGrant(receipt);
    expect(result).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('JWT 형식이어도 getUser 검증 실패면 호출하지 않고 false 반환', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'eyJ.invalid.token' } },
      error: null,
    });
    mockGetUser
      .mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') })
      .mockResolvedValueOnce({ data: { user: null }, error: new Error('Invalid JWT') });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'eyJ.refreshed.token' } },
      error: null,
    });

    const result = await verifyAndGrant(receipt);
    expect(result).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('grant_status=granted 시 true 반환', async () => {
    mockInvoke.mockResolvedValue({ data: { grant_status: 'granted' }, error: null });
    const result = await verifyAndGrant(receipt);
    expect(result).toBe(true);
  });

  it('Edge envelope에서 grant_status=grant_failed 시 false 반환', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        status: 200,
        data: { grant_status: 'grant_failed', toss_status: 'FAILED' },
      },
      error: null,
    });
    const result = await verifyAndGrant(receipt);
    expect(result).toBe(false);
  });

  it('B2B context 포함 시 body에 orgId/trainerUserId 전달', async () => {
    mockRequestBackend.mockResolvedValueOnce({ data: { grant_status: 'granted' } });
    await verifyAndGrant(receipt, { orgId: 'org-1' });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/subscription/iap/verify',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          orgId: 'org-1',
        }),
      }),
    );
  });

  it('B2B context 없이 호출 시 orgId 키 미포함', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await verifyAndGrant(receipt);

    const body = mockInvoke.mock.calls[0]?.[1]?.body;
    expect(body).not.toHaveProperty('orgId');
    expect(body).not.toHaveProperty('trainerUserId');
  });
});

describe('recoverPendingOrders', () => {
  it('부분 복구: 3건 중 2건 성공 시 2 반환', async () => {
    mockRequestBackend
      .mockResolvedValueOnce([
        {
          order_id: 'ord_a',
          product_id: 'ait.0000020829.09e69bf9.90a91624b0.7443236299',
          transaction_id: 'ord_a',
        },
        {
          order_id: 'ord_b',
          product_id: 'ait.0000020829.b0b00d71.17c5290dc1.7444362301',
          transaction_id: 'ord_b',
        },
        {
          order_id: 'ord_c',
          product_id: 'ait.0000020829.32dc32cf.49e67a4cfa.7443541064',
          transaction_id: 'ord_c',
        },
      ])
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    // 1번째, 3번째 성공 / 2번째 실패
    mockInvoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('fail') })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    const recovered = await recoverPendingOrders('user-1');
    expect(recovered).toBe(2);
  });

  it('빈 목록 시 0 반환', async () => {
    mockRequestBackend.mockResolvedValueOnce([]);

    const recovered = await recoverPendingOrders('user-1');
    expect(recovered).toBe(0);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('알 수 없는 legacy product pending order는 재검증 없이 SDK pending에서 정리', async () => {
    mockGetPendingOrders.mockResolvedValue({
      orders: [{ orderId: 'legacy_ord', sku: 'sku_106' }],
    });

    const recovered = await recoverPendingOrders('user-1');

    expect(recovered).toBe(0);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockCompleteProductGrant).toHaveBeenCalledWith({
      params: { orderId: 'legacy_ord' },
    });
  });

  it('이미 terminal failure로 기록된 known product pending order는 재검증 없이 정리', async () => {
    mockGetPendingOrders.mockResolvedValue({
      orders: [{ orderId: 'known_failed_ord', sku: 'ait.0000020829.b0b00d71.17c5290dc1.7444362301' }],
    });
    mockRequestBackend.mockResolvedValueOnce({
      product_id: 'ait.0000020829.b0b00d71.17c5290dc1.7444362301',
      grant_status: 'grant_failed',
      toss_status: 'NOT_FOUND',
      terminal_reason: 'grant_failed:NOT_FOUND',
    });

    const recovered = await recoverPendingOrders('user-1');

    expect(recovered).toBe(0);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockCompleteProductGrant).toHaveBeenCalledWith({
      params: { orderId: 'known_failed_ord' },
    });
  });

  it('이미 suppression marker가 있으면 stale pending order를 다시 정리 시도하지 않음', async () => {
    mockGetPendingOrders.mockResolvedValue({
      orders: [{ orderId: 'legacy_ord', sku: 'sku_106' }],
    });
    mockStorageGetItem.mockResolvedValueOnce(
      JSON.stringify({ 'legacy_ord:sku_106': 'unknown_product' })
    );

    const recovered = await recoverPendingOrders('user-1');

    expect(recovered).toBe(0);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockCompleteProductGrant).not.toHaveBeenCalled();
  });
});

describe('recoverPendingOrdersB2B', () => {
  it('B2B pending 복구는 backend-scoped 조회와 proxy 검증만 사용한다', async () => {
    mockRequestBackend
      .mockResolvedValueOnce([
        { order_id: 'ord-b2b', product_id: 'center_basic', transaction_id: 'ord-b2b' },
      ])
      .mockResolvedValueOnce({ data: { grant_status: 'granted' } });

    const recovered = await recoverPendingOrdersB2B('org-1', undefined);

    expect(recovered).toBe(1);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockRequestBackend).toHaveBeenNthCalledWith(
      1,
      '/api/v1/subscription/orders/pending/b2b?org_id=org-1',
    );
    expect(mockRequestBackend).toHaveBeenNthCalledWith(
      2,
      '/api/v1/subscription/iap/verify',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ orgId: 'org-1' }),
      }),
    );
  });
});

describe('createOneTimePurchaseOrder', () => {
  it('processProductGrant=false면 SDK 최종 이벤트 없이도 GRANT_FAILED로 처리', async () => {
    const onEvent = jest.fn();
    const processProductGrant = jest.fn().mockResolvedValue(false);

    createOneTimePurchaseOrder({
      sku: 'ai_token_10',
      processProductGrant,
      onEvent,
    });

    const options = firstOrderArg();
    await options.options.processProductGrant({ orderId: 'ord_failed' });

    expect(onEvent).toHaveBeenCalledWith({ type: 'PURCHASE_STARTED' });
    expect(onEvent).toHaveBeenCalledWith({ type: 'GRANT_FAILED' });
    expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GRANT_COMPLETED' }));
    expect(mockCompleteProductGrant).not.toHaveBeenCalled();
  });

  it('processProductGrant=false 뒤 SDK onEvent가 와도 GRANT_FAILED를 중복 방출하지 않음', async () => {
    const onEvent = jest.fn();
    const processProductGrant = jest.fn().mockResolvedValue(false);

    createOneTimePurchaseOrder({
      sku: 'ai_token_10',
      processProductGrant,
      onEvent,
    });

    const options = firstOrderArg();
    await options.options.processProductGrant({ orderId: 'ord_failed' });
    options.onEvent({ type: 'completed' });

    expect(onEvent.mock.calls.filter(([event]) => event.type === 'GRANT_FAILED')).toHaveLength(1);
  });

  it('processProductGrant=true일 때만 completeProductGrant 후 GRANT_COMPLETED 처리', async () => {
    const onEvent = jest.fn();
    const processProductGrant = jest.fn().mockResolvedValue(true);

    createOneTimePurchaseOrder({
      sku: 'ai_token_10',
      processProductGrant,
      onEvent,
    });

    const options = firstOrderArg();
    await options.options.processProductGrant({ orderId: 'ord_granted' });
    options.onEvent({ type: 'completed', result: { orderId: 'ord_granted' } });

    expect(mockCompleteProductGrant).toHaveBeenCalledWith({ params: { orderId: 'ord_granted' } });
    expect(onEvent).toHaveBeenCalledWith({
      type: 'GRANT_COMPLETED',
      result: undefined,
    });
  });

  it('SDK 결제 이벤트가 grant 승인보다 먼저 와도 실패로 처리하지 않음', async () => {
    const onEvent = jest.fn();
    let resolveGrant: (value: boolean) => void = () => undefined;
    const processProductGrant = jest.fn().mockImplementation(
      () => new Promise<boolean>((resolve) => {
        resolveGrant = resolve;
      }),
    );

    createOneTimePurchaseOrder({
      sku: 'ai_token_10',
      processProductGrant,
      onEvent,
    });

    const options = firstOrderArg();
    const grantPromise = options.options.processProductGrant({ orderId: 'ord_granted' });
    options.onEvent({ type: 'PAYMENT_COMPLETED', result: { orderId: 'ord_granted' } });

    expect(onEvent).not.toHaveBeenCalledWith({ type: 'GRANT_FAILED' });

    resolveGrant(true);
    await grantPromise;

    expect(mockCompleteProductGrant).toHaveBeenCalledWith({ params: { orderId: 'ord_granted' } });
    expect(onEvent).toHaveBeenCalledWith({
      type: 'GRANT_COMPLETED',
      result: { orderId: 'ord_granted' },
    });
  });

  it('cleanup 호출 시 이후 onEvent 미호출', async () => {
    const onEvent = jest.fn();
    const processProductGrant = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 100)),
    );

    jest.useFakeTimers();
    const cleanup = createOneTimePurchaseOrder({
      sku: 'pro_monthly',
      processProductGrant,
      onEvent,
    });

    // PURCHASE_STARTED는 즉시 발생
    await Promise.resolve();
    expect(onEvent).toHaveBeenCalledWith({ type: 'PURCHASE_STARTED' });

    // cleanup 호출 → 이후 이벤트 차단
    cleanup();
    jest.advanceTimersByTime(200);
    await Promise.resolve();
    await Promise.resolve();

    // GRANT_COMPLETED는 발생하지 않아야 함
    expect(onEvent).not.toHaveBeenCalledWith({ type: 'GRANT_COMPLETED' });
    jest.useRealTimers();
  });
});
