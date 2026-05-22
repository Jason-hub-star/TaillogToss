/**
 * useContactsViralReward 테스트 — contactsViral sendViral 지급/close 미지급
 * Parity: GROWTH-001, IAP-001
 */
import React from 'react';
import { Alert, Share } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockContactsViral = jest.fn();
const mockIsMinVersionSupported = jest.fn();
const mockGrantContactsViralProDayPass = jest.fn();

type ContactsViralParams = {
  options: { moduleId: string };
  onEvent: (event: unknown) => void;
  onError: (error: unknown) => void;
};

let capturedParams: ContactsViralParams | null = null;
const cleanup = jest.fn();

jest.mock('@apps-in-toss/framework', () => ({
  contactsViral: (...args: unknown[]) => mockContactsViral(...args),
  isMinVersionSupported: (...args: unknown[]) => mockIsMinVersionSupported(...args),
}));

jest.mock('lib/api/referral', () => ({
  CONTACTS_VIRAL_PRO_DAY_PASS_MODULE_ID: 'module-from-env',
  grantContactsViralProDayPass: (...args: unknown[]) => mockGrantContactsViralProDayPass(...args),
}));

import { useContactsViralReward } from '../useContactsViralReward';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedParams = null;
  mockIsMinVersionSupported.mockReturnValue(true);
  mockContactsViral.mockImplementation((params: ContactsViralParams) => {
    capturedParams = params;
    return cleanup;
  });
  mockGrantContactsViralProDayPass.mockResolvedValue({
    granted: true,
    already_granted: false,
    entitlement_type: 'PRO_DAY_PASS',
    effective_is_pro: true,
    effective_pro_source: 'pro_day_pass',
    effective_pro_expires_at: '2026-05-23T00:00:00Z',
  });
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useContactsViralReward', () => {
  it('sendViral 이벤트 수신 시 grant API 호출 후 subscription query를 invalidate한다', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const onGranted = jest.fn();
    const { result } = renderHook(
      () => useContactsViralReward({ moduleId: 'module-1', onGranted }),
      { wrapper },
    );

    act(() => {
      result.current.startContactsViralReward();
    });

    expect(mockContactsViral).toHaveBeenCalledWith(expect.objectContaining({
      options: { moduleId: 'module-1' },
    }));

    await act(async () => {
      capturedParams!.onEvent({
        type: 'sendViral',
        data: { rewardAmount: 1, rewardUnit: 'PRO 1일권' },
      });
    });

    await waitFor(() => expect(mockGrantContactsViralProDayPass).toHaveBeenCalledTimes(1));
    expect(mockGrantContactsViralProDayPass).toHaveBeenCalledWith({
      module_id: 'module-1',
      reward_amount: 1,
      reward_unit: 'PRO 1일권',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['subscription'] });
    expect(onGranted).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalled();
  });

  it('closeReason=noReward면 지급 API를 호출하지 않는다', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useContactsViralReward({ moduleId: 'module-1' }),
      { wrapper },
    );

    act(() => {
      result.current.startContactsViralReward();
      capturedParams!.onEvent({
        type: 'close',
        data: { closeReason: 'noReward', sentRewardsCount: 0 },
      });
    });

    expect(mockGrantContactsViralProDayPass).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('받을 리워드가 없어요', expect.any(String));
    expect(cleanup).toHaveBeenCalled();
  });

  it('contactsViral 미지원이면 일반 공유 fallback만 실행한다', () => {
    mockIsMinVersionSupported.mockReturnValue(false);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useContactsViralReward({ moduleId: 'module-1' }),
      { wrapper },
    );

    act(() => {
      result.current.startContactsViralReward();
    });

    expect(mockContactsViral).not.toHaveBeenCalled();
    expect(mockGrantContactsViralProDayPass).not.toHaveBeenCalled();
    expect(Share.share).toHaveBeenCalledWith({
      message: '테일로그에서 AI 코칭과 훈련 플랜을 확인해보세요.',
    });
  });
});
