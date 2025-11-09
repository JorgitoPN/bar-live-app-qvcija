
import React from 'react';
import { FlatList, View, StyleSheet, Text } from 'react-native';
import TarjetaLocal from './TarjetaLocal';
import { Local } from '@/types';
import { colors } from '@/styles/commonStyles';

interface VirtualizedLocalListProps {
  locales: Local[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
}

export default function VirtualizedLocalList({
  locales,
  onRefresh,
  refreshing = false,
  onEndReached,
  ListHeaderComponent,
  ListEmptyComponent,
}: VirtualizedLocalListProps) {
  const renderItem = ({ item, index }: { item: Local; index: number }) => (
    <View style={[styles.itemContainer, index % 2 === 0 ? styles.leftItem : styles.rightItem]}>
      <TarjetaLocal local={item} />
    </View>
  );

  const defaultEmptyComponent = (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No se encontraron locales</Text>
      <Text style={styles.emptySubtext}>Intenta ajustar los filtros</Text>
    </View>
  );

  return (
    <FlatList
      data={locales}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent || defaultEmptyComponent}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    flex: 1,
  },
  leftItem: {
    marginRight: 8,
  },
  rightItem: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
