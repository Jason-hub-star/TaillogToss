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
} from '../_shared/cooldownPolicy.ts';
import {
  createNotiHistoryRepository,
  type NotiHistoryRepository,
} from '../_shared/notiHistoryRepository.ts';

type NotificationType =
  | 'log_reminder'
  | 'streak_alert'
  | 'coaching_ready'
  | 'training_reminder'
  | 'surge_alert'
  | 'promo';

export interface SendSmartMessageRequest {
  userId: string;
  notificationType: NotificationType;
  templateCode: string;
  variables: Record<string, string>;
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
}

const historyStore: CooldownRecord[] = [];

function defaultDeps(): SendSmartMessageDeps {
  return {
    mTLSClient: createMTLSClient('mock'),
    idempotency: edgeIdempotencyStore,
    getNow: () => new Date(),
    history: historyStore,
    notiHistoryRepository: createNotiHistoryRepository({ history: historyStore }),
  };
}

function resolveIdempotentResponse(
  begin: BeginIdempotencyResult<SendSmartMessageResponse>
): EdgeResult<SendSmartMessageResponse> | null {
  if (begin.kind === 'new') return null;

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
  const baseDeps = defaultDeps();
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

    const begin = deps.idempotency.begin<SendSmartMessageResponse>(
      'send-smart-message',
      request.idempotencyKey
    );
    const replay = resolveIdempotentResponse(begin);
    if (replay) return replay;

    const now = deps.getNow();
    let cooldownHistory = deps.history;
    try {
      cooldownHistory = await deps.notiHistoryRepository.listCooldownHistory(request.userId, now.getTime());
    } catch {
      cooldownHistory = deps.history;
    }

    const cooldown = evaluateCooldown(cooldownHistory, request.userId, now.getTime());
    if (!cooldown.allowed) {
      deps.idempotency.fail('send-smart-message', request.idempotencyKey);
      return fail('RATE_LIMITED', `Smart message blocked: ${cooldown.reason ?? 'UNKNOWN'}`, 429, {
        retryable: true,
        details: { retryAfterSeconds: cooldown.retryAfterSeconds ?? 0 },
      });
    }

    try {
      const sent = await deps.mTLSClient.sendSmartMessage({
        userId: request.userId,
        templateCode: request.templateCode,
        variables: request.variables,
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

export const handleSendSmartMessage = createSendSmartMessageHandler();
