import { createSendSmartMessageHandler } from '../send-smart-message/index.ts';

describe('send-smart-message handler', () => {
  test('rejects non-admin roles', async () => {
    const handler = createSendSmartMessageHandler();

    const result = await handler(
      {
        userId: 'user-1',
        notificationType: 'log_reminder',
        templateCode: 'tpl-1',
        variables: { dogName: 'Choco' },
        idempotencyKey: 'idem-msg-1',
      },
      { clientKey: 'client-a', role: 'user' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  test('applies cooldown after first successful send', async () => {
    const fixedNow = new Date('2026-02-26T03:00:00.000Z'); // KST 12:00
    const handler = createSendSmartMessageHandler({ getNow: () => fixedNow, history: [] });

    const requestA = {
      userId: 'user-1',
      notificationType: 'log_reminder' as const,
      templateCode: 'tpl-1',
      variables: { dogName: 'Choco' },
      idempotencyKey: 'idem-msg-2',
    };

    const requestB = {
      ...requestA,
      idempotencyKey: 'idem-msg-3',
    };

    const first = await handler(requestA, { clientKey: 'client-a', role: 'trainer' });
    const second = await handler(requestB, { clientKey: 'client-a', role: 'trainer' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.error?.code).toBe('RATE_LIMITED');
  });

  test('keeps idempotent success when history persistence fails', async () => {
    const fixedNow = new Date('2026-02-26T03:10:00.000Z');
    const handler = createSendSmartMessageHandler({
      getNow: () => fixedNow,
      history: [],
      notiHistoryRepository: {
        listCooldownHistory: async () => [],
        writeHistory: async () => {
          throw new Error('db write failed');
        },
      },
    });

    const request = {
      userId: 'user-2',
      notificationType: 'streak_alert' as const,
      templateCode: 'tpl-2',
      variables: { streak: '3' },
      idempotencyKey: 'idem-msg-4',
    };

    const first = await handler(request, { clientKey: 'client-b', role: 'trainer' });
    const replay = await handler(request, { clientKey: 'client-b', role: 'trainer' });

    expect(first.ok).toBe(true);
    expect(first.data?.noti_history.error_code).toBe('NOTI_HISTORY_WRITE_FAILED');
    expect(replay.ok).toBe(true);
    expect(replay.data).toEqual(first.data);
  });
});
