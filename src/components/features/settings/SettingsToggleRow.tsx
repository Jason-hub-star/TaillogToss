import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { colors, typography } from 'styles/tokens';

interface SettingsToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function SettingsToggleRow({
  label,
  description,
  value,
  onToggle,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={[styles.rowLabel, disabled && styles.disabledText]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, disabled && styles.disabledText]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primaryBlue }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  textWrap: { flex: 1, paddingRight: 12 },
  rowLabel: { ...typography.label, color: colors.grey950 },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disabledText: { color: colors.textSecondary },
});
