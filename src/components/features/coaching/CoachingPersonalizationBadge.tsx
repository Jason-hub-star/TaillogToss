/**
 * CoachingPersonalizationBadge — 코칭 기반 정보 안내 배지
 * "강아지 이름의 기록 기반으로 코칭해요" 토스 감성 안내
 * Parity: AI-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';

interface Props {
  dogName: string;
  hasUserContext: boolean;
}

export function CoachingPersonalizationBadge({ dogName, hasUserContext }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.paw}>🐾</Text>
      <Text style={styles.text}>
        {hasUserContext
          ? `${dogName}의 기록 + 오늘 상황 반영해서 코칭해요`
          : `${dogName}의 최근 기록을 바탕으로 코칭해요`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.aiSectionBg,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    gap: 5,
  },
  paw: {
    fontSize: 13,
  },
  text: {
    ...typography.caption,
    color: colors.blue800,
    fontWeight: '600',
    flex: 1,
  },
});
