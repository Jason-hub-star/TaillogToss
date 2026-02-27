import { createGrantTossPointsHandler } from '../grant-toss-points/index.ts';

describe('grant-toss-points handler', () => {
  test('grants points for staff role', async () => {
    const handler = createGrantTossPointsHandler({ usedGrantKeys: new Set<string>() });

    const result = await handler(
      {
        userId: 'user-1',
        points: 100,
        reasonCode: 'manual-grant',
        idempotencyKey: 'idem-point-1',
      },
      { clientKey: 'client-a', role: 'trainer' }
    );

    expect(result.ok).toBe(true);
    expect(result.data?.status).toBe('granted');
  });

  test('maps toss error codes on failure', async () => {
    const handler = createGrantTossPointsHandler({ usedGrantKeys: new Set<string>() });

    const result = await handler(
      {
        userId: 'user-1',
        points: 100,
        reasonCode: 'error-4109',
        idempotencyKey: 'idem-point-2',
      },
      { clientKey: 'client-a', role: 'org_owner' }
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TOSS_4109');
  });
});
