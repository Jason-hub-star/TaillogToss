/**
 * 알림 API — Smart Message 발송 (Edge Function)
 * Parity: MSG-001
 */
import { supabase } from './supabase';
import { requestBackend } from './backend';
import type { SmartMessageRequest, NotificationHistory } from 'types/notification';

function isJwtLike(token: string): boolean {
  return token.split('.').length === 3;
}

async function clearInvalidSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Local cleanup is best-effort; protected Edge calls still fail closed.
  }
}

async function getVerifiedAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('NO_SESSION');
  }
  if (!isJwtLike(accessToken)) {
    await clearInvalidSession();
    throw new Error('INVALID_SESSION');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    await clearInvalidSession();
    throw new Error('INVALID_SESSION');
  }

  return accessToken;
}

function createIdempotencyKey(userId: string, notificationType: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `msg_${userId}_${notificationType}_${Date.now().toString(36)}_${random}`;
}

/** Smart Message 발송 (Edge Function) */
export async function sendSmartMessage(request: SmartMessageRequest): Promise<void> {
  const payload = {
    userId: request.user_id,
    notificationType: request.notification_type,
    templateCode: request.template.template_set_code,
    idempotencyKey:
      request.idempotencyKey ??
      request.idempotency_key ??
      createIdempotencyKey(request.user_id, request.notification_type),
  };
  const accessToken = await getVerifiedAccessToken();

  const { error } = await supabase.functions.invoke('send-smart-message', {
    body: payload,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw error;
}

interface BackendNotificationRow {
  id: string;
  user_id: string;
  notification_type?: NotificationHistory['notification_type'] | null;
  channel: NotificationHistory['channel'];
  template_set_code?: string | null;
  sent_at: string;
  success: boolean;
  error_code?: string | null;
}

function mapNotificationRow(row: BackendNotificationRow): NotificationHistory {
  const templateSetCode = row.template_set_code ?? '';
  return {
    id: row.id,
    user_id: row.user_id,
    notification_type: row.notification_type ?? 'log_reminder',
    channel: row.channel,
    template_code: templateSetCode || null,
    template_set_code: templateSetCode,
    sent_at: row.sent_at,
    success: row.success,
    error_code: row.error_code ?? null,
  };
}

/** 발송 이력 조회 */
export async function getNotificationHistory(userId: string): Promise<NotificationHistory[]> {
  void userId;
  const rows = await requestBackend<BackendNotificationRow[]>('/api/v1/notification/');
  return rows.map(mapNotificationRow);
}

/** 알림 읽음 처리 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await requestBackend<void>(`/api/v1/notification/${notificationId}/read`, { method: 'PATCH' });
}
