/**
 * 알림(Smart Message) 도메인 타입 — Toss Smart Message + 쿨다운 정책
 * Parity: MSG-001
 */

/** 알림 채널 */
export type NotificationChannel = 'ALIMTALK' | 'WEB_PUSH' | 'EMAIL';

/** 알림 유형 */
export type NotificationType =
  | 'log_reminder'
  | 'streak_alert'
  | 'coaching_ready'
  | 'training_reminder'
  | 'surge_alert'
  | 'promo';

/** Smart Message 템플릿 */
export interface SmartMessageTemplate {
  template_set_code: string;
  variables: Record<string, string>;
}

/** Smart Message 발송 요청 */
export interface SmartMessageRequest {
  user_id: string;
  notification_type: NotificationType;
  template: SmartMessageTemplate;
  idempotencyKey?: string;
  idempotency_key?: string;
}

/** 발송 이력 */
export interface NotificationHistory {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  template_code?: string | null;
  template_set_code: string;
  sent_at: string; // ISO 8601
  success: boolean;
  error_code: string | null;
  idempotency_key?: string | null;
  provider_channels?: string[];
}

/** 쿨다운 정책 */
export interface CooldownPolicy {
  /** 동일 타입 최소 간격 (분) */
  min_interval_minutes: 10;
  /** 하루 최대 발송 수 */
  daily_max: 3;
  /** 야간 금지 시간대 (KST) */
  quiet_hours: {
    start: 22; // 22시
    end: 8; // 08시
  };
}

/** 기본 쿨다운 정책 */
export const DEFAULT_COOLDOWN: CooldownPolicy = {
  min_interval_minutes: 10,
  daily_max: 3,
  quiet_hours: { start: 22, end: 8 },
};
