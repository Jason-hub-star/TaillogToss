import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { colors } from 'styles/tokens';

export function SettingsScreenSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBox width={96} height={14} borderRadius={4} />
      <SkeletonBox width="100%" height={156} borderRadius={12} style={styles.gapSmall} />
      <SkeletonBox width={80} height={14} borderRadius={4} style={styles.gapLarge} />
      <SkeletonBox width="100%" height={162} borderRadius={12} style={styles.gapSmall} />
      <SkeletonBox width={96} height={14} borderRadius={4} style={styles.gapLarge} />
      <SkeletonBox width="100%" height={128} borderRadius={12} style={styles.gapSmall} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: colors.surfaceTertiary,
  },
  gapSmall: { marginTop: 10 },
  gapLarge: { marginTop: 24 },
});
