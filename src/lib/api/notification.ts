/**
 * 알림 API — Smart Message 발송 (Edge Function)
 * Parity: MSG-001
 */
import { supabase } from './supabase';
import type { SmartMessageRequest, NotificationHistory } from 'types/notification';

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
    variables: request.template.variables,
    idempotencyKey:
      request.idempotencyKey ??
      request.idempotency_key ??
      createIdempotencyKey(request.user_id, request.notification_type),
  };

  const { error } = await supabase.functions.invoke('send-smart-message', {
    body: payload,
  });
  if (error) throw error;
}

/** 발송 이력 조회 */
export async function getNotificationHistory(userId: string): Promise<NotificationHistory[]> {
  const { data, error } = await supabase
    .from('noti_history')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as NotificationHistory[];
}
