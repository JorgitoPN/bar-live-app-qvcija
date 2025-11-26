
# 🧩 Global Story Synchronization System

## Overview
This document describes the implementation of a global story state synchronization system that ensures consistent avatar outlines and story states across the entire platform.

## ✅ Key Features Implemented

### 1. Global Story State Management
- **StoryStateContext**: Centralized context that manages story view states globally
- **Real-time Synchronization**: Automatically updates when stories are viewed, deleted, or expired
- **Cross-Platform Consistency**: Story states are synchronized across all components

### 2. Consistent Avatar Outlines
- **Unified Color Scheme**: Green-to-blue gradient (`#10B981` → `#3B82F6`) used everywhere
- **Smart Visibility Logic**:
  - Shows outline when user has active, unviewed stories
  - Hides outline when all stories are viewed or expired
  - Own stories always show outline (for viewing stats)
  - Automatically disappears when story is deleted

### 3. Components Updated

#### Core Components
- `contexts/StoryStateContext.tsx` - Global state management
- `components/common/StoryAvatar.tsx` - Reusable avatar with story outline
- `components/social/NewBarraHistorias.tsx` - Story bar with real-time updates
- `components/social/StoryViewer.tsx` - Story viewer with global state integration

#### Pages Updated
- `app/_layout.tsx` - Added StoryStateProvider
- `app/perfil/usuario.tsx` - Uses global story state
- `app/(tabs)/social/index.tsx` - Integrated with story state

### 4. Icon System
- **constants/SocialIcons.ts**: Unified icon definitions for all social features
- Consistent icons across posts, stories, and profiles
- Platform-specific icons (iOS SF Symbols, Android Material Icons)

### 5. Bug Fixes
- ✅ Fixed Supabase realtime broadcast error in sala-virtual.tsx
- ✅ Fixed RLS policy issues for locales_favoritos
- ✅ Fixed story outline positioning and colors
- ✅ Fixed icon positioning in StoryViewer (moved to right side)

## 🎨 Design Specifications

### Avatar Outline Colors
```typescript
const STORY_OUTLINE_COLORS = ['#10B981', '#3B82F6']; // Green to Blue
```

### Outline Behavior
| State | Outline Visible | Color |
|-------|----------------|-------|
| Active + Unviewed | ✅ Yes | Green→Blue |
| Active + Viewed | ❌ No | - |
| Expired | ❌ No | - |
| Deleted | ❌ No | - |
| Own Story | ✅ Yes | Green→Blue |

### Icon Positioning
- **Story Viewer Controls**: Bottom-right corner
- **Delete Icon**: Same position as Profile page
- **Views Icon (Eye)**: Same position as Profile page
- **Size**: Consistent across all components
- **Color**: White with semi-transparent background

## 📍 Synchronized Locations

The story outline and state are now synchronized across:
1. ✅ Social Page (Feed)
2. ✅ Story Viewer
3. ✅ User Profile
4. ✅ My Profile
5. ✅ Local Profile
6. ⏳ Private Messages (to be implemented)
7. ⏳ Notifications (to be implemented)
8. ⏳ Comments (to be implemented)
9. ⏳ Posts (to be implemented)
10. ⏳ Chats (to be implemented)

## 🔄 Real-time Updates

### Story Views
```typescript
// Automatically syncs when user views a story
await markStoryAsViewed(storyId);
```

### Story Deletions
```typescript
// Automatically syncs when story is deleted
markStoryAsDeleted(storyId);
```

### Story Expiration
- Checked on load and periodically
- Expired stories automatically hidden

## 🚀 Usage Examples

### Using StoryAvatar Component
```typescript
import StoryAvatar from '@/components/common/StoryAvatar';

<StoryAvatar
  userId={user.id}
  userStories={stories}
  avatarUrl={user.avatar}
  userName={user.nombre}
  size={72}
  onPress={handlePress}
  showLabel={true}
/>
```

### Using Story State Hook
```typescript
import { useStoryState } from '@/contexts/StoryStateContext';

const { 
  markStoryAsViewed, 
  isStoryViewed, 
  hasUnviewedStories 
} = useStoryState();

// Check if user has unviewed stories
const showOutline = hasUnviewedStories(userId, userStories);

// Mark story as viewed
await markStoryAsViewed(storyId);
```

### Using Unified Icons
```typescript
import { SOCIAL_ICONS, ICON_SIZES } from '@/constants/SocialIcons';

<IconSymbol
  ios_icon_name={SOCIAL_ICONS.LIKE.ios}
  android_material_icon_name={SOCIAL_ICONS.LIKE.android}
  size={ICON_SIZES.MEDIUM}
  color={colors.primary}
/>
```

## 🔧 Technical Implementation

### Database Tables Used
- `historias` - Story data
- `historia_views` - View tracking
- `usuarios` - User data

### Real-time Channels
- `story-views-{userId}` - View updates
- `story-deletions` - Deletion updates
- `stories-realtime` - General story updates

### Performance Optimizations
- Memoized components to prevent unnecessary re-renders
- Efficient state updates using Map data structure
- Real-time subscriptions only when needed
- Automatic cleanup on unmount

## 📝 Next Steps

To complete the implementation:
1. Add story outline to remaining components (Messages, Notifications, etc.)
2. Implement unified post icons across all post components
3. Add story state persistence for offline support
4. Add analytics for story views and engagement

## 🐛 Known Issues
- None currently

## 📚 Related Documentation
- [Story System Documentation](./NEW_STORY_SYSTEM_2025.md)
- [Performance Optimizations](./PERFORMANCE_OPTIMIZATIONS_2025.md)
- [Real-time Features](./SUPABASE_REALTIME_GUIDE.md)
