/**
 * iap.test.ts — IAP 래퍼 테스트 (verifyAndGrant, recoverPendingOrders, B2B 확장)
 * Parity: IAP-001, B2B-001
 */

const mockInvoke = jest.fn();
const mockFrom = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockGetUser = jest.fn();
const mockCreateOneTimePurchaseOrder = jest.fn(() => jest.fn());
const mockCompleteProductGrant = jest.fn();
const mockGetPendingOrders = jest.fn();
const mockStorageGetItem = jest.fn();
const mockStorageSetItem = jest.fn();

jest.mock('@apps-in-toss/native-modules', () => ({
  IAP: {
    createOneTimePurchaseOrder: (...args: unknown[]) => mockCreateOneTimePurchaseOrder.apply(null, args),
    completeProductGrant: (...args: unknown[]) => mockCompleteProductGrant.apply(null, args),
    getPendingOrders: (...args: unknown[]) => mockGetPendingOrders.apply(null, args),
  },
}));

jest.mock('@apps-in-toss/framework', () => ({
  Storage: {
    getItem: (...args: unknown[]) => mockStorageGetItem(...args),
    setItem: (...args: unknown[]) => mockStorageSetItem(...args),
  },
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

import { verifyAndGrant, recoverPendingOrders, createOneTimePurchaseOrder } from '../iap';

beforeEach(() => {
  jest.clearAllMocks();
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
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await verifyAndGrant(receipt, { orgId: 'org-1', trainerUserId: 'trainer-1' });

    expect(mockInvoke).toHaveBeenCalledWith(
      'verify-iap-order',
      expect.objectContaining({
        body: expect.objectContaining({
          orgId: 'org-1',
          trainerUserId: 'trainer-1',
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
    const pendingQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            toss_order_id: 'ord_a',
            product_id: 'ait.0000020829.09e69bf9.90a91624b0.7443236299',
            id: 'id_a',
          },
          {
            toss_order_id: 'ord_b',
            product_id: 'ait.0000020829.b0b00d71.17c5290dc1.7444362301',
            id: 'id_b',
          },
          {
            toss_order_id: 'ord_c',
            product_id: 'ait.0000020829.32dc32cf.49e67a4cfa.7443541064',
            id: 'id_c',
          },
        ],
        error: null,
      }),
    };
    const staleLookupChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom
      .mockReturnValueOnce(pendingQueryChain)
      .mockReturnValueOnce(staleLookupChain)
      .mockReturnValueOnce(staleLookupChain)
      .mockReturnValueOnce(staleLookupChain);

    // 1번째, 3번째 성공 / 2번째 실패
    mockInvoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('fail') })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    const recovered = await recoverPendingOrders('user-1');
    expect(recovered).toBe(2);
  });

  it('빈 목록 시 0 반환', async () => {
    const chainMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chainMock);

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
    const terminalRecordChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            product_id: 'ait.0000020829.b0b00d71.17c5290dc1.7444362301',
            grant_status: 'grant_failed',
            toss_status: 'NOT_FOUND',
          },
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(terminalRecordChain);

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

describe('createOneTimePurchaseOrder', () => {
  it('processProductGrant=false면 SDK 최종 이벤트 없이도 GRANT_FAILED로 처리', async () => {
    const onEvent = jest.fn();
    const processProductGrant = jest.fn().mockResolvedValue(false);

    createOneTimePurchaseOrder({
      sku: 'ai_token_10',
      processProductGrant,
      onEvent,
    });

    const options = (mockCreateOneTimePurchaseOrder.mock.calls as any)[0][0];
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

    const options = (mockCreateOneTimePurchaseOrder.mock.calls as any)[0][0];
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

    const options = (mockCreateOneTimePurchaseOrder.mock.calls as any)[0][0];
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

    const options = (mockCreateOneTimePurchaseOrder.mock.calls as any)[0][0];
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
