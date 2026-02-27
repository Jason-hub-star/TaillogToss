/**
 * MemberList — 조직 직원 목록 + 초대 버튼
 * Parity: B2B-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { OrgMember } from 'types/b2b';

const ROLE_LABELS: Record<string, string> = {
  owner: '대표',
  manager: '관리자',
  staff: '직원',
  viewer: '열람자',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '초대 대기', color: '#D97706' },
  active: { label: '활성', color: '#059669' },
  deactivated: { label: '비활성', color: '#DC2626' },
};

interface MemberListProps {
  members: OrgMember[];
  onInvite: () => void;
}

export function MemberList({ members, onInvite }: MemberListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>직원 ({members.length}명)</Text>
        <TouchableOpacity onPress={onInvite} activeOpacity={0.7}>
          <Text style={styles.inviteBtn}>+ 초대</Text>
        </TouchableOpacity>
      </View>

      {members.map((member) => {
        const fallback = { label: '초대 대기', color: '#D97706' };
        const statusConfig = STATUS_LABELS[member.status] ?? fallback;
        return (
          <View key={member.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.userId}>{member.user_id.slice(0, 8)}...</Text>
              <Text style={styles.role}>{ROLE_LABELS[member.role] ?? member.role}</Text>
            </View>
            <Text style={[styles.status, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#202632' },
  inviteBtn: { fontSize: 14, fontWeight: '600', color: '#0064FF' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F3F5',
  },
  info: { flex: 1 },
  userId: { fontSize: 14, color: '#202632', fontWeight: '500' },
  role: { fontSize: 12, color: '#8B95A1', marginTop: 2 },
  status: { fontSize: 12, fontWeight: '600' },
});
