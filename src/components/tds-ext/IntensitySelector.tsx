/**
 * IntensitySelector — 1~10 강도 선택 + 좌우 스와이프 조절
 * Parity: LOG-001
 */
import React, { useCallback, useMemo } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { IntensityLevel } from 'types/log';
import { colors, spacing, typography } from 'styles/tokens';

export interface IntensitySelectorProps {
  value: IntensityLevel;
  onChange: (value: IntensityLevel) => void;
  label?: string;
  min?: IntensityLevel;
  max?: IntensityLevel;
  disabled?: boolean;
  showSwipeHint?: boolean;
  testID?: string;
}

const ALL_LEVELS: IntensityLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SWIPE_THRESHOLD = 24;

function toIntensityLevel(value: number, min: IntensityLevel, max: IntensityLevel): IntensityLevel {
  const clamped = Math.min(max, Math.max(min, Math.round(value)));
  return clamped as IntensityLevel;
}

export function IntensitySelector({
  value,
  onChange,
  label = '강도',
  min = 1,
  max = 10,
  disabled = false,
  showSwipeHint = true,
  testID,
}: IntensitySelectorProps) {
  const levels = useMemo(() => ALL_LEVELS.filter((level) => level >= min && level <= max), [min, max]);

  const setLevel = useCallback((nextValue: number) => {
    if (disabled) return;
    const next = toIntensityLevel(nextValue, min, max);
    if (next !== value) onChange(next);
  }, [disabled, max, min, onChange, value]);

  const handleSwipe = useCallback((deltaX: number) => {
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    setLevel(value + (deltaX > 0 ? 1 : -1));
  }, [setLevel, value]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      !disabled
      && Math.abs(gestureState.dx) > 12
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2
    ),
    onPanResponderRelease: (_, gestureState) => handleSwipe(gestureState.dx),
    onPanResponderTerminate: (_, gestureState) => handleSwipe(gestureState.dx),
  }), [disabled, handleSwipe]);

  return (
    <View
      style={[styles.container, disabled && styles.disabled]}
      testID={testID}
      {...panResponder.panHandlers}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}: {value}</Text>
        {showSwipeHint ? <Text style={styles.hint}>좌우로 조절</Text> : null}
      </View>
      <View style={styles.row}>
        {levels.map((level) => {
          const selected = level === value;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setLevel(level)}
              disabled={disabled}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${label} ${level}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{level}</Text>
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.detail,
    color: colors.grey700,
    fontWeight: '600',
  },
  hint: {
    ...typography.badge,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.divider,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 36,
    justifyContent: 'center',
    minWidth: 0,
  },
  chipSelected: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  chipText: {
    ...typography.caption,
    color: colors.grey700,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.white,
  },
});
