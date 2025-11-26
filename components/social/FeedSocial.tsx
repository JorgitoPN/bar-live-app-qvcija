
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
  // ✅ CRITICAL FIX: Filter out undefined/null posts before rendering
  const validPosts = useMemo(() => {
    const filtered = posts.filter(post => post && post.id);
    if (filtered.length !== posts.length) {
      console.warn('[FeedSocial] Filtered out', posts.length - filtered.length, 'invalid posts');
    }
    return filtered;
  }, [posts]);
  
  // ✅ Extract complex expressions
  const postsLength = validPosts.length;
  const firstPostId = validPosts[0]?.id;
  
  // ✅ Memoize posts to prevent unnecessary re-renders
  const memoizedPosts = useMemo(() => validPosts, [validPosts, postsLength, firstPostId]);

  // ✅ CRITICAL FIX: Changed prop name from 'publicacion' to 'post' to match PublicacionCard interface
  const renderItem = ({ item }: { item: Publicacion }) => {
    // ✅ Double-check that item is valid before rendering
    if (!item || !item.id) {
      console.error('[FeedSocial] Attempted to render invalid post:', item);
      return null;
    }
    return <PublicacionCard post={item} />;
  };

  const keyExtractor = (item: Publicacion) => item?.id || `post-${Math.random()}`;

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
