import { createProcessReferralHandler } from '../process-referral/index.ts';
import type { EdgeContext } from '../_shared/contracts.ts';

function createSupabaseMock(overrides?: {
  referrer?: { id: string; share_code: string } | null;
  existingReferral?: { id: string } | null;
  grantedCount?: number;
  candidates?: Array<{
    id: string;
    referrer_user_id: string;
    invitee_user_id: string;
    invitee_ip: string | null;
    invitee_action_count: number;
    created_at: string;
  }>;
}) {
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];

  return {
    inserts,
    updates,
    client: {
      from: jest.fn((table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn((col: string) => ({
            single: jest.fn(async () => {
              if (table === 'users' && col === 'share_code') {
                return { data: overrides?.referrer ?? { id: 'referrer-1', share_code: 'SHARE1' }, error: null };
              }
              return { data: null, error: null };
            }),
            maybeSingle: jest.fn(async () => ({
              data: overrides?.existingReferral ?? null,
              error: null,
            })),
          })),
          in: jest.fn(() => ({
            gte: jest.fn(async () => ({ data: [{ count: overrides?.grantedCount ?? 0 }], error: null })),
          })),
          lte: jest.fn(() => ({
            order: jest.fn(async () => ({ data: overrides?.candidates ?? [], error: null })),
          })),
        })),
        insert: jest.fn(async (values: Record<string, unknown>) => {
          inserts.push(values);
          return { data: { id: 'referral-1' }, error: null };
        }),
        update: jest.fn((values: Record<string, unknown>) => ({
          eq: jest.fn(async () => {
            updates.push(values);
            return { error: null };
          }),
        })),
      })),
      rpc: jest.fn(async () => ({ data: overrides?.grantedCount ?? 0, error: null })),
    },
  };
}

const serviceContext: EdgeContext = { clientKey: 'test', role: 'service_role' };

describe('process-referral handler', () => {
  test('rejects non-service roles before referral lookup', async () => {
    const supabase = createSupabaseMock();
    const handler = createProcessReferralHandler({ supabase: supabase.client });

    const result = await handler(
      { action: 'accept', shareCode: 'SHARE1', inviteeUserId: 'invitee-1' },
      { clientKey: 'test', role: 'trainer' },
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(supabase.client.from).not.toHaveBeenCalled();
  });

  test('rejects self-referrals', async () => {
    const supabase = createSupabaseMock({
      referrer: { id: 'user-1', share_code: 'SHARE1' },
    });
    const handler = createProcessReferralHandler({ supabase: supabase.client });

    const result = await handler(
      { action: 'accept', shareCode: 'SHARE1', inviteeUserId: 'user-1' },
      serviceContext,
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('SELF_REFERRAL');
    expect(supabase.inserts).toHaveLength(0);
  });

  test('keeps monthly referral settlement within budget', async () => {
    const supabase = createSupabaseMock({
      grantedCount: 49,
      candidates: [
        {
          id: 'ref-1',
          referrer_user_id: 'referrer-1',
          invitee_user_id: 'invitee-1',
          invitee_ip: null,
          invitee_action_count: 3,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ref-2',
          referrer_user_id: 'referrer-2',
          invitee_user_id: 'invitee-2',
          invitee_ip: null,
          invitee_action_count: 3,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const handler = createProcessReferralHandler({ supabase: supabase.client });

    const result = await handler({ action: 'settle' }, serviceContext);

    expect(result.ok).toBe(true);
    expect(result.data?.granted).toBe(1);
    expect(supabase.updates.filter((update) => update.status === 'granted')).toHaveLength(1);
  });
});
