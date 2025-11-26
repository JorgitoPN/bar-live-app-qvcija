
// ... (keep imports and interfaces)

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

  // ... (keep rest of the component)
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better memoization
  return (
    prevProps.posts.length === nextProps.posts.length &&
    prevProps.refreshing === nextProps.refreshing &&
    prevProps.posts[0]?.id === nextProps.posts[0]?.id &&
    prevProps.posts[prevProps.posts.length - 1]?.id === nextProps.posts[nextProps.posts.length - 1]?.id
  );
});

export default FeedSocial;
