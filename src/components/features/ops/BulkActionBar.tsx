/**
 * BulkActionBar — 벌크 모드 상단 바 (선택 건수 + 일괄 저장 CTA)
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkRecord: () => void;
  onCancel: () => void;
}

export function BulkActionBar({ selectedCount, onBulkRecord, onCancel }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelText}>취소</Text>
      </TouchableOpacity>
      <Text style={styles.countText}>{selectedCount}마리 선택</Text>
      <TouchableOpacity style={styles.bulkBtn} onPress={onBulkRecord} activeOpacity={0.8}>
        <Text style={styles.bulkBtnText}>일괄 기록</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  cancelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0064FF',
  },
  bulkBtn: {
    backgroundColor: '#0064FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
