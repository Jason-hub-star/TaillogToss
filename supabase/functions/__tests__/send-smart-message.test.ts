import { createSendSmartMessageHandler } from '../send-smart-message/index.ts';
import { InMemoryIdempotencyStore } from '../_shared/idempotency.ts';
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

const TEMPLATE_CODES = {
  LOG_REMINDER: 'taillog-app-TAILLOG_BEHAVIOR_REMIND',
  STREAK_ALERT: 'taillog-app-TAILLOG_STREAK_ALERT',
  PROMO: 'taillog-app-TAILLOG_PROMO',
} as const;

describe('send-smart-message handler', () => {
  function createMtlsMock() {
    return {
      exchangeAuthorizationCode: jest.fn(),
      fetchLoginProfile: jest.fn(),
      verifyIapOrder: jest.fn(),
      getPointsGrantKey: jest.fn(),
      executePointsGrant: jest.fn(),
      getPointsGrantResult: jest.fn(),
      sendSmartMessage: jest.fn(async () => ({
        messageId: 'message-1',
        sentAt: '2026-02-26T03:00:00.000Z',
      })),
    };
  }

  test('rejects non-admin roles', async () => {
    const handler = createSendSmartMessageHandler();

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-1',
      },
      { clientKey: 'client-a', role: 'user' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  test('rejects general users before resolving recipients or sending', async () => {
    const mTLSClient = createMtlsMock();
    const resolveTossUserKey = jest.fn(async () => 'toss-11111111-1111-4111-8111-111111111111');
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      resolveTossUserKey,
    });

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-user',
      },
      { clientKey: 'client-a', role: 'user' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(resolveTossUserKey).not.toHaveBeenCalled();
    expect(mTLSClient.sendSmartMessage).not.toHaveBeenCalled();
  });

  test('ignores x-user-role spoofing before resolving recipients or sending', async () => {
    const mTLSClient = createMtlsMock();
    const resolveTossUserKey = jest.fn(async () => 'toss-11111111-1111-4111-8111-111111111111');
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      resolveTossUserKey,
    });
    const token = createJwt({ role: 'authenticated', sub: '11111111-1111-4111-8111-111111111111' });
    const request = new Request('https://example.com/functions/v1/send-smart-message', {
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
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-spoof',
      },
      context
    );

    expect(context.role).toBeUndefined();
    expect(context.userId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(resolveTossUserKey).not.toHaveBeenCalled();
    expect(mTLSClient.sendSmartMessage).not.toHaveBeenCalled();
  });

  test('does not grant send permission from user_metadata role claims', async () => {
    const mTLSClient = createMtlsMock();
    const resolveTossUserKey = jest.fn(async () => 'toss-11111111-1111-4111-8111-111111111111');
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      resolveTossUserKey,
    });
    const token = createJwt({
      role: 'authenticated',
      sub: '11111111-1111-4111-8111-111111111111',
      user_metadata: { role: 'trainer' },
    });
    const request = new Request('https://example.com/functions/v1/send-smart-message', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const context = buildEdgeContext(request);

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-user-metadata-role',
      },
      context
    );

    expect(context.role).toBeUndefined();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(resolveTossUserKey).not.toHaveBeenCalled();
    expect(mTLSClient.sendSmartMessage).not.toHaveBeenCalled();
  });

  test('rejects staff role when body userId targets a different user', async () => {
    const mTLSClient = createMtlsMock();
    const resolveTossUserKey = jest.fn(async () => 'toss-user-victim');
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      resolveTossUserKey,
    });

    const result = await handler(
      {
        userId: '99999999-9999-4999-8999-999999999999',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-target-mismatch',
      },
      { clientKey: 'client-a', role: 'trainer', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(resolveTossUserKey).not.toHaveBeenCalled();
    expect(mTLSClient.sendSmartMessage).not.toHaveBeenCalled();
  });

  test('rejects malformed userId before resolving recipients or sending', async () => {
    const mTLSClient = createMtlsMock();
    const resolveTossUserKey = jest.fn(async () => 'toss-user-malformed');
    const resolveNotificationPref = jest.fn();
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      resolveTossUserKey,
      resolveNotificationPref,
    });

    const result = await handler(
      {
        userId: 'not-a-user-id',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-malformed-user-id',
      },
      { clientKey: 'client-a', role: 'service_role', userId: 'service-worker' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(resolveNotificationPref).not.toHaveBeenCalled();
    expect(resolveTossUserKey).not.toHaveBeenCalled();
    expect(mTLSClient.sendSmartMessage).not.toHaveBeenCalled();
  });

  test('rejects dynamic template variables before resolving recipients or sending', async () => {
    const mTLSClient = createMtlsMock();
    const resolveTossUserKey = jest.fn(async () => 'toss-11111111-1111-4111-8111-111111111111');
    const resolveNotificationPref = jest.fn();
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      resolveTossUserKey,
      resolveNotificationPref,
    });

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        variables: { dogName: 'Choco' },
        idempotencyKey: 'idem-msg-dynamic-vars',
      },
      { clientKey: 'client-a', role: 'trainer', userId: '11111111-1111-4111-8111-111111111111' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(resolveNotificationPref).not.toHaveBeenCalled();
    expect(resolveTossUserKey).not.toHaveBeenCalled();
    expect(mTLSClient.sendSmartMessage).not.toHaveBeenCalled();
  });

  test('rejects unapproved template codes before preference lookup or sending', async () => {
    const mTLSClient = createMtlsMock();
    const resolveTossUserKey = jest.fn(async () => 'toss-11111111-1111-4111-8111-111111111111');
    const resolveNotificationPref = jest.fn();
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      resolveTossUserKey,
      resolveNotificationPref,
    });

    const result = await handler(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        notificationType: 'log_reminder',
        templateCode: 'attacker-controlled-template',
        idempotencyKey: 'idem-msg-template-spoof',
      },
      { clientKey: 'client-a', role: 'trainer', userId: '11111111-1111-4111-8111-111111111111' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(resolveNotificationPref).not.toHaveBeenCalled();
    expect(resolveTossUserKey).not.toHaveBeenCalled();
    expect(mTLSClient.sendSmartMessage).not.toHaveBeenCalled();
  });

  test('replays successful idempotency response without sending twice', async () => {
    const fixedNow = new Date('2026-02-26T03:00:00.000Z'); // KST 12:00
    const mTLSClient = createMtlsMock();
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      getNow: () => fixedNow,
      history: [],
      idempotency: new InMemoryIdempotencyStore(),
      resolveTossUserKey: async () => 'toss-22222222-2222-4222-8222-222222222222',
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
    const request = {
      userId: '22222222-2222-4222-8222-222222222222',
      notificationType: 'log_reminder' as const,
      templateCode: TEMPLATE_CODES.LOG_REMINDER,
      idempotencyKey: 'idem-msg-replay',
    };

    const first = await handler(request, { clientKey: 'client-b', role: 'trainer', userId: '22222222-2222-4222-8222-222222222222' });
    const replay = await handler(request, { clientKey: 'client-b', role: 'trainer', userId: '22222222-2222-4222-8222-222222222222' });

    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(true);
    expect(replay.data).toEqual(first.data);
    expect(mTLSClient.sendSmartMessage).toHaveBeenCalledTimes(1);
  });

  test('rejects same idempotency key when the message target changes', async () => {
    const fixedNow = new Date('2026-02-26T03:00:00.000Z'); // KST 12:00
    const mTLSClient = createMtlsMock();
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      getNow: () => fixedNow,
      history: [],
      idempotency: new InMemoryIdempotencyStore(),
      resolveTossUserKey: async (userId) => `toss-${userId}`,
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
    const request = {
      userId: '11111111-1111-4111-8111-111111111111',
      notificationType: 'log_reminder' as const,
      templateCode: TEMPLATE_CODES.LOG_REMINDER,
      idempotencyKey: 'idem-msg-replay',
    };

    const first = await handler(request, { clientKey: 'client-a', role: 'trainer', userId: '11111111-1111-4111-8111-111111111111' });
    const second = await handler(
      {
        ...request,
        userId: '22222222-2222-4222-8222-222222222222',
      },
      { clientKey: 'client-a', role: 'trainer', userId: '22222222-2222-4222-8222-222222222222' }
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.status).toBe(409);
    expect(second.error?.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect(mTLSClient.sendSmartMessage).toHaveBeenCalledTimes(1);
  });

  test('rejects same idempotency key when the approved message template changes', async () => {
    const fixedNow = new Date('2026-02-26T03:00:00.000Z'); // KST 12:00
    const mTLSClient = createMtlsMock();
    const handler = createSendSmartMessageHandler({
      mTLSClient,
      getNow: () => fixedNow,
      history: [],
      idempotency: new InMemoryIdempotencyStore(),
      resolveTossUserKey: async (userId) => `toss-${userId}`,
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
    const request = {
      userId: '11111111-1111-4111-8111-111111111111',
      notificationType: 'log_reminder' as const,
      templateCode: TEMPLATE_CODES.LOG_REMINDER,
      idempotencyKey: 'idem-msg-template-replay',
    };

    const first = await handler(request, { clientKey: 'client-a', role: 'trainer', userId: '11111111-1111-4111-8111-111111111111' });
    const second = await handler(
      {
        ...request,
        notificationType: 'streak_alert' as const,
        templateCode: TEMPLATE_CODES.STREAK_ALERT,
      },
      { clientKey: 'client-a', role: 'trainer', userId: '11111111-1111-4111-8111-111111111111' }
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.status).toBe(409);
    expect(second.error?.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect(mTLSClient.sendSmartMessage).toHaveBeenCalledTimes(1);
  });

  test('applies cooldown after first successful send', async () => {
    const fixedNow = new Date('2026-02-26T03:00:00.000Z'); // KST 12:00
    const handler = createSendSmartMessageHandler({ getNow: () => fixedNow, history: [] });

    const requestA = {
      userId: '11111111-1111-4111-8111-111111111111',
      notificationType: 'log_reminder' as const,
      templateCode: TEMPLATE_CODES.LOG_REMINDER,
      idempotencyKey: 'idem-msg-2',
    };

    const requestB = {
      ...requestA,
      idempotencyKey: 'idem-msg-3',
    };

    const first = await handler(requestA, { clientKey: 'client-a', role: 'trainer', userId: '11111111-1111-4111-8111-111111111111' });
    const second = await handler(requestB, { clientKey: 'client-a', role: 'trainer', userId: '11111111-1111-4111-8111-111111111111' });

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
      userId: '22222222-2222-4222-8222-222222222222',
      notificationType: 'streak_alert' as const,
      templateCode: TEMPLATE_CODES.STREAK_ALERT,
      idempotencyKey: 'idem-msg-4',
    };

    const first = await handler(request, { clientKey: 'client-b', role: 'trainer', userId: '22222222-2222-4222-8222-222222222222' });
    const replay = await handler(request, { clientKey: 'client-b', role: 'trainer', userId: '22222222-2222-4222-8222-222222222222' });

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
        userId: '33333333-3333-4333-8333-333333333333',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-5',
      },
      { clientKey: 'client-c', role: 'trainer', userId: '33333333-3333-4333-8333-333333333333' }
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
        userId: '44444444-4444-4444-8444-444444444444',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-6',
      },
      { clientKey: 'client-d', role: 'trainer', userId: '44444444-4444-4444-8444-444444444444' }
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
          userId: '66666666-6666-4666-8666-666666666666',
          notificationType: 'log_reminder',
          templateCode: TEMPLATE_CODES.LOG_REMINDER,
          idempotencyKey: 'idem-msg-8',
        },
        { clientKey: 'client-f', role: 'trainer', userId: '66666666-6666-4666-8666-666666666666' }
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
        userId: '77777777-7777-4777-8777-777777777777',
        notificationType: 'promo',
        templateCode: TEMPLATE_CODES.PROMO,
        idempotencyKey: 'idem-msg-9',
      },
      { clientKey: 'client-g', role: 'trainer', userId: '77777777-7777-4777-8777-777777777777' }
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
      resolveTossUserKey: async () => 'toss-88888888-8888-4888-8888-888888888888',
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
        userId: '88888888-8888-4888-8888-888888888888',
        notificationType: 'promo',
        templateCode: TEMPLATE_CODES.PROMO,
        idempotencyKey: 'idem-msg-10',
      },
      { clientKey: 'client-h', role: 'trainer', userId: '88888888-8888-4888-8888-888888888888' }
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
        userId: '55555555-5555-4555-8555-555555555555',
        notificationType: 'log_reminder',
        templateCode: TEMPLATE_CODES.LOG_REMINDER,
        idempotencyKey: 'idem-msg-7',
      },
      { clientKey: 'client-e', role: 'trainer', userId: '55555555-5555-4555-8555-555555555555' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error?.code).toBe('RATE_LIMITED');
    expect(result.error?.details?.reason).toBe('QUIET_HOURS');
  });
});
