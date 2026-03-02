import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, typography } from 'styles/tokens';

interface SettingsNavRowProps {
  label: string;
  onPress: () => void;
  rightLabel?: string;
  disabled?: boolean;
}

export function SettingsNavRow({
  label,
  onPress,
  rightLabel,
  disabled = false,
}: SettingsNavRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled}
    >
      <Text style={[styles.rowLabel, disabled && styles.disabledText]}>{label}</Text>
      <View style={styles.rightWrap}>
        {rightLabel ? <Text style={styles.rightLabel}>{rightLabel}</Text> : null}
        <Text style={styles.chevron}>{'›'}</Text>
      </View>
    </TouchableOpacity>
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
  },
  rowLabel: { ...typography.label, color: colors.grey950, flex: 1, paddingRight: 12 },
  disabledText: { color: colors.textSecondary },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chevron: { ...typography.sectionTitle, color: colors.textSecondary },
});
