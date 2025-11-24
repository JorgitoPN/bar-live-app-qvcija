
import React, { memo } from 'react';
import { FlatList, View, StyleSheet, RefreshControl } from 'react-native';
import PublicacionCard from './PublicacionCard';
import { Post } from '@/types';
import { colors } from '@/styles/commonStyles';

interface FeedSocialProps {
  posts: Post[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ReactElement;
}

// Memoized to prevent unnecessary re-renders
const FeedSocial = memo(function FeedSocial({
  posts,
  onRefresh,
  refreshing = false,
  onEndReached,
  ListHeaderComponent,
}: FeedSocialProps) {
  const renderItem = ({ item }: { item: Post }) => (
    <PublicacionCard post={item} />
  );

  // Performance optimization: Use item ID as key
  const keyExtractor = (item: Post) => item.id;

  // Performance optimization: Calculate item layout for better scrolling
  const getItemLayout = (_: any, index: number) => ({
    length: 500, // Approximate height of a post
    offset: 500 * index,
    index,
  });

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      // PERFORMANCE OPTIMIZATIONS
      removeClippedSubviews={true}
      maxToRenderPerBatch={3}
      updateCellsBatchingPeriod={100}
      initialNumToRender={3}
      windowSize={5}
      getItemLayout={getItemLayout}
      // Reduce re-renders
      extraData={posts.length}
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
});

export default FeedSocial;
