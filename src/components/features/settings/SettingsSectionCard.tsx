import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from 'styles/tokens';

interface SettingsSectionCardProps {
  title: string;
  children: ReactNode;
}

export function SettingsSectionCard({ title, children }: SettingsSectionCardProps) {
  return (
    <View>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.section}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceTertiary,
  },
});
