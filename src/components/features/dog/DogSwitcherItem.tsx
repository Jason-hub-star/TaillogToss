/**
 * DogSwitcherItem — 반려견 전환 목록 아이템
 * 아바타 + 이름 + 견종 + 활성 표시 체크
 * Parity: APP-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Dog } from 'types/dog';
import { colors, typography } from 'styles/tokens';

interface Props {
  dog: Dog;
  isActive: boolean;
  onPress: () => void;
}

export function DogSwitcherItem({ dog, isActive, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, isActive && styles.rowActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{'\uD83D\uDC36'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, isActive && styles.nameActive]}>{dog.name}</Text>
        <Text style={styles.breed}>{dog.breed}</Text>
      </View>
      {isActive && (
        <View style={styles.check}>
          <Text style={styles.checkIcon}>{'\u2713'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: {
    backgroundColor: colors.blue50,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryBlue,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  nameActive: {
    fontWeight: '700',
  },
  breed: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: colors.white,
    ...typography.detail,
    fontWeight: '700',
  },
});
