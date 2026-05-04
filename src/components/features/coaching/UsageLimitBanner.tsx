/**
 * UsageLimitBanner — 일일 코칭 한도 도달 안내
 * 재사용처: CoachingDetailContent, ask_coach 등 사용량 제한이 있는 기능
 * Parity: AI-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';

interface UsageLimitBannerProps {
  isPro: boolean;
  limit: number;
}

export function UsageLimitBanner({ isPro, limit }: UsageLimitBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>⏰</Text>
      <Text style={styles.text}>
        {isPro
          ? `오늘 ${limit}회 사용 완료. 내일 다시 가능해요!`
          : '무료 한도 도달. Pro 구독으로 하루 10회 사용 가능'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange50,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    ...typography.caption,
    color: colors.orange700,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
});
