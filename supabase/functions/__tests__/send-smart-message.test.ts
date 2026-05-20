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

  test('blocks sends when the Smart Message channel is disabled', async () => {
    const handler = createSendSmartMessageHandler({
      resolveNotificationPref: async () => ({
        channels: { smart_message: false, push: true },
        types: {
          log_reminder: true,
          streak_alert: true,
          coaching_ready: true,
          training_reminder: true,
          surge_alert: true,
          promo: true,
        },
        marketing_agreed: false,
        quiet_hours: { enabled: false, start_hour: 22, end_hour: 8 },
      }),
    });

    const result = await handler(
      {
        userId: 'user-3',
        notificationType: 'log_reminder',
        templateCode: 'tpl-3',
        idempotencyKey: 'idem-msg-5',
      },
      { clientKey: 'client-c', role: 'trainer' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('NOTIFICATION_OPTED_OUT');
  });

  test('blocks sends when the notification type is disabled', async () => {
    const handler = createSendSmartMessageHandler({
      resolveNotificationPref: async () => ({
        channels: { smart_message: true, push: true },
        types: {
          log_reminder: false,
          streak_alert: true,
          coaching_ready: true,
          training_reminder: true,
          surge_alert: true,
          promo: true,
        },
        marketing_agreed: false,
        quiet_hours: { enabled: false, start_hour: 22, end_hour: 8 },
      }),
    });

    const result = await handler(
      {
        userId: 'user-4',
        notificationType: 'log_reminder',
        templateCode: 'tpl-4',
        idempotencyKey: 'idem-msg-6',
      },
      { clientKey: 'client-d', role: 'trainer' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('NOTIFICATION_OPTED_OUT');
  });

  test('reads notification_pref from user_settings before sending', async () => {
    const originalFetch = global.fetch;
    const originalSupabaseUrl = process.env.SUPABASE_URL;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sendSmartMessage = jest.fn();

    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    global.fetch = jest.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toContain('/rest/v1/user_settings');
      expect(String(url)).toContain('select=notification_pref,marketing_agreed');
      return {
        ok: true,
        json: async () => [
          {
            notification_pref: {
              channels: { smart_message: true, push: true },
              types: { log_reminder: false },
              quiet_hours: { enabled: false, start_hour: 22, end_hour: 8 },
            },
            marketing_agreed: false,
          },
        ],
      } as Response;
    });

    const handler = createSendSmartMessageHandler({
      mTLSClient: {
        exchangeAuthorizationCode: jest.fn(),
        fetchLoginProfile: jest.fn(),
        verifyIapOrder: jest.fn(),
        sendSmartMessage,
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      getNow: () => new Date('2026-02-26T03:00:00.000Z'), // KST 12:00
      history: [],
    });

    try {
      const result = await handler(
        {
          userId: 'user-6',
          notificationType: 'log_reminder',
          templateCode: 'tpl-6',
          idempotencyKey: 'idem-msg-8',
        },
        { clientKey: 'client-f', role: 'trainer' }
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error?.code).toBe('NOTIFICATION_OPTED_OUT');
      expect(sendSmartMessage).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
      if (originalSupabaseUrl === undefined) {
        delete process.env.SUPABASE_URL;
      } else {
        process.env.SUPABASE_URL = originalSupabaseUrl;
      }
      if (originalServiceRoleKey === undefined) {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      } else {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
      }
    }
  });

  test('blocks promo sends when marketing consent is missing', async () => {
    const sendSmartMessage = jest.fn();
    const handler = createSendSmartMessageHandler({
      mTLSClient: {
        exchangeAuthorizationCode: jest.fn(),
        fetchLoginProfile: jest.fn(),
        verifyIapOrder: jest.fn(),
        sendSmartMessage,
        getPointsGrantKey: jest.fn(),
        executePointsGrant: jest.fn(),
        getPointsGrantResult: jest.fn(),
      },
      getNow: () => new Date('2026-02-26T03:00:00.000Z'), // KST 12:00
      history: [],
      resolveNotificationPref: async () => ({
        channels: { smart_message: true, push: true },
        types: {
          log_reminder: true,
          streak_alert: true,
          coaching_ready: true,
          training_reminder: true,
          surge_alert: true,
          promo: true,
        },
        marketing_agreed: false,
        quiet_hours: { enabled: false, start_hour: 22, end_hour: 8 },
      }),
    });

    const result = await handler(
      {
        userId: 'user-7',
        notificationType: 'promo',
        templateCode: 'tpl-promo',
        idempotencyKey: 'idem-msg-9',
      },
      { clientKey: 'client-g', role: 'trainer' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('MARKETING_CONSENT_REQUIRED');
    expect(sendSmartMessage).not.toHaveBeenCalled();
  });

  test('allows promo sends only when promo preference and marketing consent are both enabled', async () => {
    const fixedNow = new Date('2026-02-26T03:00:00.000Z'); // KST 12:00
    const handler = createSendSmartMessageHandler({
      getNow: () => fixedNow,
      history: [],
      resolveTossUserKey: async () => 'toss-user-8',
      resolveNotificationPref: async () => ({
        channels: { smart_message: true, push: true },
        types: {
          log_reminder: true,
          streak_alert: true,
          coaching_ready: true,
          training_reminder: true,
          surge_alert: true,
          promo: true,
        },
        marketing_agreed: true,
        quiet_hours: { enabled: false, start_hour: 22, end_hour: 8 },
      }),
    });

    const result = await handler(
      {
        userId: 'user-8',
        notificationType: 'promo',
        templateCode: 'tpl-promo',
        idempotencyKey: 'idem-msg-10',
      },
      { clientKey: 'client-h', role: 'trainer' }
    );

    expect(result.ok).toBe(true);
    expect(result.data?.sent).toBe(true);
    expect(result.data?.noti_history.notification_type).toBe('promo');
  });

  test('uses user quiet-hours preference instead of the fixed default window', async () => {
    const fixedNow = new Date('2026-02-26T03:00:00.000Z'); // KST 12:00
    const handler = createSendSmartMessageHandler({
      getNow: () => fixedNow,
      history: [],
      resolveNotificationPref: async () => ({
        channels: { smart_message: true, push: true },
        types: {
          log_reminder: true,
          streak_alert: true,
          coaching_ready: true,
          training_reminder: true,
          surge_alert: true,
          promo: true,
        },
        marketing_agreed: false,
        quiet_hours: { enabled: true, start_hour: 11, end_hour: 13 },
      }),
    });

    const result = await handler(
      {
        userId: 'user-5',
        notificationType: 'log_reminder',
        templateCode: 'tpl-5',
        idempotencyKey: 'idem-msg-7',
      },
      { clientKey: 'client-e', role: 'trainer' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error?.code).toBe('RATE_LIMITED');
    expect(result.error?.details?.reason).toBe('QUIET_HOURS');
  });
});
