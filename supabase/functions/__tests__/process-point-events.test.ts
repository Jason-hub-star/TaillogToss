import { createProcessPointEventsHandler } from '../process-point-events/index.ts';

function createSupabaseMock(events: Array<{
  id: string;
  user_id: string;
  event_type: string;
  source_id: string | null;
  points: number;
  reason_code: string;
}> = [], opts: { claimResult?: boolean } = {}) {
  const claimResult = opts.claimResult ?? true;
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const limitMock = jest.fn(async () => ({ data: events, error: null }));

  return {
    inserts,
    updates,
    limitMock,
    client: {
      from: jest.fn((table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: limitMock,
            })),
          })),
        })),
        update: jest.fn((values: Record<string, unknown>) => ({
          eq: jest.fn(async () => {
            updates.push({ table, ...values });
            return { error: null };
          }),
        })),
        insert: jest.fn(async (values: Record<string, unknown>) => {
          inserts.push({ table, ...values });
          return { error: null };
        }),
      })),
      rpc: jest.fn(async (fn: string) => {
        if (fn === 'claim_point_event') return { data: claimResult, error: null };
        return { data: 0, error: null };
      }),
    },
  };
}

describe('process-point-events handler', () => {
  test('rejects non-service roles before polling the queue', async () => {
    const supabase = createSupabaseMock();
    const grantClient = { grantPoints: jest.fn() };
    const handler = createProcessPointEventsHandler({ supabase: supabase.client, grantClient });

    const result = await handler({ batchSize: 1 }, { clientKey: 'test', role: 'org_owner' });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(supabase.client.rpc).not.toHaveBeenCalled();
    expect(grantClient.grantPoints).not.toHaveBeenCalled();
  });

  test('uses event idempotency keys when granting points', async () => {
    const supabase = createSupabaseMock([
      {
        id: '11111111-1111-4111-8111-111111111111',
        user_id: '22222222-2222-4222-8222-222222222222',
        event_type: 'referral_granted',
        source_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        points: 100,
        reason_code: 'referral_reward',
      },
    ]);
    const grantClient = {
      grantPoints: jest.fn(async () => ({ ok: true, transactionId: 'tx-1' })),
    };
    const handler = createProcessPointEventsHandler({ supabase: supabase.client, grantClient });

    const result = await handler({ batchSize: 1 }, { clientKey: 'test', role: 'service_role' });

    expect(result.ok).toBe(true);
    expect(grantClient.grantPoints).toHaveBeenCalledWith({
      userId: '22222222-2222-4222-8222-222222222222',
      points: 100,
      reasonCode: 'referral_reward',
      idempotencyKey: 'point-event-11111111-1111-4111-8111-111111111111',
    });
    expect(supabase.inserts).toEqual([
      expect.objectContaining({
        table: 'point_transactions',
        point_event_id: '11111111-1111-4111-8111-111111111111',
        status: 'granted',
      }),
    ]);
    // SEC-2: 지급 전 원자적 claim 으로 선점(중복지급 방지). 마킹은 claim RPC 가 담당.
    expect(supabase.client.rpc).toHaveBeenCalledWith('claim_point_event', {
      p_event_id: '11111111-1111-4111-8111-111111111111',
    });
    expect(supabase.updates).toEqual([]);
  });

  test('does not grant when the event was already claimed by another run (SEC-2)', async () => {
    const supabase = createSupabaseMock(
      [
        {
          id: '11111111-1111-4111-8111-111111111111',
          user_id: '22222222-2222-4222-8222-222222222222',
          event_type: 'referral_granted',
          source_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          points: 100,
          reason_code: 'referral_reward',
        },
      ],
      { claimResult: false },
    );
    const grantClient = {
      grantPoints: jest.fn(async () => ({ ok: true, transactionId: 'tx-dup' })),
    };
    const handler = createProcessPointEventsHandler({ supabase: supabase.client, grantClient });

    const result = await handler({ batchSize: 1 }, { clientKey: 'test', role: 'service_role' });

    expect(result.ok).toBe(true);
    // claim 실패 → 지급도, 트랜잭션 기록도 없어야 한다.
    expect(grantClient.grantPoints).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
    expect(result.data?.granted).toBe(0);
  });

  test('skips grants that would exceed the monthly budget', async () => {
    const supabase = createSupabaseMock([
      {
        id: '33333333-3333-4333-8333-333333333333',
        user_id: '44444444-4444-4444-8444-444444444444',
        event_type: 'referral_granted',
        source_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        points: 60,
        reason_code: 'referral_reward',
      },
    ]);
    const grantClient = { grantPoints: jest.fn() };
    const handler = createProcessPointEventsHandler({
      supabase: supabase.client,
      grantClient,
      budgetLimitKrw: 50,
    });

    const result = await handler({ batchSize: 1 }, { clientKey: 'test', role: 'service_role' });

    expect(result.ok).toBe(true);
    expect(result.data?.skippedBudget).toBe(1);
    expect(grantClient.grantPoints).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([
      expect.objectContaining({
        table: 'point_transactions',
        status: 'skipped_budget',
      }),
    ]);
  });

  test.each([
    [
      'malformed user id',
      {
        id: '55555555-5555-4555-8555-555555555555',
        user_id: 'attacker-user',
        event_type: 'referral_granted',
        source_id: 'ref-3',
        points: 100,
        reason_code: 'referral_reward',
      },
    ],
    [
      'unexpected event type',
      {
        id: '66666666-6666-4666-8666-666666666666',
        user_id: '77777777-7777-4777-8777-777777777777',
        event_type: 'ad_reward_callback',
        source_id: 'ad-1',
        points: 100,
        reason_code: 'referral_reward',
      },
    ],
    [
      'ad reward event cannot mint points',
      {
        id: '99999999-9999-4999-8999-999999999999',
        user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        event_type: 'ad_reward_callback',
        source_id: 'ad-2',
        points: 100,
        reason_code: 'ad_reward',
      },
    ],
    [
      'unexpected reason code',
      {
        id: '88888888-8888-4888-8888-888888888888',
        user_id: '99999999-9999-4999-8999-999999999999',
        event_type: 'referral_granted',
        source_id: 'ref-4',
        points: 100,
        reason_code: 'attacker_reason',
      },
    ],
    [
      'missing source id',
      {
        id: '12121212-1212-4121-8121-121212121212',
        user_id: '34343434-3434-4343-8343-343434343434',
        event_type: 'referral_granted',
        source_id: null,
        points: 100,
        reason_code: 'referral_reward',
      },
    ],
    [
      'oversized points',
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        event_type: 'referral_granted',
        source_id: 'ref-5',
        points: 5001,
        reason_code: 'referral_reward',
      },
    ],
  ])('rejects invalid point events before grant: %s', async (_label, event) => {
    const supabase = createSupabaseMock([event]);
    const grantClient = {
      grantPoints: jest.fn(async () => ({ ok: true, transactionId: 'tx-invalid' })),
    };
    const handler = createProcessPointEventsHandler({ supabase: supabase.client, grantClient });

    const result = await handler({ batchSize: 1 }, { clientKey: 'test', role: 'service_role' });

    expect(result.ok).toBe(true);
    expect(result.data?.failed).toBe(1);
    expect(grantClient.grantPoints).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([
      expect.objectContaining({
        table: 'point_transactions',
        status: 'failed',
        toss_error_code: 'INVALID_POINT_EVENT',
      }),
    ]);
  });

  test('clamps batchSize before polling the queue', async () => {
    const supabase = createSupabaseMock();
    const grantClient = { grantPoints: jest.fn() };
    const handler = createProcessPointEventsHandler({ supabase: supabase.client, grantClient });

    const result = await handler({ batchSize: 10_000 }, { clientKey: 'test', role: 'service_role' });

    expect(result.ok).toBe(true);
    expect(supabase.limitMock).toHaveBeenCalledWith(100);
  });
});
