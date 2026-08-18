/**
 * subscription.test.ts — subscription API security boundary tests
 * Parity: IAP-001, AUTH-001
 */

const mockRequestBackend = jest.fn();
const mockFrom = jest.fn();
const mockInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockGetUser = jest.fn();

jest.mock('lib/api/backend', () => ({
  requestBackend: (...args: unknown[]) => mockRequestBackend(...args),
}));

jest.mock('lib/api/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
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

jest.mock('../iap', () => ({
  recoverPendingOrders: jest.fn().mockResolvedValue(0),
}));

import { getOrders, getSubscription } from '../subscription';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getSubscription', () => {
  it('백엔드 전용으로 현재 사용자 구독을 조회한다', async () => {
    mockRequestBackend.mockResolvedValue({
      id: 'sub-1',
      user_id: 'user-from-token',
      plan_type: 'PRO_MONTHLY',
      is_active: true,
      ai_tokens_remaining: 10,
      ai_tokens_total: 10,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    });

    const result = await getSubscription('attacker-controlled-user-id');

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/subscription/');
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result?.effective_is_pro).toBe(true);
  });

  it('백엔드 실패 시 subscriptions Supabase fallback을 사용하지 않는다', async () => {
    mockRequestBackend.mockRejectedValue({ status: 401 });

    await expect(getSubscription('other-user')).rejects.toEqual(
      expect.objectContaining({ status: 401 }),
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('getOrders', () => {
  it('백엔드 전용으로 현재 사용자 주문 이력을 조회한다', async () => {
    mockRequestBackend.mockResolvedValue([
      {
        id: 'order-1',
        product_id: 'pro_monthly',
        toss_status: 'PAYMENT_COMPLETED',
        grant_status: 'granted',
        amount: 10000,
        created_at: '2026-06-01T00:00:00Z',
      },
    ]);

    const result = await getOrders('attacker-controlled-user-id');

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/subscription/orders');
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.product_id).toBe('pro_monthly');
  });

  it('백엔드 실패 시 toss_orders Supabase fallback을 사용하지 않는다', async () => {
    mockRequestBackend.mockRejectedValue({ status: 403 });

    await expect(getOrders('other-user')).rejects.toEqual(
      expect.objectContaining({ status: 403 }),
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
