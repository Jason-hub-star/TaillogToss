/**
 * OccurrenceSelector — 빠른 기록 횟수 프리셋 선택
 * Parity: LOG-001
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from 'styles/tokens';

export interface OccurrenceValue {
  count: number;
  isMinimum: boolean;
}

export interface OccurrenceSelectorProps {
  value: OccurrenceValue;
  onChange: (value: OccurrenceValue) => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
}

const PRESETS: OccurrenceValue[] = [
  { count: 1, isMinimum: false },
  { count: 2, isMinimum: false },
  { count: 3, isMinimum: true },
  { count: 5, isMinimum: true },
  { count: 10, isMinimum: true },
];

function formatOccurrence(count: number, isMinimum?: boolean): string {
  return `${count}회${isMinimum ? ' 이상' : ''}`;
}

function isSameValue(a: OccurrenceValue, b: OccurrenceValue): boolean {
  return a.count === b.count && a.isMinimum === b.isMinimum;
}

export function OccurrenceSelector({
  value,
  onChange,
  label = '횟수',
  disabled = false,
  testID,
}: OccurrenceSelectorProps) {
  return (
    <View style={[styles.container, disabled && styles.disabled]} testID={testID}>
      <Text style={styles.label}>{label}: {formatOccurrence(value.count, value.isMinimum)}</Text>
      <View style={styles.row}>
        {PRESETS.map((preset) => {
          const selected = isSameValue(value, preset);
          return (
            <TouchableOpacity
              key={`${preset.count}-${preset.isMinimum ? 'min' : 'exact'}`}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(preset)}
              disabled={disabled}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${label} ${formatOccurrence(preset.count, preset.isMinimum)}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {formatOccurrence(preset.count, preset.isMinimum)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.detail,
    color: colors.grey700,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.divider,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  chipText: {
    ...typography.detail,
    color: colors.grey700,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.white,
  },
});
