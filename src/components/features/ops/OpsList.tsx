/**
 * OpsList — FlatList 래퍼 (40마리 성능 최적화 핵심)
 * Parity: B2B-001
 */
import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet, ActivityIndicator } from 'react-native';
import { OpsListItem, type OpsItem } from './OpsListItem';

const ITEM_HEIGHT = 69; // row height (14+40+14 padding + 1 border)

interface OpsListProps {
  items: OpsItem[];
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onItemPress: (item: OpsItem) => void;
  onItemLongPress?: (item: OpsItem) => void;
  ListEmptyComponent?: React.ReactElement;
}

export function OpsList({
  items,
  isLoading,
  selectedIds,
  onItemPress,
  onItemLongPress,
  ListEmptyComponent,
}: OpsListProps) {
  const renderItem = useCallback(
    ({ item }: { item: OpsItem }) => (
      <OpsListItem
        item={item}
        isSelected={selectedIds?.has(item.orgDogId)}
        onPress={onItemPress}
        onLongPress={onItemLongPress}
      />
    ),
    [selectedIds, onItemPress, onItemLongPress]
  );

  const keyExtractor = useCallback((item: OpsItem) => item.orgDogId, []);

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0064FF" />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
      ListEmptyComponent={ListEmptyComponent}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
