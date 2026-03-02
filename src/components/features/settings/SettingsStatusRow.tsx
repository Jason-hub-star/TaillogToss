import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from 'styles/tokens';

interface SettingsStatusRowProps {
  statusText: string;
  tone?: 'neutral' | 'success' | 'danger';
}

export function SettingsStatusRow({ statusText, tone = 'neutral' }: SettingsStatusRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>동기화 상태</Text>
      <Text style={[styles.value, tone === 'success' && styles.success, tone === 'danger' && styles.danger]}>
        {statusText}
      </Text>
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
  },
  label: {
    ...typography.label,
    color: colors.grey950,
  },
  value: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  success: { color: colors.green700 },
  danger: { color: colors.red600 },
});
