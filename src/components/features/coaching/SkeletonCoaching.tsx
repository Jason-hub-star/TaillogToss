/**
 * SkeletonCoaching — 6블록 코칭 결과 스켈레톤
 * AI 코칭 결과 로딩 중 레이아웃 구조 유지
 * Parity: AI-001
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { colors } from 'styles/tokens';

export function SkeletonCoaching() {
  return (
    <View style={styles.container}>
      {/* 날짜 헤더 */}
      <View style={styles.header}>
        <SkeletonBox width={80} height={24} borderRadius={8} />
        <SkeletonBox width={100} height={16} borderRadius={4} />
      </View>

      {/* 6블록 스켈레톤 */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.block}>
          <SkeletonBox width={120} height={18} borderRadius={4} />
          <SkeletonBox width="100%" height={14} borderRadius={4} style={styles.lineGap} />
          <SkeletonBox width="85%" height={14} borderRadius={4} style={styles.lineGap} />
          <SkeletonBox width="70%" height={14} borderRadius={4} style={styles.lineGap} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  block: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  lineGap: {
    marginTop: 8,
  },
});
