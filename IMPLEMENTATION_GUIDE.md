
# 🎯 Social Network Implementation Guide

## Quick Reference for Developers

This guide provides quick reference information for working with the rebuilt social network.

---

## 🔑 Key Concepts

### 1. Interaction Context

Every interaction (like, comment, story, etc.) must use the `useInteractionContext()` hook to determine the current interaction context.

```typescript
import { useInteractionContext } from '@/hooks/useInteractionContext';

function MyComponent() {
  const { 
    interactionUserId,      // Always the logged-in user's ID
    interactionType,        // 'usuario' or 'local'
    interactionLocalId,     // Local ID if interacting as local, null otherwise
    isInteractingAsLocal,   // Boolean for convenience
    displayName,            // Name to display
    displayAvatar,          // Avatar to display
  } = useInteractionContext();

  // Use these values when creating interactions
}
```

### 2. Profile Switching

Users can switch between their personal profile and local profiles they own.

```typescript
import { useMode } from '@/contexts/ModeContext';

function ProfileSwitcher() {
  const { 
    currentMode,              // 'cliente', 'propietario', or 'admin'
    activeProfileType,        // 'cliente' or 'local'
    activeProfileId,          // Current active profile ID
    activeLocalData,          // Local data if active profile is local
    ownedLocals,              // Array of owned locals
    switchToClientProfile,    // Function to switch to client profile
    switchToLocalProfile,     // Function to switch to local profile
  } = useMode();

  // Switch to client profile
  const handleSwitchToClient = async () => {
    await switchToClientProfile();
  };

  // Switch to local profile
  const handleSwitchToLocal = async (localId: string) => {
    await switchToLocalProfile(localId);
  };
}
```

---

## 📝 Common Patterns

### Creating a Like

```typescript
const handleLike = async (postId: string) => {
  const { interactionUserId, interactionType, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

  if (!interactionUserId) {
    Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
    return;
  }

  const likeData: any = {
    post_id: postId,
    usuario_id: interactionUserId,
  };

  if (isInteractingAsLocal && interactionLocalId) {
    likeData.local_id = interactionLocalId;
    likeData.tipo = 'local';
  } else {
    likeData.tipo = 'usuario';
  }

  const { error } = await supabase.from('likes').insert(likeData);

  if (error) {
    console.error('Error creating like:', error);
    Alert.alert('Error', 'No se pudo dar me gusta');
  }
};
```

### Checking Like Status

```typescript
useEffect(() => {
  const checkIfLiked = async () => {
    if (!interactionUserId || !postId) return;

    let query = supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('usuario_id', interactionUserId);

    if (isInteractingAsLocal && interactionLocalId) {
      query = query.eq('local_id', interactionLocalId);
    } else {
      query = query.is('local_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      setLiked(true);
    } else {
      setLiked(false);
    }
  };

  checkIfLiked();
}, [interactionUserId, interactionLocalId, isInteractingAsLocal, postId]);
```

### Deleting a Like

```typescript
const handleUnlike = async (postId: string) => {
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

  if (!interactionUserId) return;

  let deleteQuery = supabase
    .from('likes')
    .delete()
    .eq('post_id', postId)
    .eq('usuario_id', interactionUserId);

  if (isInteractingAsLocal && interactionLocalId) {
    deleteQuery = deleteQuery.eq('local_id', interactionLocalId);
  } else {
    deleteQuery = deleteQuery.is('local_id', null);
  }

  const { error } = await deleteQuery;

  if (error) {
    console.error('Error deleting like:', error);
    Alert.alert('Error', 'No se pudo quitar el me gusta');
  }
};
```

### Creating a Comment

```typescript
const handleComment = async (postId: string, texto: string) => {
  const { interactionUserId, interactionType, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

  if (!interactionUserId) {
    Alert.alert('Error', 'Debes iniciar sesión para comentar');
    return;
  }

  const commentData: any = {
    post_id: postId,
    autor_id: interactionUserId,
    texto: texto,
  };

  if (isInteractingAsLocal && interactionLocalId) {
    commentData.local_id = interactionLocalId;
    commentData.tipo = 'local';
  } else {
    commentData.tipo = 'usuario';
  }

  const { error } = await supabase.from('comentarios').insert(commentData);

  if (error) {
    console.error('Error creating comment:', error);
    Alert.alert('Error', 'No se pudo crear el comentario');
  }
};
```

### Creating a Story

