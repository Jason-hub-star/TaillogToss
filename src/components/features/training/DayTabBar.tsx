/**
 * Day 선택 탭 바 — Day 1~N 가로 스크롤 탭
 * Parity: UI-001
 */
import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from 'styles/tokens';
import type { TrainingDay } from 'types/training';

interface Props {
  days: TrainingDay[];
  selectedDay: number;
  onSelect: (dayNumber: number) => void;
}

export function DayTabBar({ days, selectedDay, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {days.map((day) => {
        const isActive = day.day_number === selectedDay;
        return (
          <TouchableOpacity
            key={day.day_number}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(day.day_number)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {day.day_number}일차
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 20,
  },
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.divider,
  },
  tabActive: {
    backgroundColor: colors.primaryBlue,
  },
  tabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
});
