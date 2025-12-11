
# ✅ Story System Verification Checklist

## Pre-Flight Checks

Before testing the new story system, verify the following:

### 1. Database Migration Applied ✅
Run this SQL query to verify the migration was applied:
```sql
-- Check if indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'historias' 
AND indexname LIKE 'idx_historias%';

-- Check if RLS policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'historias';

-- Check if cleanup function exists
SELECT proname FROM pg_proc 
WHERE proname = 'cleanup_expired_stories';
```

Expected results:
- 5 indexes on historias table
- 5 RLS policies on historias table
- 1 cleanup function

### 2. Files Created ✅
Verify these files exist:
- [ ] `contexts/StoryContext.tsx`
- [ ] `components/common/StoryAvatar.tsx`
- [ ] `components/social/InstagramStoriesBar.tsx`
- [ ] `components/social/UnifiedStoryViewer.tsx`

### 3. Old Files Deleted ✅
Verify these files are deleted:
- [ ] `contexts/StoryStateContextV11.tsx`
- [ ] `components/common/StoryAvatarV11.tsx`
- [ ] `components/social/UnifiedStoryViewerV11.tsx`
- [ ] `components/social/InstagramStoriesBarV11.tsx`
- [ ] `contexts/StoryStateContextV10.tsx`
- [ ] `components/common/StoryAvatarV10.tsx`
- [ ] `components/social/UnifiedStoryViewerV10.tsx`
- [ ] `components/social/InstagramStoriesBarV10.tsx`

### 4. App Layout Updated ✅
Verify `app/_layout.tsx` imports:
```typescript
import { StoryProvider } from '@/contexts/StoryContext';
```

And uses it in the provider hierarchy:
```typescript
<StoryProvider>
  <Stack screenOptions={{ headerShown: false }}>
    ...
  </Stack>
</StoryProvider>
```

---

## Functional Testing

### Test 1: Story Creation
1. Navigate to social page
2. Tap "+" button to create story
3. Select image or video
4. Verify story is created successfully
5. Verify story appears in stories bar

**Expected Result:** ✅ Story created and visible

### Test 2: Story Viewing
1. Tap on any story avatar
2. Verify story viewer opens
3. Verify image/video loads correctly
4. Verify progress bar animates
5. Wait for story to complete
6. Verify auto-advance to next story

**Expected Result:** ✅ Story viewer works correctly

### Test 3: Border Logic
1. Create a new story (or have someone create one)
2. Verify neon green border appears on avatar
3. View the story completely
4. Verify border disappears after viewing
5. Create another story
6. Verify border reappears

**Expected Result:** ✅ Border logic works correctly

### Test 4: Gesture Handling
1. Open story viewer
2. Test tap left → Previous story
3. Test tap right → Next story
4. Test swipe left → Next story
5. Test swipe right → Previous story
6. Test swipe down → Close viewer
7. Test press & hold → Pause story
8. Test release → Resume story

**Expected Result:** ✅ All gestures work correctly

### Test 5: Auto-Close
1. Open story viewer
2. Navigate to last story
3. Tap right or wait for completion
4. Verify viewer closes automatically

**Expected Result:** ✅ Auto-close works on last story

### Test 6: View Tracking
1. View a story for at least 1 second
2. Close viewer
3. Reopen same story
4. Verify border is gone (story marked as viewed)
5. Check database for historia_views record

**Expected Result:** ✅ View tracking works correctly

### Test 7: Real-Time Updates
1. Open app on two devices with same user
2. View story on device 1
3. Verify border updates on device 2 immediately
4. Create story on device 1
5. Verify story appears on device 2 immediately

**Expected Result:** ✅ Real-time updates work correctly

### Test 8: Like Functionality
1. Open story viewer (not your own story)
2. Tap heart icon
3. Verify heart fills with red color
4. Tap again to unlike
5. Verify heart returns to outline

**Expected Result:** ✅ Like functionality works correctly

