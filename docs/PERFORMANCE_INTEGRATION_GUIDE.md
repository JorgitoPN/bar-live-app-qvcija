
# 🚀 Performance Optimizations Integration Guide

## Quick Start

### Step 1: Install New Utilities

The following files have been created:
- `utils/advancedCache.ts` - Advanced multi-layer caching
- `utils/intelligentPreloader.ts` - Predictive content loading
- `utils/realtimeMessaging.ts` - WebSocket-based messaging

### Step 2: Database Migrations

Run these migrations (already applied):
- `performance_optimization_indexes_v2` - Database indexes
- `database_cleanup_functions` - Cleanup functions

### Step 3: Update Social Feed

Replace `app/(tabs)/social/index.tsx` with the optimized version or integrate the following changes:

```typescript
import { advancedCache } from '@/utils/advancedCache';
import { intelligentPreloader } from '@/utils/intelligentPreloader';

// In loadData function:
const cachedPosts = await advancedCache.get<any[]>('social:posts');
if (cachedPosts) {
  setPosts(cachedPosts);
  return; // INSTANT load
}

// After loading posts:
await advancedCache.set('social:posts', posts, 'high');

// Preload in background:
setTimeout(() => {
  intelligentPreloader.preloadStoryImages(stories, 0, 10);
  intelligentPreloader.preloadPostImages(posts, 0, 5);
}, 500);
```

### Step 4: Update Story Viewer

The story viewer already has most optimizations, but ensure:

```typescript
// Before opening viewer:
await preloadStoryImages(stories, initialIndex, 4);

// Then open:
setShowStoryViewer(true);
```

### Step 5: Update Messaging

Replace message sending logic with:

```typescript
import { realtimeMessaging } from '@/utils/realtimeMessaging';

// Subscribe to chat:
useEffect(() => {
  if (!chatId || !user) return;
  
  const unsubscribe = realtimeMessaging.subscribeToChat(
    chatId,
    user.id,
    (message) => {
      setMessages(prev => [...prev, message]);
    }
  );
  
  return unsubscribe;
}, [chatId, user]);

// Send message:
await realtimeMessaging.sendMessage(chatId, user.id, messageText);
```

### Step 6: Schedule Database Cleanup

Add to your backend or cron job:

```sql
-- Run daily at 3 AM
SELECT run_database_maintenance();
```

Or use Supabase Edge Function:

```typescript
// supabase/functions/daily-cleanup/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  await supabase.rpc('run_database_maintenance');
  
  return new Response('Cleanup complete', { status: 200 });
});
```

## Testing

### 1. Test Cache Performance

```typescript
import { advancedCache } from '@/utils/advancedCache';

// Test cache hit
await advancedCache.set('test', { data: 'test' }, 'high');
const result = await advancedCache.get('test');
console.log('Cache hit:', result); // Should be instant

// Check stats
const stats = await advancedCache.getStats();
console.log('Cache stats:', stats);
```

### 2. Test Preloading

```typescript
import { intelligentPreloader } from '@/utils/intelligentPreloader';

// Test story preload
await intelligentPreloader.preloadStoryImages(stories, 0, 5);
// Stories should now load instantly

// Test post preload
await intelligentPreloader.preloadPostImages(posts, 0, 5);
// Posts should now load instantly
```

### 3. Test Real-time Messaging

```typescript
import { realtimeMessaging } from '@/utils/realtimeMessaging';

// Send test message
const message = await realtimeMessaging.sendMessage(
  chatId,
  userId,
  'Test message'
);
console.log('Message sent:', message);
// Should appear instantly in recipient's chat
```

### 4. Test Database Performance

```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;
-- Should use index scan, not sequential scan

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
-- Should show high idx_scan counts

-- Run cleanup
SELECT run_database_maintenance();
-- Should complete in < 1 second
```

## Monitoring

### Cache Statistics

```typescript
const stats = await advancedCache.getStats();
console.log('Memory cache size:', stats.memorySize);
console.log('Disk cache size:', stats.diskSize);
console.log('Hot keys:', stats.hotKeys);
```

### Performance Metrics

```typescript
// Measure load time
const start = performance.now();
await loadData();
const end = performance.now();
console.log('Load time:', end - start, 'ms');
// Should be < 100ms with cache
```

### Database Health

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Troubleshooting

### Cache Not Working

```typescript
// Clear all caches
await advancedCache.clearAll();

// Check if data is being cached
await advancedCache.set('test', { data: 'test' }, 'high');
const result = await advancedCache.get('test');
if (!result) {
  console.error('Cache not working!');
}
```

### Preloading Not Working

```typescript
// Check if images are being prefetched
const result = await Image.queryCache(['https://example.com/image.jpg']);
console.log('Image cache status:', result);
// Should be 'disk' or 'memory' if cached
```

### Real-time Not Working

```typescript
// Check WebSocket connection
const channel = supabase.channel('test');
channel.subscribe((status) => {
  console.log('Channel status:', status);
  // Should be 'SUBSCRIBED'
});
```

### Database Slow

```sql
-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;
-- These columns might need indexes

-- Check for bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Performance Checklist

- [ ] Advanced cache integrated
- [ ] Intelligent preloader integrated
- [ ] Real-time messaging integrated
- [ ] Database indexes applied
- [ ] Cleanup functions scheduled
- [ ] Image optimization enabled
- [ ] Component memoization added
- [ ] Virtualized lists implemented
- [ ] GPU animations enabled
- [ ] Cache monitoring setup
- [ ] Performance metrics tracked
- [ ] Database health monitored

## Expected Results

After full integration:

- ✅ App starts in < 500ms
- ✅ Stories open instantly (< 50ms)
- ✅ Feed scrolls at 60fps
- ✅ Messages deliver in < 100ms
- ✅ Images load instantly (cached)
- ✅ No lag or stuttering
- ✅ Smooth animations everywhere
- ✅ Real-time updates
- ✅ Optimized database queries
- ✅ Automatic data cleanup

## Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review the console logs
3. Check cache statistics
4. Monitor database performance
5. Test individual components

For more details, see `INSTAGRAM_PERFORMANCE_OPTIMIZATIONS.md`.
