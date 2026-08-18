/**
 * RewardedAdButton — 토스 Ads SDK 2.0 보상형 광고 버튼
 * R1(survey-result), R2(dashboard), R3(coaching-result) 터치포인트
 * useRewardedAd 훅으로 라이프사이클 관리
 * Parity: AD-001
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import type { AdPlacement } from 'types/ads';
import { useRewardedAd } from 'lib/hooks/useRewardedAd';
import { colors, typography } from 'styles/tokens';

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

  if (adState === 'rewarded') {
    return null;
  }

  const isLoading = adState === 'loading' || adState === 'showing';
  const ctaLabel = adState === 'error' || adState === 'no_fill' ? '광고 다시 시도' : label;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={showAd}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.icon}>{'\uD83C\uDFAC'}</Text>
          <Text style={styles.label}>{ctaLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.orange700,
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
    ...typography.label,
    marginRight: 8,
  },
  label: {
    color: colors.white,
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
