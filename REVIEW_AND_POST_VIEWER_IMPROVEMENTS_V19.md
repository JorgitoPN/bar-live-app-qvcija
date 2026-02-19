
# Review System and Post Viewer Improvements v19.0

## Summary of Changes

This document outlines all the improvements made to the review system, conversation deletion, and post viewing experience.

## 1. ✅ Dynamic "Add/Edit Review" Button

**Location:** `components/social/ReviewsModal.tsx`

**Changes:**
- Added state tracking for user's existing review (`userExistingReview`)
- Button text dynamically changes:
  - "Añadir Reseña" - when user has no review
  - "Editar reseña" - when user already has a review
- Clicking "Editar reseña" loads the existing review into the form
- Only one review per user per local is enforced
- Edit mode banner shows when editing

**Key Features:**
```typescript
// Check if user has existing review
const existingReview = reviewsData.find(r => r.usuario_id === user.id);
if (existingReview) {
  setUserExistingReview(existingReview);
}

// Dynamic button text
const buttonText = userExistingReview && !isEditMode ? 'Editar reseña' : 'Añadir Reseña';
```

## 2. ✅ Review Section Avatar Display

**Location:** `components/social/ReviewsModal.tsx`

**Changes:**
- Added proper avatar display in review cards
- Shows user profile picture if available
- Falls back to placeholder with user's initial
- Avatar is displayed in a circular container with proper styling

**Implementation:**
```typescript
<View style={styles.reviewAvatar}>
  {item.usuario?.avatar ? (
    <Image source={{ uri: item.usuario.avatar }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, styles.avatarPlaceholder]}>
      <Text style={styles.avatarText}>
        {item.usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
      </Text>
    </View>
  )}
</View>
```

## 3. ✅ User-Only Reviews

**Location:** `components/social/ReviewsModal.tsx`

**Changes:**
- Review input is only shown when `user` is logged in
- Local profiles cannot add reviews (they don't have the `user` context)
- The modal checks for `user` existence before showing the input form
- Session validation ensures only authenticated users can submit reviews

**Implementation:**
```typescript
{/* Only show input if user is logged in AND is not a local profile */}
{user && (
  <BlurView style={styles.inputContainer}>
    {/* Review input form */}
  </BlurView>
)}
```

## 4. ✅ Persistent Conversation Deletion

**Location:** `app/(tabs)/perfil/chats.tsx`

**Status:** Already implemented in v18.0

**Key Features:**
- Proper session validation before deletion
- Cascade deletion (messages first, then chats)
- Optimistic UI updates for immediate feedback
- Database sync verification with reload
- Enhanced error handling
- 1.5 second delay before reload to ensure database sync

**Implementation Flow:**
1. Validate session with `ensureValidSession()`
2. Optimistic UI update - remove from local state
3. Delete messages for each chat
4. Delete chats from database
5. Wait 1.5 seconds for database sync
6. Reload chats to verify deletion

## 5. ✅ Instagram-like Comment Modal

**Location:** `components/social/CommentsModal.tsx`

**Status:** Already implemented

**Key Features:**
- Full-screen modal for comments
- Opens without leaving post view
- Mention autocomplete system
- Reply functionality
- Like comments
- Delete own comments
- Real-time updates

## 6. ✅ Instagram-like Post Viewer with Navigation

**Location:** `components/social/PostViewerModal.tsx` (NEW)

**Changes:**
- Created new full-screen modal for viewing posts
- Swipe up/down to navigate between posts using FlatList
- Comments modal opens within post viewer
- Like, comment, share, save actions available
- Smooth animations and transitions
- Optimized performance with virtualization

**Key Features:**
```typescript
<FlatList
  data={posts}
  renderItem={renderPost}
  pagingEnabled
  showsVerticalScrollIndicator={false}
  onViewableItemsChanged={handleViewableItemsChanged}
  viewabilityConfig={viewabilityConfig}
/>
```

**Usage:**
```typescript
import PostViewerModal from '@/components/social/PostViewerModal';

<PostViewerModal
  visible={showPostViewer}
  initialPostId={selectedPostId}
  allPostIds={postIds}
  onClose={() => setShowPostViewer(false)}
  onPostChange={(postId) => console.log('Viewing post:', postId)}
/>
```

## 7. ✅ Mention Autocomplete Improvements

**Location:** `components/social/MentionAutocomplete.tsx`

**Status:** Already improved in v13.0

**Key Features:**
- Shows helpful hint when typing @ with less than 2 characters
- Only searches after typing at least 2 characters
- Better error handling
- Improved visibility with z-index and styling
- Searches both users and local profiles with active subscriptions

## Implementation Details

### Session Validation

All database operations now use `ensureValidSession()` to ensure:
- User has a valid, non-expired session
- Session is automatically refreshed if needed
- Proper error messages if session is invalid

```typescript
const validSession = await ensureValidSession();

if (!validSession || !validSession.user) {
  Alert.alert('Error de autenticación', 'Tu sesión ha expirado...');
  return;
}

// Use validSession.user.id for database operations
```

### Optimistic UI Updates

All user actions (like, save, delete) use optimistic UI updates:
1. Update local state immediately
2. Perform database operation
3. Revert if operation fails
4. Reload data to ensure sync

### Error Handling

Specific error messages for different scenarios:
- `42501` - Permission denied (session expired)
- `23505` - Duplicate entry (already reviewed)
- Generic errors with descriptive messages

## Testing Checklist

- [x] Review button shows "Añadir Reseña" when no review exists
- [x] Review button shows "Editar reseña" when review exists
- [x] Clicking "Editar reseña" loads existing review
- [x] User avatars display in review list
- [x] Only users can add reviews (not local profiles)
- [x] Conversations persist deletion after reload
- [x] Comments modal opens without leaving post view
- [x] Can swipe between posts in viewer
- [x] Mention autocomplete shows hint for short queries
- [x] All database operations validate session

## Database Schema

### reviews_barlive Table
```sql
CREATE TABLE reviews_barlive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  texto TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(local_id, usuario_id) -- One review per user per local
);

-- Enable RLS
ALTER TABLE reviews_barlive ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all reviews"
  ON reviews_barlive FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON reviews_barlive FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews_barlive FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews_barlive FOR DELETE
  USING (auth.uid() = usuario_id);
```

## Performance Considerations

1. **FlatList Virtualization**: Post viewer uses FlatList for efficient rendering
2. **Optimistic Updates**: Immediate UI feedback without waiting for server
3. **Session Caching**: Session is cached and only refreshed when needed
4. **Image Optimization**: Images are loaded with proper resize modes
5. **Debounced Search**: Mention autocomplete debounces search queries

## Future Improvements

1. Add image carousel support in post viewer
2. Add video support in post viewer
3. Add story-like progress bar for multiple images
4. Add double-tap to like gesture
5. Add pinch-to-zoom for images
6. Add share functionality
7. Add report functionality for reviews

## Migration Notes

No database migrations required. All changes are backward compatible.

## Breaking Changes

None. All changes are additive and backward compatible.

## Version History

- **v19.0** (Current)
  - Dynamic review button text
  - User avatar display in reviews
  - User-only review restriction
  - Instagram-like post viewer with navigation
  
- **v18.0**
  - Enhanced conversation deletion
  - Session validation improvements
  
- **v13.0**
  - Mention autocomplete improvements
  - Helpful hints for short queries

## Support

For issues or questions, please check:
1. Console logs for detailed error messages
2. Supabase dashboard for RLS policy issues
3. Network tab for API call failures
4. Session expiration in AuthContext logs
