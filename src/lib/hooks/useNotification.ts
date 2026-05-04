/**
 * useNotification 훅 — 알림 이력 조회 + Smart Message 발송
 * Parity: MSG-001
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import * as notiApi from 'lib/api/notification';
import { buildTemplate } from 'lib/data/notificationTemplates';
import type { NotificationType } from 'types/notification';

export function useNotificationHistory(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notification.history(userId ?? ''),
    queryFn: () => notiApi.getNotificationHistory(userId!),
    enabled: !!userId,
  });
}

/** Smart Message 발송 mutation (승인 후 사용) */
export function useSendSmartMessage() {
  return useMutation({
    mutationFn: ({ userId, type }: { userId: string; type: NotificationType }) =>
      notiApi.sendSmartMessage({
        user_id: userId,
        notification_type: type,
        template: buildTemplate(type),
      }),
  });
}
