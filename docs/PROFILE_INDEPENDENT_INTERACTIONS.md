
# Profile-Independent Social Interactions

## Overview

This document describes the implementation of profile-independent social interactions in BarLive. The system ensures that all social interactions (likes, comments, stories, notifications) are properly separated between personal user profiles and local profiles.

## Problem Statement

**Root Cause:** The previous implementation stored all interactions with only `usuario_id`, without differentiating between personal user profiles and local profiles. This caused actions from one profile to incorrectly reflect on another profile of the same owner.

**Example Issue:**
- User @jorgitopn likes a post → Heart turns red, counter shows 0
- Switch to local profile "Casa Adolfo" → Heart is also red (incorrect!)
- The local profile should have its own independent like state

## Solution Architecture

### 1. Database Schema Changes

All interaction tables now include:
- `local_id` (uuid, nullable): References the local profile if the interaction is from a local
- `tipo` (text): Either 'usuario' or 'local' to indicate the type of interaction

**Affected Tables:**
- `likes` - Post likes
- `comentarios` - Post comments
- `historia_likes` - Story likes
- `historia_views` - Story views
- `comment_likes` - Comment likes
- `notificaciones` - Notifications (added `local_origen_id`)

### 2. Unique Constraints

Each interaction type has a unique constraint that respects profile separation:

```sql
-- Example for likes
CREATE UNIQUE INDEX likes_usuario_post_local_unique 
ON likes (usuario_id, post_id, COALESCE(local_id, '00000000-0000-0000-0000-000000000000'::uuid));
```

This ensures:
- A user can like a post once as themselves (local_id = NULL)
- A user can like the same post once per local they own (local_id = specific local)
- Each like is independent and doesn't interfere with others

### 3. Interaction Context Hook

The `useInteractionContext` hook provides the correct context for all interactions:

```typescript
const {
  interactionUserId,      // Always the logged-in user's ID (for RLS)
  interactionType,        // 'usuario' or 'local'
  interactionLocalId,     // The local ID if interacting as local, null otherwise
  isInteractingAsLocal,   // Boolean for convenience
  displayName,            // Name to display
  displayAvatar,          // Avatar to display
} = useInteractionContext();
```

### 4. Implementation Pattern

**For Creating Interactions (Likes, Comments, etc.):**

```typescript
const likeData: any = {
  post_id: postId,
  usuario_id: interactionUserId, // Always the user's ID
};

if (isInteractingAsLocal && interactionLocalId) {
  likeData.local_id = interactionLocalId;
  likeData.tipo = 'local';
  console.log('🏢 Adding like as local:', interactionLocalId);
} else {
  likeData.tipo = 'usuario';
  console.log('👤 Adding like as user');
}

await supabase.from('likes').insert(likeData);
```

**For Checking Interaction State:**

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
const isLiked = !!data;
```

**For Deleting Interactions:**

```typescript
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

await deleteQuery;
```

## Updated Components

### 1. PublicacionCard.tsx
- ✅ Likes now respect profile context
- ✅ Comments respect profile context
- ✅ Saved posts respect profile context
- ✅ Like state is checked with profile context on mount

### 2. app/social/post.tsx
- ✅ Post likes respect profile context
- ✅ Comments respect profile context
- ✅ Comment likes respect profile context
- ✅ All interactions are independent per profile

### 3. StoryViewer.tsx
- ✅ Story likes respect profile context
- ✅ Story views respect profile context
- ✅ Own stories are not counted in views/likes
- ✅ Statistics show only other users' interactions

### 4. All Other Social Components
- All components using `useInteractionContext` now properly separate interactions

## Benefits

1. **Independent Interactions:** Each profile (user or local) has its own independent set of interactions
2. **Correct Counters:** Like counts, comment counts, and other metrics are accurate per profile
3. **Proper UI State:** Heart icons, save buttons, and other UI elements reflect the correct state for the active profile
4. **No Cross-Contamination:** Actions from one profile don't affect another profile of the same owner
5. **Consistent Experience:** The entire social network experience is consistent across all interaction types

## Testing Checklist

- [ ] Like a post as user → Switch to local → Like state should be independent
- [ ] Comment on a post as user → Switch to local → Comment as local → Both comments should appear
- [ ] View a story as user → Switch to local → View count should increment separately
- [ ] Like a story as user → Switch to local → Like state should be independent
- [ ] Like a comment as user → Switch to local → Like state should be independent
- [ ] Receive notifications → Notifications should correctly attribute actions to the right profile
- [ ] Check analytics → Local profile analytics should only show interactions with that local

## Database Helper Functions

Two helper functions are available for getting profile information:

```sql
-- Get display name for a profile
SELECT get_profile_display_name(user_id, local_id, 'local');

-- Get avatar URL for a profile
SELECT get_profile_avatar_url(user_id, local_id, 'local');
```

## Performance Considerations

- Indexes created on `local_id` and `tipo` columns for fast queries
- Unique constraints prevent duplicate interactions
- RLS policies ensure users can only interact with their own profiles

## Migration Applied

Migration: `fix_profile_independent_interactions`

This migration:
1. Adds missing columns (`local_id`, `tipo`) to all interaction tables
2. Creates unique constraints for profile separation
3. Updates RLS policies
4. Creates helper functions
5. Adds performance indexes
6. Documents all changes

## Future Enhancements

1. **Notification Attribution:** Enhance notifications to show which profile performed the action
2. **Analytics Dashboard:** Separate analytics for user profile vs. local profiles
3. **Interaction History:** View all interactions per profile
4. **Profile Switching:** Smooth transitions when switching between profiles

## Conclusion

This implementation ensures that BarLive properly treats each profile (user or local) as an independent entity in the social network. All interactions are now correctly separated, providing a consistent and accurate experience for all users.
