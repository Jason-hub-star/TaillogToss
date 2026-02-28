/**
 * DogCard — 대시보드 상단 활성 반려견 프로필 카드
 * 이름, 품종, 오늘 기록 건수 표시
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Dog } from 'types/dog';

type DashboardDog = Pick<Dog, 'id' | 'name' | 'breed'>;

export interface DogCardProps {
  dog: DashboardDog;
  todayLogCount: number;
  onPress?: () => void;
}

export function DogCard({ dog, todayLogCount, onPress }: DogCardProps) {
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
    borderBottomColor: '#E5E8EB',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4F4F5',
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
    fontSize: 17,
    fontWeight: '600',
    color: '#202632',
  },
  arrow: {
    fontSize: 14,
    color: '#8B95A1',
    marginLeft: 4,
  },
  breed: {
    fontSize: 13,
    color: '#8B95A1',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#E8F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    color: '#0064FF',
    fontWeight: '600',
  },
});
