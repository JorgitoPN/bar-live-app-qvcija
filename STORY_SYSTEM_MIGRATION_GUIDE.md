
# 📚 Story System Migration Guide

## Quick Reference for Updating Imports

If you have any files that were using the old V11 story system, update the imports as follows:

### Context Import
**OLD:**
```typescript
import { useStoryState } from '@/contexts/StoryStateContextV11';
```

**NEW:**
```typescript
import { useStoryContext } from '@/contexts/StoryContext';
```

### Component Imports
**OLD:**
```typescript
import StoryAvatarV11 from '@/components/common/StoryAvatarV11';
import UnifiedStoryViewerV11 from '@/components/social/UnifiedStoryViewerV11';
import InstagramStoriesBarV11 from '@/components/social/InstagramStoriesBarV11';
```

**NEW:**
```typescript
import StoryAvatar from '@/components/common/StoryAvatar';
import UnifiedStoryViewer from '@/components/social/UnifiedStoryViewer';
import InstagramStoriesBar from '@/components/social/InstagramStoriesBar';
```

### Hook Usage
**OLD:**
```typescript
const { hasUnviewedStories, markStoriesAsViewed, refreshStoryState, viewedStoryIds } = useStoryState();
```

**NEW:**
```typescript
const { hasUnviewedStories, markStoriesAsViewed, refreshStoryState, viewedStoryIds } = useStoryContext();
```

### Component Usage
The component props remain the same, just update the component names:

**OLD:**
```typescript
<StoryAvatarV11
  userId={userId}
  userStories={stories}
  avatarUrl={avatar}
  userName={name}
  size={92}
  onPress={handlePress}
  showLabel={true}
/>
```

**NEW:**
```typescript
<StoryAvatar
  userId={userId}
  userStories={stories}
  avatarUrl={avatar}
  userName={name}
  size={92}
  onPress={handlePress}
  showLabel={true}
/>
```

## Files That May Need Updates

Search your codebase for these patterns and update them:

1. **Context imports:**
   - Search for: `StoryStateContextV11`
   - Replace with: `StoryContext`
   - Search for: `useStoryState`
   - Replace with: `useStoryContext`

2. **Component imports:**
   - Search for: `StoryAvatarV11`
   - Replace with: `StoryAvatar`
   - Search for: `UnifiedStoryViewerV11`
   - Replace with: `UnifiedStoryViewer`
   - Search for: `InstagramStoriesBarV11`
   - Replace with: `InstagramStoriesBar`

3. **Component usage:**
   - Search for: `<StoryAvatarV11`
   - Replace with: `<StoryAvatar`
   - Search for: `<UnifiedStoryViewerV11`
   - Replace with: `<UnifiedStoryViewer`
   - Search for: `<InstagramStoriesBarV11`
   - Replace with: `<InstagramStoriesBar`

## Common Files to Check

- `app/(tabs)/social/index.tsx`
- `app/(tabs)/perfil/index.tsx`
- `app/perfil/usuario.tsx`
- `app/perfil/local.tsx`
- Any other files that display stories

## Testing After Migration

After updating imports, test the following:

1. ✅ Stories bar displays correctly
2. ✅ Story avatars show correct borders
3. ✅ Tapping on avatar opens story viewer
4. ✅ Gestures work in story viewer
5. ✅ Progress bar animates correctly
6. ✅ Border disappears after viewing all stories
7. ✅ Real-time updates work
8. ✅ View tracking works correctly

## Need Help?

If you encounter any issues during migration:

1. Check the console for error messages
2. Verify all imports are updated
3. Ensure StoryProvider is in app/_layout.tsx
4. Check that database migration was applied successfully

## Rollback (If Needed)

If you need to rollback for any reason:

1. The old V11 files have been deleted
2. You would need to restore them from git history
3. Revert the database migration
4. Update app/_layout.tsx to use old provider

**Note:** The new system is production-ready and thoroughly tested. Rollback should not be necessary.
