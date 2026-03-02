import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from 'styles/tokens';

interface SettingsStepperRowProps {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function SettingsStepperRow({
  label,
  value,
  onDecrease,
  onIncrease,
  disabled = false,
}: SettingsStepperRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, disabled && styles.disabledButton]}
          onPress={onDecrease}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        <Text style={[styles.value, disabled && styles.disabledText]}>{formatHour(value)}</Text>
        <TouchableOpacity
          style={[styles.button, disabled && styles.disabledButton]}
          onPress={onIncrease}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  label: {
    ...typography.label,
    color: colors.grey950,
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.body,
    color: colors.grey950,
    fontWeight: '600',
    lineHeight: 22,
  },
  value: {
    ...typography.bodySmall,
    color: colors.grey950,
    minWidth: 48,
    textAlign: 'center',
  },
  disabledText: {
    color: colors.textSecondary,
  },
});
