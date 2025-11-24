
import React, { memo, useCallback } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
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

// ✅ ULTRA-OPTIMIZED: Memoized feed with aggressive performance optimizations
const FeedSocial = memo(function FeedSocial({
  posts,
  onRefresh,
  refreshing = false,
  onEndReached,
  ListHeaderComponent,
}: FeedSocialProps) {
  // ✅ Memoized render function to prevent recreation
  const renderItem = useCallback(({ item }: { item: Post }) => (
    <PublicacionCard post={item} />
  ), []);

  // ✅ Memoized key extractor
  const keyExtractor = useCallback((item: Post) => item.id, []);

  // ✅ CRITICAL: Optimized item layout for instant scrolling
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 500,
    offset: 500 * index,
    index,
  }), []);

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      // ✅ ULTRA-PERFORMANCE OPTIMIZATIONS
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50}
      initialNumToRender={5}
      windowSize={10}
      getItemLayout={getItemLayout}
      extraData={posts.length}
      // ✅ CRITICAL: Disable nested scrolling for better performance
      nestedScrollEnabled={false}
      // ✅ Fast scroll indicator
      persistentScrollbar={false}
    />
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better memoization
  return (
    prevProps.posts.length === nextProps.posts.length &&
    prevProps.refreshing === nextProps.refreshing &&
    prevProps.posts[0]?.id === nextProps.posts[0]?.id
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
});

export default FeedSocial;
