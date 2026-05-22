/**
 * contactsViral PRO 1일권 공유 리워드 훅.
 * Parity: GROWTH-001, IAP-001
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Share } from 'react-native';
import { contactsViral, isMinVersionSupported } from '@apps-in-toss/framework';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID,
  grantContactsViralProDayPass,
} from 'lib/api/referral';
import { queryKeys } from 'lib/api/queryKeys';

type ContactsViralEvent =
  | {
      type: 'sendViral';
      data: {
        rewardAmount: number;
        rewardUnit: string;
      };
    }
  | {
      type: 'close';
      data: {
        closeReason: 'clickBackButton' | 'noReward';
        rewardUnit?: string;
      };
    };

interface UseContactsViralRewardOptions {
  moduleId?: string;
  onGranted?: () => void;
}

function isContactsViralAvailable(): boolean {
  return isMinVersionSupported({
    android: '5.223.0',
    ios: '5.223.0',
  });
}

async function fallbackShare(): Promise<void> {
  await Share.share({
    message: '테일로그에서 AI 코칭과 훈련 플랜을 확인해보세요.',
  });
}

export function useContactsViralReward(options?: UseContactsViralRewardOptions) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const moduleId = (options?.moduleId ?? CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID).trim();

  const grantMutation = useMutation({
    mutationFn: (event: Extract<ContactsViralEvent, { type: 'sendViral' }>['data']) =>
      grantContactsViralProDayPass({
        module_id: moduleId,
        reward_amount: event.rewardAmount,
        reward_unit: event.rewardUnit,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
      options?.onGranted?.();
      if (result.granted) {
        Alert.alert('PRO 1일권 지급 완료', '오늘부터 24시간 PRO 기능을 이용할 수 있어요.');
      } else {
        Alert.alert('이미 받았어요', '오늘 이 공유 리워드는 이미 지급됐어요.');
      }
    },
    onError: () => {
      Alert.alert('지급 확인 실패', '공유는 완료됐지만 보상 확인에 실패했어요. 잠시 후 다시 시도해주세요.');
    },
    onSettled: () => {
      setIsSharing(false);
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
  });

  const startContactsViralReward = useCallback(() => {
    if (!moduleId) {
      Alert.alert('공유 리워드 준비 중', '공유 보상 moduleId를 설정한 뒤 사용할 수 있어요.');
      void fallbackShare();
      return;
    }

    if (!isContactsViralAvailable()) {
      Alert.alert('토스 앱 업데이트 필요', '공유 리워드는 최신 토스 앱에서 사용할 수 있어요.');
      void fallbackShare();
      return;
    }

    setIsSharing(true);
    cleanupRef.current?.();
    cleanupRef.current = contactsViral({
      options: { moduleId },
      onEvent: (event: ContactsViralEvent) => {
        if (event.type === 'sendViral') {
          grantMutation.mutate(event.data);
          return;
        }
        setIsSharing(false);
        cleanupRef.current?.();
        cleanupRef.current = null;
        if (event.data.closeReason === 'noReward') {
          Alert.alert('받을 리워드가 없어요', '오늘 받을 수 있는 공유 리워드를 모두 사용했어요.');
        }
      },
      onError: () => {
        setIsSharing(false);
        cleanupRef.current?.();
        cleanupRef.current = null;
        Alert.alert('공유를 시작하지 못했어요', '잠시 후 다시 시도해주세요.');
      },
    });
  }, [grantMutation, moduleId]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return {
    startContactsViralReward,
    isSharing,
    isSupported: isContactsViralAvailable(),
    moduleId,
  };
}
