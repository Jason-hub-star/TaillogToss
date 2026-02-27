/**
 * OpsBottomInfo — 총 건수 / 오늘 처리율
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OpsBottomInfoProps {
  totalCount: number;
  completedCount: number;
}

export function OpsBottomInfo({ totalCount, completedCount }: OpsBottomInfoProps) {
  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        총 {totalCount}건 / 오늘 완료 {completedCount}건 ({rate}%)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
    backgroundColor: '#FAFAFA',
  },
  text: {
    fontSize: 13,
    color: '#8B95A1',
    textAlign: 'center',
  },
});
