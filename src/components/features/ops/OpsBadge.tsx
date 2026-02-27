/**
 * OpsBadge — Ops 큐 상태 Badge (긴급/주의/일반/대기/완료)
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type OpsStatus = 'urgent' | 'warning' | 'normal' | 'pending' | 'done';

interface OpsBadgeProps {
  status: OpsStatus;
}

const STATUS_CONFIG: Record<OpsStatus, { label: string; bg: string; color: string }> = {
  urgent: { label: '긴급', bg: '#FEE2E2', color: '#DC2626' },
  warning: { label: '주의', bg: '#FEF3C7', color: '#D97706' },
  normal: { label: '일반', bg: '#DBEAFE', color: '#2563EB' },
  pending: { label: '대기', bg: '#F3F4F6', color: '#6B7280' },
  done: { label: '완료', bg: '#D1FAE5', color: '#059669' },
};

export function OpsBadge({ status }: OpsBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
