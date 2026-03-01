/**
 * DogCard — 대시보드 상단 활성 반려견 프로필 카드
 * 이름, 품종, 오늘 기록 건수 표시
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Dog } from 'types/dog';
import { colors, typography } from 'styles/tokens';

type DashboardDog = Pick<Dog, 'id' | 'name' | 'breed'>;

export interface DogCardProps {
  dog: DashboardDog;
  todayLogCount: number;
  onPress?: () => void;
  onSwitchPress?: () => void;
}

export function DogCard({ dog, todayLogCount, onPress, onSwitchPress }: DogCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{'\uD83D\uDC36'}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{dog.name}</Text>
          <Text style={styles.arrow}>{'\u25B8'}</Text>
        </View>
        <Text style={styles.breed}>{dog.breed}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>오늘 {todayLogCount}건</Text>
      </View>
      {onSwitchPress && (
        <TouchableOpacity style={styles.switchBtn} onPress={onSwitchPress} activeOpacity={0.7}>
          <Text style={styles.switchIcon}>{'\u21C5'}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  arrow: {
    ...typography.detail,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  breed: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.blue50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  switchBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  switchIcon: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
