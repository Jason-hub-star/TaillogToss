import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from 'styles/tokens';

interface SettingsPermissionBannerProps {
  onOpenSettings: () => void;
}

export function SettingsPermissionBanner({ onOpenSettings }: SettingsPermissionBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>알림 권한 안내</Text>
      <Text style={styles.description}>
        토글이 켜져 있어도 기기 권한이 꺼져 있으면 알림이 오지 않을 수 있어요.
      </Text>
      <TouchableOpacity onPress={onOpenSettings} activeOpacity={0.7}>
        <Text style={styles.action}>기기 설정 열기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.blue900,
    marginBottom: 4,
  },
  description: {
    ...typography.caption,
    color: colors.textDark,
    marginBottom: 8,
  },
  action: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
  },
});
