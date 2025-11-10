
# 🚀 Barlive Developer Guide

## Performance Architecture

Barlive uses a **Global Data Loading** strategy for maximum performance.

## Core Concepts

### 1. Global Data Provider
All data is loaded ONCE at app startup and shared across the entire app.

```typescript
// contexts/GlobalDataContext.tsx
<GlobalDataProvider>
  <App />
</GlobalDataProvider>
```

### 2. No Individual Fetching
Pages don't fetch their own data. They access pre-loaded global data.

❌ **DON'T DO THIS:**
```typescript
function MyPage() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // BAD: Individual fetch
    fetchData().then(setData);
  }, []);
  
  return <List data={data} />;
}
```

✅ **DO THIS:**
```typescript
function MyPage() {
  const { locales } = useGlobalData();
  
  // Data is already loaded!
  return <List data={locales} />;
}
```

### 3. Optimistic UI Updates
Update UI immediately, sync with backend in background.

```typescript
const { updatePost } = useGlobalData();

function handleLike(postId) {
  // 1. Update UI instantly
  updatePost(postId, { liked: true, likes: post.likes + 1 });
  
  // 2. Sync with backend
  supabase.from('posts')
    .update({ likes: post.likes + 1 })
    .eq('id', postId)
    .catch(() => {
      // 3. Rollback on error
      updatePost(postId, { liked: false, likes: post.likes });
    });
}
```

### 4. Scroll Position Preservation
Maintain scroll position when navigating away and back.

```typescript
import { useScrollPosition } from '@/hooks/useScrollPosition';

function MyListPage() {
  const { scrollViewRef, saveScrollPosition, restoreScrollPosition } = useScrollPosition('my-list');
  
  useFocusEffect(
    useCallback(() => {
      restoreScrollPosition();
    }, [restoreScrollPosition])
  );
  
  return (
    <ScrollView
      ref={scrollViewRef}
      onScroll={saveScrollPosition}
      scrollEventThrottle={16}
    >
      {/* Content */}
    </ScrollView>
  );
}
```

## Data Flow

```
App Startup
    ↓
GlobalDataProvider loads ALL data
    ↓
Data cached in AsyncStorage (5-10 min)
    ↓
Pages access data via useGlobalData()
    ↓
User actions → Optimistic UI updates
    ↓
Background sync with Supabase
    ↓
Real-time subscriptions keep data fresh
```

## Performance Rules

### ✅ DO:
- Use `useGlobalData()` for all data access
- Implement optimistic UI updates
- Preserve scroll positions on lists
- Show loading only on initial startup
- Use background refresh for updates
- Cache everything possible

### ❌ DON'T:
- Fetch data individually in pages
- Show loading screens on navigation
- Block UI while syncing
- Forget to handle errors
- Ignore scroll position
- Make synchronous API calls

## Common Patterns

### Pattern 1: List Page with Global Data
```typescript
function LocalesListPage() {
  const { locales, isInitialLoading } = useGlobalData();
  const { scrollViewRef, saveScrollPosition, restoreScrollPosition } = useScrollPosition('locales-list');
  
  useFocusEffect(
    useCallback(() => {
      restoreScrollPosition();
    }, [restoreScrollPosition])
  );
  
  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }
  
  return (
    <ScrollView
      ref={scrollViewRef}
      onScroll={saveScrollPosition}
      scrollEventThrottle={16}
    >
      {locales.map(local => (
        <LocalCard key={local.id} local={local} />
      ))}
    </ScrollView>
  );
}
```

### Pattern 2: Optimistic Like/Unlike
```typescript
function PostCard({ post }) {
  const { updatePost } = useGlobalData();
  const { user } = useAuth();
  
  const handleLike = async () => {
    if (!user) return;
    
    const isLiked = post.liked;
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;
    
    // Instant UI update
    updatePost(post.id, { liked: !isLiked, likes: newLikes });
    
    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('usuario_id', user.id);
      } else {
        await supabase.from('likes').insert({ post_id: post.id, usuario_id: user.id });
      }
      await supabase.from('posts').update({ likes: newLikes }).eq('id', post.id);
    } catch (error) {
      // Rollback on error
      updatePost(post.id, { liked: isLiked, likes: post.likes });
    }
  };
  
  return (
    <TouchableOpacity onPress={handleLike}>
      <IconSymbol name={post.liked ? 'heart.fill' : 'heart'} />
      <Text>{post.likes}</Text>
    </TouchableOpacity>
  );
}
```

### Pattern 3: Manual Refresh
```typescript
function MyPage() {
  const { refreshData } = useGlobalData();
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData(false); // false = show loading indicator
    setRefreshing(false);
  };
  
  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Content */}
    </ScrollView>
  );
}
```

## Debugging

### Check Global Data Status:
```typescript
const { locales, posts, stories, lastUpdate } = useGlobalData();

console.log('Locales:', locales.length);
console.log('Posts:', posts.length);
console.log('Stories:', stories.length);
console.log('Last update:', new Date(lastUpdate).toLocaleString());
```

### Monitor Cache:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check what's cached
const keys = await AsyncStorage.getAllKeys();
console.log('Cached keys:', keys.filter(k => k.startsWith('global_cache_')));

// Clear cache (for testing)
await AsyncStorage.multiRemove(keys.filter(k => k.startsWith('global_cache_')));
```

### Performance Monitoring:
```typescript
// Add to GlobalDataProvider
console.time('Data Load');
await loadFromSupabase();
console.timeEnd('Data Load');
```

## Testing

### Test Initial Load:
1. Clear app data
2. Launch app
3. Should see InitialLoadingScreen
4. Data should load in 2-3 seconds
5. Navigation should be instant

### Test Cached Load:
1. Launch app (with existing cache)
2. Should see data instantly (< 0.5s)
3. Background refresh should happen silently

### Test Optimistic Updates:
1. Like a post
2. UI should update instantly
3. Check network tab - request should happen in background
4. Refresh page - like should persist

### Test Scroll Preservation:
1. Scroll down on a list
2. Navigate to detail page
3. Go back
4. Scroll position should be preserved

## Troubleshooting

### Data not loading:
- Check Supabase connection
- Check console for errors
- Verify table permissions
- Clear cache and retry

### Slow performance:
- Check if using global data (not individual fetches)
- Verify cache is working
- Check network requests (should be minimal)
- Monitor memory usage

### Scroll position not preserved:
- Verify `useScrollPosition` hook is used
- Check `scrollViewRef` is attached
- Ensure `saveScrollPosition` is called on scroll
- Verify `restoreScrollPosition` is called on focus

## Best Practices Summary

1. **Always use global data** - Never fetch individually
2. **Optimistic updates** - Instant UI, background sync
3. **Preserve scroll** - Better UX on lists
4. **Cache everything** - Instant subsequent loads
5. **Background refresh** - Keep data fresh silently
6. **Error handling** - Always rollback on failure
7. **Loading screens** - Only on initial startup
8. **Strategic timing** - 50ms delays for smooth UX

## Performance Metrics

Target metrics:
- Initial load: < 3 seconds
- Cached load: < 0.5 seconds
- Page navigation: < 0.1 seconds (instant)
- Optimistic updates: < 0.05 seconds (instant)
- Background refresh: < 2 seconds (silent)

## Questions?

Check the code:
- `contexts/GlobalDataContext.tsx` - Global data implementation
- `hooks/useScrollPosition.ts` - Scroll preservation
- `app/(tabs)/(home)/index.tsx` - Example usage
- `app/(tabs)/social/index.tsx` - Example usage

Happy coding! 🚀
