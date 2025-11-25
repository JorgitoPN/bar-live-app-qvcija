
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import OptimizedPublicacionCard from './OptimizedPublicacionCard';
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
    <OptimizedPublicacionCard post={item} />
  ), []);

  // ✅ Memoized key extractor
  const keyExtractor = useCallback((item: Post) => item.id, []);

  // ✅ CRITICAL: Optimized item layout for instant scrolling
  // Dynamic height estimation based on content
  const getItemLayout = useCallback((data: any, index: number) => {
    const item = data?.[index];
    const hasImages = item?.imagenes?.length > 0 || item?.imagen;
    const hasContent = item?.contenido?.length > 0;
    
    // Estimate height based on content
    let estimatedHeight = 80; // Header
    if (hasContent) estimatedHeight += 60; // Content
    if (hasImages) estimatedHeight += 400; // Images
    estimatedHeight += 60; // Actions
    
    return {
      length: estimatedHeight,
      offset: estimatedHeight * index,
      index,
    };
  }, []);

  // ✅ Memoize posts to prevent unnecessary re-renders
  const memoizedPosts = useMemo(() => posts, [posts.length, posts[0]?.id]);

  return (
    <FlatList
      data={memoizedPosts}
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
      maxToRenderPerBatch={3}
      updateCellsBatchingPeriod={100}
      initialNumToRender={3}
      windowSize={5}
      getItemLayout={getItemLayout}
      // ✅ CRITICAL: Disable nested scrolling for better performance
      nestedScrollEnabled={false}
      // ✅ Fast scroll indicator
      persistentScrollbar={false}
      // ✅ Optimize memory usage
      legacyImplementation={false}
      // ✅ Reduce overdraw
      drawDistance={500}
    />
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better memoization
  return (
    prevProps.posts.length === nextProps.posts.length &&
    prevProps.refreshing === nextProps.refreshing &&
    prevProps.posts[0]?.id === nextProps.posts[0]?.id &&
    prevProps.posts[prevProps.posts.length - 1]?.id === nextProps.posts[nextProps.posts.length - 1]?.id
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
});

export default FeedSocial;
