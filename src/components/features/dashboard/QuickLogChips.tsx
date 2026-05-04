/**
 * QuickLogChips — 빠른 기록 카테고리 Chip 그리드 (8행동 + 6일상)
 * 원탭 = 해당 카테고리로 즉시 기록 (intensity=3 기본값)
 * Parity: UI-001, LOG-001
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { QuickLogCategory, DailyActivityCategory } from 'types/log';
import { colors, typography, spacing } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';

/** 행동 카테고리 라벨 매핑 */
const BEHAVIOR_CHIPS: { key: QuickLogCategory; label: string; icon: string }[] = [
  { key: 'barking', label: '짖음/울음', icon: ICONS['ic-cat-barking']! },
  { key: 'aggression', label: '공격성', icon: ICONS['ic-cat-aggression']! },
  { key: 'anxiety', label: '분리불안', icon: ICONS['ic-cat-anxiety']! },
  { key: 'destructive', label: '파괴행동', icon: ICONS['ic-cat-destructive']! },
  { key: 'biting', label: '마운팅', icon: ICONS['ic-cat-mounting']! },
  { key: 'jumping', label: '과잉흥분', icon: ICONS['ic-cat-excitement']! },
  { key: 'pulling', label: '배변문제', icon: ICONS['ic-cat-toilet']! },
  { key: 'other_behavior', label: '공포/회피', icon: ICONS['ic-cat-fear']! },
];

/** 일상 활동 카테고리 라벨 매핑 */
const ACTIVITY_CHIPS: { key: DailyActivityCategory; label: string; icon: string }[] = [
  { key: 'walk', label: '산책', icon: ICONS['ic-cat-walk']! },
  { key: 'meal', label: '식사', icon: ICONS['ic-cat-meal']! },
  { key: 'training', label: '훈련', icon: ICONS['ic-cat-train']! },
  { key: 'play', label: '놀이', icon: ICONS['ic-cat-play']! },
  { key: 'rest', label: '휴식', icon: ICONS['ic-cat-rest']! },
  { key: 'grooming', label: '그루밍', icon: ICONS['ic-cat-grooming']! },
];

export interface QuickLogChipsProps {
  onSelectBehavior: (category: QuickLogCategory) => void;
  onSelectActivity: (category: DailyActivityCategory) => void;
  selectedKeys?: string[];
}

export function QuickLogChips({ onSelectBehavior, onSelectActivity, selectedKeys = [] }: QuickLogChipsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>행동 문제 (복수 선택 가능)</Text>
      <View style={styles.chipRow}>
        {BEHAVIOR_CHIPS.map((chip) => {
          const isSelected = selectedKeys.includes(chip.key);
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.iconChip, isSelected && styles.iconChipSelected]}
              onPress={() => onSelectBehavior(chip.key)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: chip.icon }} style={styles.chipIcon} />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>일상 활동</Text>
      <View style={styles.chipRow}>
        {ACTIVITY_CHIPS.map((chip) => {
          const isSelected = selectedKeys.includes(chip.key);
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.iconChip, isSelected && styles.iconChipSelected]}
              onPress={() => onSelectActivity(chip.key)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: chip.icon }} style={styles.chipIcon} />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export { BEHAVIOR_CHIPS, ACTIVITY_CHIPS };

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconChip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.divider,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  iconChipSelected: {
    backgroundColor: colors.primaryBlue,
  },
  chipIcon: {
    width: 24,
    height: 24,
  },
  chipText: {
    ...typography.badge,
    color: colors.grey700,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
});
