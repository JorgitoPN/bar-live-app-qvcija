
import React, { memo, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { colors } from '@/styles/commonStyles';
import PublicacionCard from './PublicacionCard';
import type { Publicacion } from '@/types';

interface FeedSocialProps {
  posts: Publicacion[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

// ✅ FIXED: Extracted complex expression to separate variable and added posts to dependency array
const FeedSocial = memo(function FeedSocial({
  posts,
  onRefresh,
  refreshing = false,
  onEndReached,
  ListHeaderComponent,
}: FeedSocialProps) {
  // ✅ Extract complex expressions
  const postsLength = posts.length;
  const firstPostId = posts[0]?.id;
  
  // ✅ Memoize posts to prevent unnecessary re-renders
  const memoizedPosts = useMemo(() => posts, [posts, postsLength, firstPostId]);

  const renderItem = ({ item }: { item: Publicacion }) => (
    <PublicacionCard publicacion={item} />
  );

  const keyExtractor = (item: Publicacion) => item.id;

  return (
    <View style={styles.container}>
      <FlatList
        data={memoizedPosts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={ListHeaderComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={5}
        windowSize={10}
      />
    </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default FeedSocial;
