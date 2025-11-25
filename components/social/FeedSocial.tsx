
import React, { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import OptimizedPublicacionCard from './OptimizedPublicacionCard';
import { colors } from '@/styles/commonStyles';

interface Post {
  id: string;
  contenido: string;
  imagen?: string;
  imagenes?: string[];
  autor_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  created_at: string;
  likes: number;
  comentarios: number;
  liked?: boolean;
  saved?: boolean;
  autor?: {
    id: string;
    nombre: string;
    username: string;
    avatar_url?: string;
  };
  local?: {
    id: string;
    nombre: string;
    avatar_url?: string;
  };
}

interface FeedSocialProps {
  posts: Post[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const FeedSocial = memo(function FeedSocial({
  posts,
  onRefresh,
  refreshing = false,
  onEndReached,
  ListHeaderComponent,
}: FeedSocialProps) {
  const renderItem = useCallback(({ item }: { item: Post }) => (
    <OptimizedPublicacionCard post={item} />
  ), []);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => {
    const item = data?.[index];
    const hasImages = item?.imagenes?.length > 0 || item?.imagen;
    const hasContent = item?.contenido?.length > 0;
    
    let estimatedHeight = 80;
    if (hasContent) estimatedHeight += 60;
    if (hasImages) estimatedHeight += 400;
    estimatedHeight += 60;
    
    return {
      length: estimatedHeight,
      offset: estimatedHeight * index,
      index,
    };
  }, []);

  // ✅ FIXED: Extract complex expressions and add missing dependency 'posts'
  const postsLength = posts.length;
  const firstPostId = posts[0]?.id;
  
  const memoizedPosts = useMemo(() => posts, [posts, postsLength, firstPostId]);

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
      removeClippedSubviews={true}
      maxToRenderPerBatch={3}
      updateCellsBatchingPeriod={100}
      initialNumToRender={3}
      windowSize={5}
      getItemLayout={getItemLayout}
      nestedScrollEnabled={false}
      persistentScrollbar={false}
      legacyImplementation={false}
      drawDistance={500}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.posts.length === nextProps.posts.length &&
    prevProps.refreshing === nextProps.refreshing &&
    prevProps.posts[0]?.id === nextProps.posts[0]?.id &&
    prevProps.posts[prevProps.posts.length - 1]?.id === nextProps.posts[nextProps.posts.length - 1]?.id
  );
});

export default FeedSocial;

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
});
