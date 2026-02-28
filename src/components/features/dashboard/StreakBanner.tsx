/**
 * StreakBanner — 연속 기록일 배너 (대시보드 상단)
 * 기록 데이터로 연속일 계산하여 동기 부여 표시
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BehaviorLog } from 'types/log';

export interface StreakBannerProps {
  logs: BehaviorLog[];
  streakOverride?: number;
}

/** 연속 기록일 계산 — 오늘부터 역산 */
function calcStreak(logs: BehaviorLog[]): number {
  if (logs.length === 0) return 0;

  const logDates = new Set(
    logs.map((l) => new Date(l.occurred_at).toISOString().slice(0, 10))
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    if (logDates.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function StreakBanner({ logs, streakOverride }: StreakBannerProps) {
  const streak = streakOverride ?? calcStreak(logs);

  if (streak === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{'\uD83D\uDD25'}</Text>
      <Text style={styles.text}>
        <Text style={styles.count}>{streak}일</Text> 연속 기록 중!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
  },
  emoji: {
    fontSize: 18,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    color: '#4E5968',
  },
  count: {
    fontWeight: '700',
    color: '#FF6B35',
  },
});
