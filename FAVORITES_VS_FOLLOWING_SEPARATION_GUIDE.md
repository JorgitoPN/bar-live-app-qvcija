
# ✅ FAVORITES VS FOLLOWING SEPARATION - IMPLEMENTATION GUIDE

## 🎯 Problem Statement

Previously, the system incorrectly mixed two different concepts:
- **Saving a local as favorite** (locales_guardados)
- **Following a local's social profile** (seguidores)

When a user saved a local as favorite, the system automatically added it to the "Siguiendo" list in the social network, which is incorrect.

## ✅ Solution Implemented

### 1. **Separate Actions**

#### Saving as Favorite (locales_guardados)
- **Purpose**: Bookmark a local for quick access
- **Action**: Add to `locales_guardados` table
- **Does NOT**: Automatically follow the local's social profile
- **Available for**: ALL locales (with or without active payment plan)

#### Following a Local (seguidores)
- **Purpose**: Follow a local's social media profile to see their posts
- **Action**: Add to `seguidores` table
- **Requirement**: Local MUST have an active payment plan (Standard or Premium)
- **Available for**: Only locales with `plan_activo` = 'estandar' OR 'premium'

### 2. **Code Changes**

#### FavoritesContext.tsx
```typescript
// ✅ FIXED v2.0: Saving as favorite does NOT follow
const toggleFavorite = async (localId: string) => {
  // ... existing code ...
  
  if (wasFavorite) {
    // Remove from favorites WITHOUT unfollowing
    await supabase
      .from('locales_guardados')
      .delete()
      .eq('usuario_id', user.id)
      .eq('local_id', localId);
    
    console.log('✅ Removed from favorites (follow status unchanged)');
  } else {
    // Add to favorites WITHOUT following
    await supabase
      .from('locales_guardados')
      .insert({
        usuario_id: user.id,
        local_id: localId,
      });
    
    console.log('✅ Added to favorites (follow status unchanged)');
    console.log('ℹ️ NOTE: Saving as favorite does NOT automatically follow the local');
  }
};
```

### 3. **Database Structure**

#### locales_guardados (Favorites)
```sql
CREATE TABLE locales_guardados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, local_id)
);
```

#### seguidores (Following)
```sql
CREATE TABLE seguidores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seguidor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  seguido_id UUID, -- Can be usuario_id OR local_id
  tipo_seguido TEXT CHECK (tipo_seguido IN ('usuario', 'local')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seguidor_id, seguido_id)
);
```

### 4. **User Flow Examples**

#### Example 1: Saving "Discoteca Blaster Santiago" as Favorite
**Before (Incorrect)**:
1. User clicks "Save as Favorite" ❤️
2. System adds to `locales_guardados` ✅
3. System ALSO adds to `seguidores` ❌ (WRONG!)
4. Local's profile shows user as follower ❌ (WRONG!)

**After (Correct)**:
1. User clicks "Save as Favorite" ❤️
2. System adds to `locales_guardados` ✅
3. System does NOT add to `seguidores` ✅ (CORRECT!)
4. Local's profile does NOT show user as follower ✅ (CORRECT!)

#### Example 2: Following a Local's Social Profile
**Requirements**:
- Local MUST have active payment plan (Standard or Premium)
- User must explicitly click "Follow" button on local's profile

**Flow**:
1. User visits local's social profile
2. User clicks "Seguir" button
3. System checks if local has active plan
4. If yes, add to `seguidores` table
5. User now sees local's posts in their feed

### 5. **UI Changes**

#### Favoritos Page (app/(tabs)/favoritos/index.tsx)
- Shows ALL saved locales (with or without payment plan)
- Does NOT show "Siguiendo" tab
- Only shows "Locales Favoritos" as single view

#### Perfil Page - Siguiendo Count
- Only counts locales with active payment plans
- Uses RPC function to filter correctly

#### Local Profile Page (app/perfil/local.tsx)
- Shows "Seguir" button only if local has active plan
- Separate from "Save as Favorite" button

### 6. **Database Functions**

#### get_total_siguiendo_count
```sql
CREATE OR REPLACE FUNCTION get_total_siguiendo_count(p_usuario_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT s.seguido_id)
  INTO total_count
  FROM seguidores s
  LEFT JOIN locales l ON s.seguido_id = l.id AND s.tipo_seguido = 'local'
  LEFT JOIN suscripciones_locales sl ON l.id = sl.local_id AND sl.estado = 'activa'
  LEFT JOIN planes_suscripcion ps ON sl.plan_id = ps.id
  WHERE s.seguidor_id = p_usuario_id
  AND (
    s.tipo_seguido = 'usuario'
    OR (s.tipo_seguido = 'local' AND ps.nombre IN ('estandar', 'premium'))
  );
  
  RETURN COALESCE(total_count, 0);
END;
$$ LANGUAGE plpgsql;
```

### 7. **Testing Checklist**

- [ ] Save a local as favorite → Does NOT appear in "Siguiendo"
- [ ] Remove a local from favorites → Does NOT unfollow
- [ ] Follow a local with active plan → Appears in "Siguiendo"
- [ ] Follow a local without active plan → Shows error message
- [ ] Unfollow a local → Does NOT remove from favorites
- [ ] "Siguiendo" count only includes locales with active plans
- [ ] "Locales Favoritos" shows ALL saved locales

### 8. **Migration Notes**

If you need to clean up existing incorrect data:

```sql
-- Remove incorrect follows that were created from favorites
-- (Only if you want to clean up historical data)
DELETE FROM seguidores s
WHERE s.tipo_seguido = 'local'
AND s.seguido_id IN (
  SELECT l.id
  FROM locales l
  LEFT JOIN suscripciones_locales sl ON l.id = sl.local_id AND sl.estado = 'activa'
  WHERE sl.id IS NULL
);
```

## 🎉 Benefits

1. **Clear Separation**: Favorites and Following are now completely independent
2. **Better UX**: Users understand the difference between saving and following
3. **Correct Counts**: "Siguiendo" count only includes locales with active plans
4. **Flexible**: Users can save any local, but only follow those with social profiles
5. **Scalable**: Easy to add more features to each system independently

## 📝 Summary

- **Saving as Favorite** = Bookmark for quick access (any local)
- **Following** = Subscribe to social posts (only locales with active plans)
- **Independent Actions** = One does not affect the other
- **Clear UI** = Separate buttons and clear labels
