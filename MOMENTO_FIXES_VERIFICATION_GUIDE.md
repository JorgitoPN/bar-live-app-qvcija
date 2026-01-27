
# Momento System Fixes - Verification Guide

## Changes Implemented

### 1. Progress Bar Behavior ✅
**Issue**: When transitioning to the next momento, the previous progress bar should remain full.

**Fix**: Modified `MomentoViewer.tsx` to:
- Animate the current progress bar to 100% before transitioning to the next momento
- Set all previous progress bars to 100% when loading momentos (for cases where user starts from a later momento)

**How to verify**:
1. Open a momento viewer with multiple momentos
2. Watch the first momento complete
3. Verify that the first progress bar stays full (white) when the second momento starts
4. Navigate through all momentos and verify all previous bars remain full

### 2. "Tu Momento" Display ✅
**Issue**: User's own momento should appear only in "Tu momento" section, not in the carousel.

**Implementation**: `MomentoCarousel.tsx` correctly:
- Filters out the current user's/local's momentos from the main carousel
- Displays them separately in the "Tu momento" section
- Shows the add button if no momento exists, or the momento avatar if one exists

**How to verify**:
1. Upload a momento as a user
2. Check that it appears in "Tu momento" section (first position)
3. Verify it does NOT appear in the carousel with other users' momentos
4. Check that other users' momentos appear in the carousel after "Tu momento"

### 3. Profile Page Neon Border ✅
**Issue**: The neon green border should appear on the profile avatar when there are unviewed momentos.

**Implementation**: `app/(tabs)/perfil/index.tsx`:
- Checks for unviewed momentos using `checkUnviewedMomentos()`
- Displays neon green gradient border when `hasUnviewedMomentos` is true
- Subscribes to real-time updates for momento changes

**How to verify**:
1. Have another user upload a momento
2. Go to your profile page
3. Verify the avatar has a neon green border
4. Tap the avatar to view the momento
5. Return to profile and verify the border is gone (or gray if all viewed)

### 4. MiniAvatar Neon Borders ✅
**Issue**: Mini avatars in feed, comments, and messages should show neon green border for unviewed momentos.

**Implementation**: `MiniAvatarWithMomento.tsx`:
- Checks for unviewed momentos for the given user/local
- Displays neon green gradient border when unviewed momentos exist
- Used in `InstagramPostCard.tsx` for social feed posts

**How to verify**:
1. Have a user with unviewed momentos
2. Check their avatar in:
   - Social feed posts
   - Comments section
   - Messages (if implemented)
3. Verify neon green border appears
4. View their momentos
5. Verify border changes to gray

### 5. Momento Message Capture ✅
**Issue**: Messages sent from momento viewer should include a screenshot of the momento.

**Implementation**: `MomentoViewer.tsx`:
- Captures screenshot using `react-native-view-shot`
- Uploads screenshot to Supabase storage
- Stores screenshot URL in `momento_messages` table
- `MomentoMessageBubble.tsx` displays screenshot or "Momento ya no disponible" if expired

**How to verify**:
1. Open a momento viewer
2. Tap the message/send button
3. Verify a screenshot is captured and uploaded
4. Check the chat conversation
5. Verify the momento message shows the screenshot
6. Wait 24 hours or manually expire the momento
7. Verify the message shows "Momento ya no disponible"

## Common Issues and Solutions

### Issue: Changes not visible
**Solution**: 
- Restart the Expo development server
- Clear the app cache
- Rebuild the app if using a production build

### Issue: Neon border not showing
**Solution**:
- Verify there are actually unviewed momentos in the database
- Check that the momento hasn't expired (24 hours)
- Verify the user hasn't already viewed the momento
- Check real-time subscriptions are working

### Issue: Progress bars not staying full
**Solution**:
- Verify you're using the latest version of `MomentoViewer.tsx`
- Check that the animation is completing before transition
- Ensure `progressAnims` array is properly initialized

### Issue: Screenshot not capturing
**Solution**:
- Verify `react-native-view-shot` is properly installed
- Check storage permissions
- Verify Supabase storage bucket exists and has proper permissions
- Check the `momentoViewRef` is properly attached to the view

## Database Verification

### Check for unviewed momentos:
```sql
-- Get all active momentos
SELECT * FROM momentos 
WHERE expires_at > NOW()
ORDER BY created_at DESC;

-- Check momento views for a specific user
SELECT mv.*, m.autor_id, m.tipo 
FROM momento_views mv
JOIN momentos m ON m.id = mv.momento_id
WHERE mv.usuario_id = 'YOUR_USER_ID';

-- Find unviewed momentos for a user
SELECT m.* FROM momentos m
WHERE m.expires_at > NOW()
AND m.id NOT IN (
  SELECT momento_id FROM momento_views 
  WHERE usuario_id = 'YOUR_USER_ID'
);
```

### Check momento messages:
```sql
-- Get all momento messages with screenshots
SELECT * FROM momento_messages
WHERE momento_screenshot_url IS NOT NULL
ORDER BY created_at DESC;

-- Check expired momentos
SELECT * FROM momentos
WHERE expires_at < NOW();
```

## Testing Checklist

- [ ] User's own momento appears in "Tu momento" section only
- [ ] Other users' momentos appear in carousel
- [ ] Profile avatar shows neon border for unviewed momentos
- [ ] Mini avatars in feed show neon border for unviewed momentos
- [ ] Progress bars stay full when transitioning to next momento
- [ ] Screenshot is captured when sending momento message
- [ ] Screenshot appears in chat message
- [ ] Expired momentos show "Momento ya no disponible"
- [ ] Real-time updates work for new momentos
- [ ] Real-time updates work for viewed momentos

## Next Steps

If all items in the checklist pass, the Momento system is working correctly. If any issues persist:

1. Check the console logs for errors
2. Verify database state matches expectations
3. Check network requests in developer tools
4. Verify Supabase storage permissions
5. Test on both iOS and Android if possible

## Support

For additional help:
- Check Supabase logs for storage/database errors
- Review React Native logs for component errors
- Verify all dependencies are properly installed
- Ensure Expo SDK version is compatible (54)
