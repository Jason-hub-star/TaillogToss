/**
 * InviteSheet — 직원 초대 바텀시트
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import type { OrgMemberRole } from 'types/b2b';

const ROLE_OPTIONS: { key: OrgMemberRole; label: string }[] = [
  { key: 'staff', label: '직원' },
  { key: 'manager', label: '관리자' },
  { key: 'viewer', label: '열람자' },
];

interface InviteSheetProps {
  onInvite: (userId: string, role: OrgMemberRole) => void;
  onClose: () => void;
}

export function InviteSheet({ onInvite, onClose }: InviteSheetProps) {
  const [userId, setUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>('staff');

  const handleInvite = useCallback(() => {
    if (userId.trim()) {
      onInvite(userId.trim(), selectedRole);
    }
  }, [userId, selectedRole, onInvite]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>직원 초대</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeBtn}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>사용자 ID</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          placeholder="초대할 사용자 ID 입력"
          autoCapitalize="none"
        />

        <Text style={styles.label}>역할</Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.roleChip, selectedRole === opt.key && styles.roleChipActive]}
              onPress={() => setSelectedRole(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.roleText, selectedRole === opt.key && styles.roleTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.inviteBtn, !userId.trim() && styles.inviteBtnDisabled]}
          onPress={handleInvite}
          disabled={!userId.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.inviteBtnText}>초대</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E8EB',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#202632' },
  closeBtn: { fontSize: 20, color: '#8B95A1', padding: 4 },
  body: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E5E8EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 20,
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#F4F4F5', borderWidth: 1, borderColor: '#E5E8EB',
  },
  roleChipActive: { backgroundColor: '#EFF6FF', borderColor: '#0064FF' },
  roleText: { fontSize: 14, color: '#6B7280' },
  roleTextActive: { color: '#0064FF', fontWeight: '600' },
  footer: { padding: 20 },
  inviteBtn: {
    backgroundColor: '#0064FF', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  inviteBtnDisabled: { opacity: 0.5 },
  inviteBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
