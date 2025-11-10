
# 📋 Migration Guide: Converting Pages to Global Data

This guide shows how to convert existing pages to use the new global data system.

## Step-by-Step Migration

### Step 1: Import Global Data Hook

**Before:**
```typescript
import { supabase } from '@/utils/supabase';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
```

**After:**
```typescript
import { useGlobalData } from '@/contexts/GlobalDataContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
```

### Step 2: Replace State with Global Data

**Before:**
```typescript
const [locales, setLocales] = useState<Local[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadLocales();
}, []);

const loadLocales = async () => {
  setLoading(true);
  const { data } = await supabase.from('locales').select('*');
  setLocales(data || []);
  setLoading(false);
};
```

**After:**
```typescript
const { locales, isInitialLoading, refreshData } = useGlobalData();

// That's it! Data is already loaded.
```

### Step 3: Update Refresh Logic

**Before:**
```typescript
const onRefresh = async () => {
  setRefreshing(true);
  await loadLocales();
  setRefreshing(false);
};
```

**After:**
```typescript
const onRefresh = async () => {
  setRefreshing(true);
  await refreshData(false);
  setRefreshing(false);
};
```

### Step 4: Add Scroll Position Preservation (for lists)

**Before:**
```typescript
const scrollViewRef = useRef<ScrollView>(null);

return (
  <ScrollView ref={scrollViewRef}>
    {/* Content */}
  </ScrollView>
);
```

**After:**
```typescript
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useFocusEffect } from 'expo-router';

const { scrollViewRef, saveScrollPosition, restoreScrollPosition } = useScrollPosition('my-page-key');

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
```

### Step 5: Replace Loading Screen

**Before:**
```typescript
if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text>Cargando...</Text>
    </View>
  );
}
```

**After:**
```typescript
if (isInitialLoading) {
  return <InitialLoadingScreen />;
}
```

### Step 6: Implement Optimistic Updates

**Before:**
```typescript
const handleLike = async (postId: string) => {
  await supabase.from('likes').insert({ post_id: postId, usuario_id: user.id });
  await loadPosts(); // Reload all posts
};
```

**After:**
```typescript
const { updatePost } = useGlobalData();

const handleLike = async (postId: string) => {
  const post = posts.find(p => p.id === postId);
  
  // Instant UI update
  updatePost(postId, { liked: true, likes: post.likes + 1 });
  
  try {
    await supabase.from('likes').insert({ post_id: postId, usuario_id: user.id });
    await supabase.from('posts').update({ likes: post.likes + 1 }).eq('id', postId);
  } catch (error) {
    // Rollback on error
    updatePost(postId, { liked: false, likes: post.likes });
  }
};
```

## Complete Example: Before & After

### BEFORE (Slow, Multiple Fetches):

```typescript
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '@/utils/supabase';

export default function LocalesPage() {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLocales();
  }, []);

  const loadLocales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('locales')
      .select('*')
      .eq('activo', true);
    
    if (!error) {
      setLocales(data || []);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocales();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {locales.map(local => (
        <LocalCard key={local.id} local={local} />
      ))}
    </ScrollView>
  );
}
```

### AFTER (Fast, Global Data):

```typescript
import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useFocusEffect } from 'expo-router';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';

export default function LocalesPage() {
  const { locales, isInitialLoading, refreshData } = useGlobalData();
  const { scrollViewRef, saveScrollPosition, restoreScrollPosition } = useScrollPosition('locales-page');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      restoreScrollPosition();
    }, [restoreScrollPosition])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData(false);
    setRefreshing(false);
  };

  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      onScroll={saveScrollPosition}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {locales.map(local => (
        <LocalCard key={local.id} local={local} />
      ))}
    </ScrollView>
  );
}
```

## Migration Checklist

For each page, complete these steps:

- [ ] Import `useGlobalData` and `InitialLoadingScreen`
- [ ] Replace local state with global data
- [ ] Remove individual data fetching functions
- [ ] Update refresh logic to use `refreshData()`
- [ ] Add scroll position preservation (if list)
- [ ] Replace loading screen with `InitialLoadingScreen`
- [ ] Implement optimistic updates (if applicable)
- [ ] Test initial load
- [ ] Test cached load
- [ ] Test navigation
- [ ] Test scroll preservation
- [ ] Test optimistic updates

## Pages to Migrate

### High Priority (User-Facing):
- [x] `app/(tabs)/(home)/index.tsx` - Home/Explorar (DONE)
- [x] `app/(tabs)/social/index.tsx` - Social Feed (DONE)
- [ ] `app/(tabs)/eventos/index.tsx` - Eventos
- [ ] `app/(tabs)/empleo/index.tsx` - Empleo
- [ ] `app/(tabs)/perfil/index.tsx` - Perfil (partially done)
- [ ] `app/detalle/local.tsx` - Local Detail
- [ ] `app/detalle/evento.tsx` - Evento Detail
- [ ] `app/social/post.tsx` - Post Detail

### Medium Priority (Admin):
- [ ] `app/admin/gestionar-locales.tsx`
- [ ] `app/admin/gestionar-usuarios.tsx`
- [ ] `app/gestion/mis-locales.tsx`

### Low Priority (Settings):
- [ ] `app/(tabs)/perfil/configuracion.tsx`
- [ ] `app/(tabs)/perfil/notificaciones.tsx`

## Testing After Migration

1. **Initial Load Test:**
   - Clear app data
   - Launch app
   - Should see InitialLoadingScreen once
   - Data should load in 2-3 seconds

2. **Cached Load Test:**
   - Close and reopen app
   - Should load instantly (< 0.5s)
   - No loading screen

3. **Navigation Test:**
   - Navigate between pages
   - Should be instant
   - No loading screens

4. **Scroll Test:**
   - Scroll down on list
   - Navigate away
   - Navigate back
   - Scroll position should be preserved

5. **Refresh Test:**
   - Pull to refresh
   - Should update data
   - Should be fast (< 2s)

6. **Optimistic Update Test:**
   - Perform action (like, follow, etc.)
   - UI should update instantly
   - Check persistence after refresh

## Common Issues

### Issue: Data not showing
**Solution:** Check if page is using `useGlobalData()` correctly

### Issue: Loading screen shows on every navigation
**Solution:** Only show `InitialLoadingScreen` when `isInitialLoading` is true

### Issue: Scroll position not preserved
**Solution:** Make sure `useScrollPosition` hook is properly implemented

### Issue: Optimistic updates not working
**Solution:** Verify `updatePost` or `updateLocal` is being called

## Need Help?

- Check `docs/PERFORMANCE_OPTIMIZATION.md` for architecture overview
- Check `docs/DEVELOPER_GUIDE.md` for patterns and best practices
- Look at migrated pages for examples:
  - `app/(tabs)/(home)/index.tsx`
  - `app/(tabs)/social/index.tsx`

Happy migrating! 🚀
