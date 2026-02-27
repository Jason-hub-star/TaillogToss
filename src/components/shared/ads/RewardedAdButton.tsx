/**
 * RewardedAdButton — 토스 Ads SDK 2.0 보상형 광고 버튼
 * R1(survey-result), R2(dashboard), R3(coaching-result) 터치포인트
 * useRewardedAd 훅으로 라이프사이클 관리, 실패 시 무광고 폴백
 * Parity: AD-001
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import type { AdPlacement } from 'types/ads';
import { useRewardedAd } from 'lib/hooks/useRewardedAd';

export interface RewardedAdButtonProps {
  placement: AdPlacement;
  label?: string;
  onRewarded: () => void;
  onError?: () => void;
}

export function RewardedAdButton({
  placement,
  label = '광고 보고 잠금 해제',
  onRewarded,
  onError,
}: RewardedAdButtonProps) {
  const { adState, showAd } = useRewardedAd(placement, onRewarded, onError);

  if (adState === 'rewarded' || adState === 'no_fill') {
    return null;
  }

  const isLoading = adState === 'loading' || adState === 'showing';

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={showAd}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.icon}>{'\uD83C\uDFAC'}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
