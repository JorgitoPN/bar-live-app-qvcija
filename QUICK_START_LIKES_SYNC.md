
# 🚀 Quick Start: Likes Synchronization System

## For Developers

### Using the Global Posts Context

#### 1. **Basic Setup**

```typescript
import { usePostInteractions } from '@/hooks/usePostInteractions';

function MyPostComponent({ post }) {
  const {
    isLiked,
    likesCount,
    localLikes,
    commentsCount,
    isSaved,
    handleLike,
    handleSave,
    incrementComments,
  } = usePostInteractions({
    postId: post.id,
    initialLiked: post.user_has_liked,
    initialLikesCount: post.likes_count,
    initialCommentsCount: post.comentarios_count,
    initialSaved: post.user_has_saved,
  });

  return (
    <View>
      <TouchableOpacity onPress={handleLike}>
        <Text>{isLiked ? '❤️' : '🤍'} {likesCount}</Text>
      </TouchableOpacity>
      
      <PostLikesAvatars 
        postId={post.id}
        totalLikes={likesCount}
        localLikes={localLikes}
      />
    </View>
  );
}
```

#### 2. **Displaying Likes with Avatars**

```typescript
import PostLikesAvatars from '@/components/social/PostLikesAvatars';

<PostLikesAvatars 
  postId={post.id}
  totalLikes={likesCount}
  localLikes={localLikes}
/>
```

#### 3. **Sharing Posts**

```typescript
import SharePostModal from '@/components/social/SharePostModal';

const [showShareModal, setShowShareModal] = useState(false);

<SharePostModal
  visible={showShareModal}
  postId={post.id}
  postContent={post.contenido}
  postImage={post.imagenes?.[0]}
  postAuthorName={post.autor.nombre}
  postAuthorAvatar={post.autor.avatar}
  onClose={() => setShowShareModal(false)}
/>
```

#### 4. **Displaying Shared Posts in Chat**

```typescript
import SharedPostBubble from '@/components/chat/SharedPostBubble';

{message.tipo_mensaje === 'post_compartido' && (
  <SharedPostBubble
    postId={message.post_id}
    imageUrl={message.imagen_url}
    content={message.contenido}
    authorName={message.post?.autor?.nombre}
    authorAvatar={message.post?.autor?.avatar}
    isSender={message.remitente_id === user.id}
  />
)}
```

## Key Features

### ✅ Automatic Synchronization
- All views update instantly when likes change
- No manual state management needed
- Works across Feed, Modal, Profile, etc.

### ✅ Optimistic UI
- Instant feedback (< 100ms)
- Automatic rollback on errors
- Smooth animations

### ✅ Real-time Updates
- See other users' likes in real-time
- Efficient subscriptions
- Automatic cleanup

### ✅ Share with Preview
- Beautiful post preview cards
- Clickable images in messages
- Automatic screenshot capture

## Common Patterns

### Pattern 1: Simple Like Button

```typescript
const { isLiked, handleLike } = usePostInteractions({
  postId: post.id,
  initialLiked: post.user_has_liked,
});

<TouchableOpacity onPress={handleLike}>
  <IconSymbol
    ios_icon_name={isLiked ? 'heart.fill' : 'heart'}
    android_material_icon_name={isLiked ? 'favorite' : 'favorite_border'}
    size={28}
    color={isLiked ? '#EF4444' : colors.text}
  />
</TouchableOpacity>
```

### Pattern 2: Like Count with Animation

```typescript
const { likesCount, handleLike } = usePostInteractions({
  postId: post.id,
  initialLikesCount: post.likes_count,
});

const likeScale = useRef(new Animated.Value(1)).current;

const animateLike = () => {
  Animated.sequence([
    Animated.timing(likeScale, {
      toValue: 1.3,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.timing(likeScale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start();
};

<TouchableOpacity onPress={() => {
  animateLike();
  handleLike();
}}>
  <Animated.View style={{ transform: [{ scale: likeScale }] }}>
    <Text>{likesCount} likes</Text>
  </Animated.View>
</TouchableOpacity>
```

### Pattern 3: Full Post Card

```typescript
const {
  isLiked,
  likesCount,
  localLikes,
  commentsCount,
  isSaved,
  handleLike,
  handleSave,
} = usePostInteractions({
  postId: post.id,
  initialLiked: post.user_has_liked,
  initialLikesCount: post.likes_count,
  initialCommentsCount: post.comentarios_count,
  initialSaved: post.user_has_saved,
});

<View>
  {/* Actions */}
  <View style={styles.actions}>
    <TouchableOpacity onPress={handleLike}>
      <IconSymbol name={isLiked ? 'heart.fill' : 'heart'} />
    </TouchableOpacity>
    <TouchableOpacity onPress={handleComment}>
      <IconSymbol name="bubble.right" />
    </TouchableOpacity>
    <TouchableOpacity onPress={handleShare}>
      <IconSymbol name="paperplane" />
    </TouchableOpacity>
    <TouchableOpacity onPress={handleSave}>
      <IconSymbol name={isSaved ? 'bookmark.fill' : 'bookmark'} />
    </TouchableOpacity>
  </View>

  {/* Likes Display */}
  {likesCount > 0 && (
    <PostLikesAvatars 
      postId={post.id}
      totalLikes={likesCount}
      localLikes={localLikes}
    />
  )}

  {/* Comments Count */}
  {commentsCount > 0 && (
    <Text>Ver los {commentsCount} comentarios</Text>
  )}
</View>
```

## Troubleshooting

### Issue: Likes not synchronizing
**Solution**: Ensure PostsProvider is in app/_layout.tsx

### Issue: Duplicate subscriptions
**Solution**: Hook automatically handles cleanup

### Issue: Share image not uploading
**Solution**: Check Supabase Storage bucket exists and has correct policies

### Issue: Memory leaks
**Solution**: PostsContext automatically cleans up unused subscriptions

## Performance Tips

1. **Use memo for expensive renders**
```typescript
const PostCard = React.memo(({ post }) => {
  // Component code
});
```

2. **Debounce rapid actions**
```typescript
// Already handled in usePostInteractions hook
```

3. **Lazy load images**
```typescript
<Image 
  source={{ uri: imageUrl }}
  resizeMode="cover"
  loadingIndicatorSource={<ActivityIndicator />}
/>
```

## Best Practices

1. ✅ Always use `usePostInteractions` hook for post interactions
2. ✅ Pass `localLikes` array to `PostLikesAvatars`
3. ✅ Handle loading and error states
4. ✅ Provide haptic feedback on interactions
5. ✅ Use optimistic UI for better UX
6. ✅ Clean up subscriptions on unmount (automatic)

## Need Help?

- Check `LIKES_SYNCHRONIZATION_FIX_COMPLETE.md` for detailed documentation
- Review example implementations in:
  - `components/social/InstagramPostCard.tsx`
  - `components/social/PostViewerModal.tsx`
  - `app/(tabs)/social/index.tsx`

---

**Last Updated**: January 2025
**Version**: 1.0
