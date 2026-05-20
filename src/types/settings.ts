/**
 * 설정 도메인 타입 — 알림 선호도, AI 페르소나
 * Parity: APP-001
 */

/** 알림 선호도 */
export interface NotificationPref {
  channels: {
    smart_message: boolean;
    push: boolean;
  };
  types: {
    log_reminder: boolean; // 기록 리마인더 (기본 ON)
    surge_alert: boolean; // 급증 알림 (기본 ON)
    coaching_ready: boolean; // 코칭 완료 알림 (기본 ON)
    training_reminder: boolean; // 훈련 리마인더 (기본 ON)
    promo: boolean; // 프로모션 (기본 OFF)
  };
  quiet_hours: {
    enabled: boolean;
    start_hour: number; // 0-23
    end_hour: number; // 0-23
  };
}

/** AI 페르소나 설정 */
export interface AiPersona {
  tone: 'empathetic' | 'solution';
  perspective: 'coach' | 'dog';
}

/** 사용자 설정 전체 */
export interface UserSettings {
  notification_pref: NotificationPref;
  ai_persona: AiPersona;
  marketing_agreed: boolean;
  marketing_agreed_at?: string | null;
  language: 'ko'; // v1: 한국어 전용
}

/** 기본 알림 설정 */
export const DEFAULT_NOTIFICATION_PREF: NotificationPref = {
  channels: { smart_message: true, push: true },
  types: {
    log_reminder: true,
    surge_alert: true,
    coaching_ready: true,
    training_reminder: true,
    promo: false,
  },
  quiet_hours: { enabled: true, start_hour: 22, end_hour: 8 },
};

/** 기본 AI 페르소나 */
export const DEFAULT_AI_PERSONA: AiPersona = {
  tone: 'empathetic',
  perspective: 'coach',
};