### Test 9: Message Functionality
1. Open story viewer (not your own story)
2. Type message in input field
3. Tap send button
4. Verify success message appears
5. Check chats to verify message was sent

**Expected Result:** ✅ Message functionality works correctly

### Test 10: Stats Modal (Owner Only)
1. Open your own story
2. Tap eye icon in header
3. Verify stats modal opens
4. Verify views list is displayed
5. Verify likes list is displayed
6. Close modal

**Expected Result:** ✅ Stats modal works correctly

### Test 11: Delete Functionality (Owner Only)
1. Open your own story
2. Tap trash icon in header
3. Verify confirmation dialog appears
4. Tap "Eliminar"
5. Verify story is deleted
6. Verify viewer closes or advances

**Expected Result:** ✅ Delete functionality works correctly

### Test 12: Video Stories
1. Create story with video
2. Open story viewer
3. Verify video plays automatically
4. Verify progress bar matches video duration
5. Verify auto-advance after video completes

**Expected Result:** ✅ Video stories work correctly

---

## Performance Testing

### Test 1: Load Time
1. Open social page with many stories
2. Measure time to load stories bar
3. Verify stories load within 2 seconds

**Expected Result:** ✅ Fast load time

### Test 2: Smooth Animations
1. Open story viewer
2. Verify progress bar animates smoothly
3. Verify no stuttering or lag
4. Verify transitions are smooth

**Expected Result:** ✅ Smooth animations

### Test 3: Memory Usage
1. Open and close story viewer multiple times
2. Navigate between stories
3. Verify no memory leaks
4. Check console for warnings

**Expected Result:** ✅ No memory leaks

---

## Edge Cases

### Test 1: No Stories
1. Delete all stories
2. Verify stories bar shows only create button
3. Verify no errors in console

**Expected Result:** ✅ Handles no stories gracefully

### Test 2: Single Story
1. Have only one story
2. Open story viewer
3. Tap right on last story
4. Verify viewer closes

**Expected Result:** ✅ Handles single story correctly

### Test 3: Network Issues
1. Disable network
2. Try to view story
3. Verify error handling
4. Re-enable network
5. Verify recovery

**Expected Result:** ✅ Handles network issues gracefully

### Test 4: Expired Stories
1. Create story
2. Wait 24 hours (or manually update expires_at)
3. Verify story is not displayed
4. Run cleanup function
5. Verify story is deleted

**Expected Result:** ✅ Expired stories are handled correctly

---

## Security Testing

### Test 1: RLS Policies
1. Try to view another user's story views
2. Verify access is denied
3. Try to delete another user's story
4. Verify access is denied

**Expected Result:** ✅ RLS policies work correctly

### Test 2: Local Stories
1. Create story as local owner
2. Verify story is created with local_id
3. Try to delete as non-owner
4. Verify access is denied

**Expected Result:** ✅ Local story security works correctly

---

## Final Checklist

Before marking the system as complete, verify:

- [ ] All functional tests pass
- [ ] All performance tests pass
- [ ] All edge cases handled
- [ ] All security tests pass
- [ ] No errors in console
- [ ] No warnings in console
- [ ] Documentation is complete
- [ ] Migration guide is clear
- [ ] Old files are deleted
- [ ] Database is clean

---

## Sign-Off

Once all tests pass, the story system is ready for production! 🚀

**Tested by:** _________________

**Date:** _________________

**Status:** ✅ APPROVED FOR PRODUCTION

---

## Troubleshooting

If any test fails, check:

1. **Console Errors:** Look for error messages
2. **Database:** Verify migration was applied
3. **Imports:** Verify all imports are updated
4. **Provider:** Verify StoryProvider is in app/_layout.tsx
5. **RLS:** Verify RLS policies are correct

For help, refer to:
- `STORY_SYSTEM_COMPLETE_REBUILD.md` - Complete documentation
- `STORY_SYSTEM_MIGRATION_GUIDE.md` - Migration instructions
