/**
 * OpsListItem — Ops 큐 개별 아이템 (강아지/보호자/상태/담당자)
 * Parity: B2B-001
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OpsBadge, type OpsStatus } from './OpsBadge';

export interface OpsItem {
  orgDogId: string;
  dogName: string;
  parentName: string | null;
  trainerName: string | null;
  status: OpsStatus;
  lastLogTime: string | null;
  todayLogCount: number;
  hasReport: boolean;
  dogId: string;
}

interface OpsListItemProps {
  item: OpsItem;
  isSelected?: boolean;
  onPress: (item: OpsItem) => void;
  onLongPress?: (item: OpsItem) => void;
}

function OpsListItemInner({ item, isSelected, onPress, onLongPress }: OpsListItemProps) {
  return (
    <TouchableOpacity
      style={[styles.row, isSelected && styles.selected]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{'\uD83D\uDC36'}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.dogName} numberOfLines={1}>{item.dogName}</Text>
          {item.parentName && (
            <Text style={styles.parentName} numberOfLines={1}> / {item.parentName}</Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.meta}>
            {item.todayLogCount > 0 ? `오늘 ${item.todayLogCount}건` : '미기록'}
          </Text>
          {item.trainerName && (
            <Text style={styles.trainer}>{item.trainerName}</Text>
          )}
        </View>
      </View>
      <OpsBadge status={item.status} />
    </TouchableOpacity>
  );
}

export const OpsListItem = memo(OpsListItemInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F5',
  },
  selected: {
    backgroundColor: '#EFF6FF',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dogName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202632',
  },
  parentName: {
    fontSize: 13,
    color: '#8B95A1',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: '#8B95A1',
  },
  trainer: {
    fontSize: 12,
    color: '#0064FF',
    marginLeft: 8,
  },
});
