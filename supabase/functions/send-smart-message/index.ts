/**
 * send-smart-message — 관리자 권한/쿨다운 정책을 검증해 Smart Message를 발송한다.
 * Parity: MSG-001
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import { createMTLSClient, type MTLSClient } from '../_shared/mTLSClient.ts';
import {
  edgeIdempotencyStore,
  type BeginIdempotencyResult,
  type InMemoryIdempotencyStore,
} from '../_shared/idempotency.ts';
import {
  evaluateCooldown,
  type CooldownRecord,
  type QuietHoursConfig,
} from '../_shared/cooldownPolicy.ts';
import {
  createNotiHistoryRepository,
  type NotiHistoryRepository,
} from '../_shared/notiHistoryRepository.ts';
import { resolveMtlsMode } from '../_shared/mtlsMode.ts';

type NotificationType =
  | 'log_reminder'
  | 'streak_alert'
  | 'coaching_ready'
  | 'training_reminder'
  | 'surge_alert'
  | 'promo';

interface NotificationPreference {
  channels: {
    smart_message: boolean;
    push: boolean;
  };
  types: Record<NotificationType, boolean>;
  marketing_agreed: boolean;
  quiet_hours: {
    enabled: boolean;
    start_hour: number;
    end_hour: number;
  };
}

export interface SendSmartMessageRequest {
  userId: string;
  notificationType: NotificationType;
  templateCode: string;
  variables?: Record<string, string>;
  idempotencyKey: string;
}

export interface SendSmartMessageResponse {
  sent: boolean;
  message_id: string;
  sent_at: string;
  noti_history: {
    user_id: string;
    template_set_code: string;
    notification_type: NotificationType;
    sent_at: string;
    success: boolean;
    error_code: string | null;
    idempotency_key: string;
  };
}

interface SendSmartMessageDeps {
  mTLSClient: MTLSClient;
  idempotency: InMemoryIdempotencyStore;
  getNow: () => Date;
  history: CooldownRecord[];
  notiHistoryRepository: NotiHistoryRepository;
  resolveTossUserKey: (userId: string) => Promise<string>;
  resolveNotificationPref: (userId: string) => Promise<NotificationPreference>;
}

const historyStore: CooldownRecord[] = [];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_NOTIFICATION_PREF: NotificationPreference = {
  channels: { smart_message: true, push: true },
  types: {
    log_reminder: true,
    streak_alert: true,
    coaching_ready: true,
    training_reminder: true,
    surge_alert: true,
    promo: false,
  },
  marketing_agreed: false,
  quiet_hours: { enabled: true, start_hour: 22, end_hour: 8 },
};

const APPROVED_TEMPLATE_CODES: Record<NotificationType, string> = {
  log_reminder: 'taillog-app-TAILLOG_BEHAVIOR_REMIND',
  streak_alert: 'taillog-app-TAILLOG_STREAK_ALERT',
  coaching_ready: 'taillog-app-TAILLOG_COACHING_READY',
  training_reminder: 'taillog-app-TAILLOG_TRAINING_REMIND',
  surge_alert: 'taillog-app-TAILLOG_SURGE_ALERT',
  promo: 'taillog-app-TAILLOG_PROMO',
};

function defaultDeps(overrides?: Partial<SendSmartMessageDeps>): SendSmartMessageDeps {
  return {
    mTLSClient: overrides?.mTLSClient ?? createMTLSClient(resolveMtlsMode()),
    idempotency: edgeIdempotencyStore,
    getNow: () => new Date(),
    history: historyStore,
    notiHistoryRepository: createNotiHistoryRepository({ history: historyStore }),
    resolveTossUserKey,
    resolveNotificationPref,
  };
}

function readEnv(name: string): string | undefined {
  const denoRuntime = (globalThis as { Deno?: { env?: { get: (key: string) => string | undefined } } }).Deno;
  if (denoRuntime?.env?.get) {
    try {
      return denoRuntime.env.get(name);
    } catch {
      // ignore in non-edge runtimes
    }
  }
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

async function resolveTossUserKey(userId: string): Promise<string> {
  const supabaseUrl = readEnv('SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') ?? readEnv('SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return userId;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=toss_user_key&limit=1`,
    {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to resolve toss_user_key: ${response.status}`);
  }

  const rows = await response.json() as Array<{ toss_user_key?: string | null }>;
  const tossUserKey = rows[0]?.toss_user_key;
  if (!tossUserKey) {
    throw new Error('Missing toss_user_key');
  }
  return tossUserKey;
}

function mergeNotificationPref(value: unknown, marketingAgreed?: unknown): NotificationPreference {
  const input = value && typeof value === 'object'
    ? value as Partial<NotificationPreference>
    : {};
  const inputChannels = input.channels && typeof input.channels === 'object' ? input.channels : {};
  const inputTypes = input.types && typeof input.types === 'object' ? input.types : {};
  const inputQuietHours = input.quiet_hours && typeof input.quiet_hours === 'object' ? input.quiet_hours : {};

  return {
    channels: {
      smart_message: inputChannels.smart_message ?? DEFAULT_NOTIFICATION_PREF.channels.smart_message,
      push: inputChannels.push ?? DEFAULT_NOTIFICATION_PREF.channels.push,
    },
    types: {
      log_reminder: inputTypes.log_reminder ?? DEFAULT_NOTIFICATION_PREF.types.log_reminder,
      streak_alert: inputTypes.streak_alert ?? DEFAULT_NOTIFICATION_PREF.types.streak_alert,
      coaching_ready: inputTypes.coaching_ready ?? DEFAULT_NOTIFICATION_PREF.types.coaching_ready,
      training_reminder: inputTypes.training_reminder ?? DEFAULT_NOTIFICATION_PREF.types.training_reminder,
      surge_alert: inputTypes.surge_alert ?? DEFAULT_NOTIFICATION_PREF.types.surge_alert,
      promo: inputTypes.promo ?? DEFAULT_NOTIFICATION_PREF.types.promo,
    },
    marketing_agreed:
      typeof marketingAgreed === 'boolean'
        ? marketingAgreed
        : input.marketing_agreed ?? DEFAULT_NOTIFICATION_PREF.marketing_agreed,
    quiet_hours: {
      enabled: inputQuietHours.enabled ?? DEFAULT_NOTIFICATION_PREF.quiet_hours.enabled,
      start_hour: inputQuietHours.start_hour ?? DEFAULT_NOTIFICATION_PREF.quiet_hours.start_hour,
      end_hour: inputQuietHours.end_hour ?? DEFAULT_NOTIFICATION_PREF.quiet_hours.end_hour,
    },
  };
}

async function resolveNotificationPref(userId: string): Promise<NotificationPreference> {
  const supabaseUrl = readEnv('SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') ?? readEnv('SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return DEFAULT_NOTIFICATION_PREF;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_settings?user_id=eq.${encodeURIComponent(userId)}&select=notification_pref,marketing_agreed&limit=1`,
    {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to resolve notification_pref: ${response.status}`);
  }

  const rows = await response.json() as Array<{
    notification_pref?: unknown;
    marketing_agreed?: unknown;
  }>;
  const row = rows[0];
  return mergeNotificationPref(row?.notification_pref, row?.marketing_agreed);
}

function toQuietHoursConfig(pref: NotificationPreference): QuietHoursConfig {
  return {
    enabled: pref.quiet_hours.enabled,
    startHour: pref.quiet_hours.start_hour,
    endHour: pref.quiet_hours.end_hour,
  };
}

function evaluateNotificationPreference(pref: NotificationPreference, type: NotificationType): EdgeResult<never> | null {
  if (!pref.channels.smart_message) {
    return fail('NOTIFICATION_OPTED_OUT', 'Smart Message channel is disabled for this user', 403);
  }

  if (!pref.types[type]) {
    return fail('NOTIFICATION_OPTED_OUT', `${type} notifications are disabled for this user`, 403);
  }

  if (type === 'promo' && !pref.marketing_agreed) {
    return fail('MARKETING_CONSENT_REQUIRED', 'Marketing consent is required for promo notifications', 403);
  }

  return null;
}

function resolveIdempotentResponse(
  begin: BeginIdempotencyResult<SendSmartMessageResponse>
): EdgeResult<SendSmartMessageResponse> | null {
  if (begin.kind === 'new') return null;

  if (begin.kind === 'conflict') {
    return fail('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency key is already bound to another smart message request', 409);
  }

  const record = begin.record;
  if (record.status === 'completed' && record.response) {
    return ok(record.response);
  }

  return fail('IDEMPOTENCY_IN_PROGRESS', 'Request is already being processed', 409, {
    retryable: true,
  });
}

function isAdminRole(role: EdgeContext['role']): boolean {
  return role === 'trainer' || role === 'org_owner' || role === 'org_staff' || role === 'service_role';
}

function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function canSendToTarget(context: EdgeContext, userId: string): boolean {
  if (context.role === 'service_role') return true;
  return Boolean(context.userId && context.userId === userId);
}

function hasDynamicVariables(variables: SendSmartMessageRequest['variables']): boolean {
  return Boolean(variables && Object.keys(variables).length > 0);
}

function isApprovedTemplateCode(type: NotificationType, templateCode: string): boolean {
  return APPROVED_TEMPLATE_CODES[type] === templateCode;
}

function buildSmartMessageRequestFingerprint(request: SendSmartMessageRequest): string {
  return JSON.stringify({
    userId: request.userId,
    notificationType: request.notificationType,
    templateCode: request.templateCode,
    variables: request.variables ?? {},
    idempotencyKey: request.idempotencyKey,
  });
}

function createFallbackHistory(
  request: SendSmartMessageRequest,
  sentAt: string
): SendSmartMessageResponse['noti_history'] {
  return {
    user_id: request.userId,
    template_set_code: request.templateCode,
    notification_type: request.notificationType,
    sent_at: sentAt,
    success: true,
    error_code: 'NOTI_HISTORY_WRITE_FAILED',
    idempotency_key: request.idempotencyKey,
  };
}

export function createSendSmartMessageHandler(overrides?: Partial<SendSmartMessageDeps>) {
  const baseDeps = defaultDeps(overrides);
  const deps = {
    ...baseDeps,
    ...(overrides ?? {}),
    notiHistoryRepository:
      overrides?.notiHistoryRepository ??
      (overrides?.history
        ? createNotiHistoryRepository({ history: overrides.history })
        : baseDeps.notiHistoryRepository),
  };

  return async (
    request: SendSmartMessageRequest,
    context: EdgeContext
  ): Promise<EdgeResult<SendSmartMessageResponse>> => {
    if (!isAdminRole(context.role)) {
      return fail('AUTH_FORBIDDEN', 'Only staff roles can send smart messages', 403);
    }

    if (!request.userId || !request.notificationType || !request.templateCode || !request.idempotencyKey) {
      return fail('VALIDATION_ERROR', 'userId/notificationType/templateCode/idempotencyKey are required', 400);
    }

    if (!isUuid(request.userId)) {
      return fail('VALIDATION_ERROR', 'userId must be a UUID', 400);
    }

    if (!isApprovedTemplateCode(request.notificationType, request.templateCode)) {
      return fail('VALIDATION_ERROR', 'Smart Message templateCode must match an approved notification type', 400);
    }

    if (hasDynamicVariables(request.variables)) {
      return fail('VALIDATION_ERROR', 'Smart Message templates must use approved static text only', 400);
    }

    if (!canSendToTarget(context, request.userId)) {
      return fail('AUTH_FORBIDDEN', 'Caller cannot send smart messages to another user', 403);
    }

    const begin = deps.idempotency.begin<SendSmartMessageResponse>(
      'send-smart-message',
      request.idempotencyKey,
      buildSmartMessageRequestFingerprint(request)
    );
    const replay = resolveIdempotentResponse(begin);
    if (replay) return replay;

    let notificationPref: NotificationPreference;
    try {
      notificationPref = await deps.resolveNotificationPref(request.userId);
    } catch {
      deps.idempotency.fail('send-smart-message', request.idempotencyKey);
      return fail('PREFERENCE_LOOKUP_FAILED', 'Failed to load user notification preferences', 502, {
        retryable: true,
      });
    }

    const preferenceBlock = evaluateNotificationPreference(notificationPref, request.notificationType);
    if (preferenceBlock) {
      deps.idempotency.fail('send-smart-message', request.idempotencyKey);
      return preferenceBlock;
    }

    const now = deps.getNow();
    let cooldownHistory = deps.history;
    try {
      cooldownHistory = await deps.notiHistoryRepository.listCooldownHistory(request.userId, now.getTime());
    } catch {
      cooldownHistory = deps.history;
    }

    const cooldown = evaluateCooldown(
      cooldownHistory,
      request.userId,
      now.getTime(),
      toQuietHoursConfig(notificationPref)
    );
    if (!cooldown.allowed) {
      deps.idempotency.fail('send-smart-message', request.idempotencyKey);
      return fail('RATE_LIMITED', `Smart message blocked: ${cooldown.reason ?? 'UNKNOWN'}`, 429, {
        retryable: true,
        details: {
          reason: cooldown.reason ?? 'UNKNOWN',
          retryAfterSeconds: cooldown.retryAfterSeconds ?? 0,
        },
      });
    }

    try {
      const tossUserKey = await deps.resolveTossUserKey(request.userId);
      const sent = await deps.mTLSClient.sendSmartMessage({
        userId: tossUserKey,
        templateCode: request.templateCode,
        variables: request.variables ?? {},
      });

      deps.history.push({
        userId: request.userId,
        sentAt: now.getTime(),
      });

      let notiHistory: SendSmartMessageResponse['noti_history'];
      try {
        const persisted = await deps.notiHistoryRepository.writeHistory({
          userId: request.userId,
          templateCode: request.templateCode,
          notificationType: request.notificationType,
          idempotencyKey: request.idempotencyKey,
          sentAt: sent.sentAt,
          success: true,
        });

        notiHistory = {
          user_id: persisted.user_id,
          template_set_code: persisted.template_set_code,
          notification_type: persisted.notification_type as NotificationType,
          sent_at: persisted.sent_at,
          success: persisted.success,
          error_code: persisted.error_code,
          idempotency_key: persisted.idempotency_key,
        };
      } catch {
        // Fail-open: avoid duplicate message send on retries when persistence only fails.
        notiHistory = createFallbackHistory(request, sent.sentAt);
      }

      const response: SendSmartMessageResponse = {
        sent: true,
        message_id: sent.messageId,
        sent_at: sent.sentAt,
        noti_history: notiHistory,
      };

      deps.idempotency.complete('send-smart-message', request.idempotencyKey, response);
      return ok(response);
    } catch {
      deps.idempotency.fail('send-smart-message', request.idempotencyKey);
      return fail('SERVER_ERROR', 'Failed to send smart message', 502, { retryable: true });
    }
  };
}

let defaultHandler: ReturnType<typeof createSendSmartMessageHandler> | null = null;

export const handleSendSmartMessage: ReturnType<typeof createSendSmartMessageHandler> = (request, context) => {
  defaultHandler ??= createSendSmartMessageHandler();
  return defaultHandler(request, context);
};
