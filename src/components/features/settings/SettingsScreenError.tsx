import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ErrorState } from 'components/tds-ext';
import { colors } from 'styles/tokens';

interface SettingsScreenErrorProps {
  onRetry: () => void;
}

export function SettingsScreenError({ onRetry }: SettingsScreenErrorProps) {
  return (
    <View style={styles.container}>
      <ErrorState
        title="설정 정보를 불러오지 못했어요"
        description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
        onRetry={onRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
  },
});
