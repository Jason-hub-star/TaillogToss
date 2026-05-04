/**
 * Smart Message 도메인 훅 — 어디서든 import 가능한 재사용 유닛
 * Parity: MSG-001
 *
 * 푸시 콘텐츠는 정적 텍스트만 지원 (중괄호 변수 불가).
 * variables 필드는 서버 측 로깅/추적용으로만 활용.
 *
 * 사용 예시:
 *   import { useLogReminder } from 'lib/notifications';
 *   const { send, isPending } = useLogReminder();
 *   send(userId);
 */
export { useNotificationHistory, useSendSmartMessage } from 'lib/hooks/useNotification';
export { TEMPLATE_CODES, buildTemplate } from 'lib/data/notificationTemplates';

import { useSendSmartMessage } from 'lib/hooks/useNotification';

/** 행동 기록 리마인더 — log_reminder (기능성, ✅ 승인 완료) */
export function useLogReminder() {
  const mutation = useSendSmartMessage();
  return {
    ...mutation,
    send: (userId: string) =>
      mutation.mutate({ userId, type: 'log_reminder' }),
  };
}

/** AI 코칭 준비 완료 — coaching_ready (기능성, ⏳ 콘솔 등록 대기) */
export function useCoachingReady() {
  const mutation = useSendSmartMessage();
  return {
    ...mutation,
    send: (userId: string) =>
      mutation.mutate({ userId, type: 'coaching_ready' }),
  };
}

/** 훈련 리마인더 — training_reminder (기능성, ⏳ 콘솔 등록 대기) */
export function useTrainingReminder() {
  const mutation = useSendSmartMessage();
  return {
    ...mutation,
    send: (userId: string) =>
      mutation.mutate({ userId, type: 'training_reminder' }),
  };
}

/** 연속 기록 알림 — streak_alert (기능성, ⏳ 콘솔 등록 대기) */
export function useStreakAlert() {
  const mutation = useSendSmartMessage();
  return {
    ...mutation,
    send: (userId: string) =>
      mutation.mutate({ userId, type: 'streak_alert' }),
  };
}

/** 서지 알림 — surge_alert (기능성, ⏳ 콘솔 등록 대기) */
export function useSurgeAlert() {
  const mutation = useSendSmartMessage();
  return {
    ...mutation,
    send: (userId: string) =>
      mutation.mutate({ userId, type: 'surge_alert' }),
  };
}
