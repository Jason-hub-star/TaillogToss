/**
 * Smart Message 템플릿 코드 상수
 * Toss 콘솔 승인 코드와 1:1 매핑.
 * Parity: MSG-001
 *
 * 콘솔 등록 현황:
 *   LOG_REMINDER      — ✅ 승인 완료 (2026-04-29, 기능성)
 *   COACHING_READY    — ⏳ 콘솔 등록 대기 (기능성)
 *   TRAINING_REMINDER — ⏳ 콘솔 등록 대기 (기능성)
 *   STREAK_ALERT      — ⏳ 콘솔 등록 대기 (기능성)
 *   SURGE_ALERT       — ⏳ 콘솔 등록 대기 (기능성)
 *   PROMO             — ⏳ 콘솔 등록 대기 (광고성, ₩9.9/건)
 */
import type { NotificationType, SmartMessageTemplate } from 'types/notification';

/** 콘솔 발급 templateSetCode 상수 */
export const TEMPLATE_CODES = {
  /** 행동 기록 리마인더 — ✅ 승인 완료 (기능성) */
  LOG_REMINDER: 'taillog-app-TAILLOG_BEHAVIOR_REMIND',
  /** AI 코칭 준비 완료 — ⏳ 등록 대기 (기능성) */
  COACHING_READY: 'taillog-app-TAILLOG_COACHING_READY',
  /** 훈련 리마인더 — ⏳ 등록 대기 (기능성) */
  TRAINING_REMINDER: 'taillog-app-TAILLOG_TRAINING_REMIND',
  /** 연속 기록 알림 — ⏳ 등록 대기 (기능성) */
  STREAK_ALERT: 'taillog-app-TAILLOG_STREAK_ALERT',
  /** 서지 알림 — ⏳ 등록 대기 (기능성) */
  SURGE_ALERT: 'taillog-app-TAILLOG_SURGE_ALERT',
  /** 프로모션 — ⏳ 등록 대기 (광고성) */
  PROMO: 'taillog-app-TAILLOG_PROMO',
} as const;

/** notificationType → 템플릿 코드 매핑 (푸시 본문 정적 텍스트 전용) */
export function buildTemplate(type: NotificationType): SmartMessageTemplate {
  switch (type) {
    case 'log_reminder':      return { template_set_code: TEMPLATE_CODES.LOG_REMINDER };
    case 'coaching_ready':    return { template_set_code: TEMPLATE_CODES.COACHING_READY };
    case 'training_reminder': return { template_set_code: TEMPLATE_CODES.TRAINING_REMINDER };
    case 'streak_alert':      return { template_set_code: TEMPLATE_CODES.STREAK_ALERT };
    case 'surge_alert':       return { template_set_code: TEMPLATE_CODES.SURGE_ALERT };
    case 'promo':             return { template_set_code: TEMPLATE_CODES.PROMO };
    default: {
      void (type as never);
      return { template_set_code: TEMPLATE_CODES.LOG_REMINDER };
    }
  }
}