```typescript
const handleCreateStory = async (imageUrl: string) => {
  const { interactionUserId, interactionType, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

  if (!interactionUserId) {
    Alert.alert('Error', 'Debes iniciar sesión para crear una historia');
    return;
  }

  const storyData: any = {
    autor_id: interactionUserId,
    imagen: imageUrl,
    duracion: 15,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  };

  if (isInteractingAsLocal && interactionLocalId) {
    storyData.local_id = interactionLocalId;
    storyData.tipo = 'local';
  } else {
    storyData.tipo = 'usuario';
  }

  const { error } = await supabase.from('historias').insert(storyData);

  if (error) {
    console.error('Error creating story:', error);
    Alert.alert('Error', 'No se pudo crear la historia');
  }
};
```

### Virtual Room Check-in

```typescript
const handleCheckIn = async (localId: string) => {
  const { user } = useAuth();

  if (!user) {
    Alert.alert('Error', 'Debes iniciar sesión para entrar en la sala');
    return;
  }

  // First, close all active check-ins for this user
  await supabase
    .from('sala_virtual_checkins')
    .update({
      activo: false,
      checked_out_at: new Date().toISOString(),
    })
    .eq('usuario_id', user.id)
    .eq('activo', true);

  // Then insert a new check-in
  const { error } = await supabase
    .from('sala_virtual_checkins')
    .insert({
      usuario_id: user.id,
      local_id: localId,
      activo: true,
      checked_in_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error checking in:', error);
    Alert.alert('Error', 'No se pudo entrar en la sala');
  }
};
```

### Virtual Room Check-out

```typescript
const handleCheckOut = async (localId: string) => {
  const { user } = useAuth();

  if (!user) return;

  const { error } = await supabase
    .from('sala_virtual_checkins')
    .update({
      activo: false,
      checked_out_at: new Date().toISOString(),
    })
    .eq('usuario_id', user.id)
    .eq('local_id', localId)
    .eq('activo', true);

  if (error) {
    console.error('Error checking out:', error);
    Alert.alert('Error', 'No se pudo salir de la sala');
  }
};
```

---

## 🔍 Querying Data

### Get Posts with Like Status

```typescript
const loadPosts = async () => {
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

  if (!interactionUserId) return;

  // Build the query
  let query = supabase
    .from('posts')
    .select(`
      *,
      autor:usuarios!posts_autor_id_fkey(id, nombre, username, avatar),
      local:locales!posts_local_id_fkey(id, nombre, imagen_url)
    `)
    .eq('es_privado', false)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: posts, error } = await query;

  if (error) {
    console.error('Error loading posts:', error);
    return;
  }

  // Check like status for each post
  const postsWithLikeStatus = await Promise.all(
    posts.map(async (post) => {
      let likeQuery = supabase
        .from('likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('usuario_id', interactionUserId);

      if (isInteractingAsLocal && interactionLocalId) {
        likeQuery = likeQuery.eq('local_id', interactionLocalId);
      } else {
        likeQuery = likeQuery.is('local_id', null);
      }

      const { data: likeData } = await likeQuery.maybeSingle();

      return {
        ...post,
        user_has_liked: !!likeData,
      };
    })
  );

  return postsWithLikeStatus;
};
```

### Get Stories with View Status

```typescript
const loadStories = async () => {
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

  if (!interactionUserId) return;

  // Get all active stories
  const { data: stories, error } = await supabase
    .from('historias')
    .select(`
      *,
      autor:usuarios!historias_autor_id_fkey(id, nombre, username, avatar),
      local:locales!historias_local_id_fkey(id, nombre, imagen_url)
    `)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading stories:', error);
    return;
  }

  // Check view status for each story
  const storiesWithViewStatus = await Promise.all(
    stories.map(async (story) => {
      let viewQuery = supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', story.id)
        .eq('usuario_id', interactionUserId);

      if (isInteractingAsLocal && interactionLocalId) {
        viewQuery = viewQuery.eq('local_id', interactionLocalId);
      } else {
        viewQuery = viewQuery.is('local_id', null);
      }

      const { data: viewData } = await viewQuery.maybeSingle();

      return {
        ...story,
        user_has_viewed: !!viewData,
      };
    })
  );

  return storiesWithViewStatus;
};
```

---

## 🎨 UI Components

### Profile Switcher Button

```typescript
import { ProfileSwitcher } from '@/components/perfil/ProfileSwitcher';

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Social</Text>
      <ProfileSwitcher />
    </View>
  );
}
```

### Post Card

```typescript
import PublicacionCard from '@/components/social/PublicacionCard';

function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => (
        <PublicacionCard
          post={item}
          onLike={() => handleLike(item.id)}
          onComment={() => handleComment(item.id)}
          onShare={() => handleShare(item.id)}
        />
      )}
      keyExtractor={(item) => item.id}
    />
  );
}
```

---

## 🐛 Debugging Tips

