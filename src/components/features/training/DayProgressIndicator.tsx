/**
 * Day 진행 상태 인디케이터 — "Day X / Y" 텍스트 + 프로그레스 바
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from 'styles/tokens';

interface Props {
  selectedDay: number;
  totalDays: number;
}

export function DayProgressIndicator({ selectedDay, totalDays }: Props) {
  const progress = totalDays > 0 ? (selectedDay / totalDays) * 100 : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {selectedDay}일차 / 총 {totalDays}일
      </Text>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  bar: {
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primaryBlue,
    borderRadius: 2,
  },
});