### Check Interaction Context

```typescript
const { interactionUserId, interactionType, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

console.log('Interaction Context:', {
  interactionUserId,
  interactionType,
  interactionLocalId,
  isInteractingAsLocal,
});
```

### Check Active Profile

```typescript
const { activeProfileType, activeProfileId, activeLocalData } = useMode();

console.log('Active Profile:', {
  activeProfileType,
  activeProfileId,
  activeLocalName: activeLocalData?.nombre,
});
```

### Check RLS Policies

```sql
-- Check RLS policies for a table
SELECT * FROM pg_policies WHERE tablename = 'posts';
```

### Check Triggers

```sql
-- Check triggers for a table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'likes';
```

---

## 📚 Best Practices

### 1. Always Use Interaction Context

Never hardcode `usuario_id` or `tipo`. Always use `useInteractionContext()`.

❌ **Bad:**
```typescript
const { error } = await supabase.from('likes').insert({
  post_id: postId,
  usuario_id: user.id,
  tipo: 'usuario',
});
```

✅ **Good:**
```typescript
const { interactionUserId, interactionType, interactionLocalId, isInteractingAsLocal } = useInteractionContext();

const likeData: any = {
  post_id: postId,
  usuario_id: interactionUserId,
};

if (isInteractingAsLocal && interactionLocalId) {
  likeData.local_id = interactionLocalId;
  likeData.tipo = 'local';
} else {
  likeData.tipo = 'usuario';
}

const { error } = await supabase.from('likes').insert(likeData);
```

### 2. Always Check Like/View Status Based on Context

When checking if a user has liked/viewed something, always filter by both `usuario_id` and `local_id`.

❌ **Bad:**
```typescript
const { data } = await supabase
  .from('likes')
  .select('id')
  .eq('post_id', postId)
  .eq('usuario_id', user.id)
  .maybeSingle();
```

✅ **Good:**
```typescript
let query = supabase
  .from('likes')
  .select('id')
  .eq('post_id', postId)
  .eq('usuario_id', interactionUserId);

if (isInteractingAsLocal && interactionLocalId) {
  query = query.eq('local_id', interactionLocalId);
} else {
  query = query.is('local_id', null);
}

const { data } = await query.maybeSingle();
```

### 3. Use Optimistic UI Updates

For better UX, update the UI immediately and revert if the operation fails.

```typescript
const handleLike = async (postId: string) => {
  const newLiked = !liked;
  const previousLikesCount = likesCount;
  
  // Optimistic update
  setLiked(newLiked);
  setLikesCount(newLiked ? likesCount + 1 : Math.max(0, likesCount - 1));

  try {
    // Perform the actual operation
    const { error } = await supabase.from('likes').insert(likeData);
    
    if (error) throw error;
  } catch (error) {
    // Revert on error
    setLiked(!newLiked);
    setLikesCount(previousLikesCount);
    Alert.alert('Error', 'No se pudo actualizar el me gusta');
  }
};
```

### 4. Handle Errors Gracefully

Always provide user-friendly error messages.

```typescript
try {
  const { error } = await supabase.from('posts').insert(postData);
  
  if (error) throw error;
  
  Alert.alert('Éxito', 'Publicación creada');
} catch (error) {
  console.error('Error creating post:', error);
  Alert.alert('Error', 'No se pudo crear la publicación. Por favor, inténtalo de nuevo.');
}
```

---

## 🚀 Performance Tips

### 1. Use Indexes

Make sure all frequently queried columns have indexes.

```sql
-- Example: Index for posts by author and creation date
CREATE INDEX idx_posts_autor_created ON posts(autor_id, created_at DESC);

-- Example: Index for likes by post and user
CREATE INDEX idx_likes_post_user ON likes(post_id, usuario_id, local_id);
```

### 2. Limit Query Results

Always use `.limit()` when fetching lists.

```typescript
const { data } = await supabase
  .from('posts')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20); // Only fetch 20 posts
```

### 3. Use Pagination

For large lists, implement pagination.

```typescript
const loadMorePosts = async (page: number) => {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * 20, (page + 1) * 20 - 1);
  
  return data;
};
```

### 4. Memoize Components

Use `React.memo()` for components that don't need to re-render often.

```typescript
const PostCard = memo(function PostCard({ post }: { post: Post }) {
  // Component implementation
});
```

---

## 📞 Support

If you encounter any issues or have questions, please refer to:

- [SOCIAL_NETWORK_REBUILD_COMPLETE.md](./SOCIAL_NETWORK_REBUILD_COMPLETE.md) - Complete implementation details
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

---

**Last Updated:** 2025-01-27
**Version:** 2.0.0
