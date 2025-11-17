
# Food Plate Avatar Design Implementation

## Overview
This document describes the implementation of the food plate avatar design across the BarLive social network app. The design gives all avatars a distinctive hospitality/restaurant aesthetic by making them look like food plates.

## Components

### FoodPlateAvatar
Located at: `components/common/FoodPlateAvatar.tsx`

**Purpose**: Main avatar component for larger displays (stories, profile headers, etc.)

**Features**:
- Circular plate design with rim and shadow effects
- Story ring gradient for unviewed stories
- Add button overlay for creating new stories
- Customizable size (default: 88px)
- Placeholder support with icons or text initials

**Props**:
```typescript
interface FoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  isViewed?: boolean;
  showAddButton?: boolean;
  placeholderIcon?: string;
  placeholderText?: string;
  style?: ViewStyle;
}
```

### MiniFoodPlateAvatar
Located at: `components/common/MiniFoodPlateAvatar.tsx`

**Purpose**: Smaller avatar component for post headers, comments, search results, etc.

**Features**:
- Same plate aesthetic at smaller sizes
- Optimized shadows and borders for small displays
- Customizable size (default: 42px)
- Placeholder support with icons or text initials

**Props**:
```typescript
interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  placeholderIcon?: string;
  placeholderText?: string;
  style?: ViewStyle;
}
```

## Design Specifications

### Visual Structure
1. **Outer Plate** (100% of size)
   - White background (#FFFFFF)
   - Light gray border (#E8E8E8)
   - Border width: 8% of size
   - Drop shadow for depth

2. **Inner Rim Shadow** (84% of size)
   - Subtle inner border
   - Creates depth perception
   - Semi-transparent black (rgba(0, 0, 0, 0.08))

3. **Food/Image Container** (75% of size)
   - Light gray background (#F5F5F5)
   - Contains the actual avatar image
   - Circular crop with overflow hidden
   - Inner shadow for depth

4. **Story Ring** (when active)
   - Gradient from primary to secondary color
   - 4px padding around plate
   - Only visible for unviewed stories

5. **Add Button** (when shown)
   - 34% of plate size
   - Positioned bottom-right
   - Gradient background
   - Plus icon in white

## Usage Examples

### Stories Bar
```tsx
<FoodPlateAvatar
  imageUrl={user.avatar}
  size={90}
  hasStory={hasActiveStory}
  isViewed={allStoriesViewed}
  showAddButton={!hasActiveStory}
  placeholderText={user.nombre}
/>
```

### Profile Header
```tsx
<FoodPlateAvatar
  imageUrl={local.imagen_url}
  size={88}
  hasStory={localStories.length > 0}
  isViewed={!hasUnviewedStories}
  placeholderIcon="building.2"
/>
```

### Post Header
```tsx
<MiniFoodPlateAvatar
  imageUrl={post.autor?.avatar}
  size={42}
  placeholderText={post.autor?.nombre}
/>
```

### Search Results
```tsx
<MiniFoodPlateAvatar
  imageUrl={result.avatar}
  size={48}
  placeholderText={result.nombre}
/>
```

## Implementation Locations

The food plate avatar design should be used in:

1. **Social Feed** (`app/(tabs)/social/index.tsx`)
   - Stories bar (large avatars)
   - Post headers (mini avatars)
   - Search results (mini avatars)

2. **Profile Screens**
   - User profile (`app/(tabs)/perfil/index.tsx`)
   - Local profile (`app/perfil/local.tsx`)
   - Other user profiles (`app/perfil/usuario.tsx`)

3. **Story Viewer**
   - Story author avatar in header
   - Story stats modal avatars

4. **Comments**
   - Comment author avatars
   - Reply author avatars

5. **Chat/Messages**
   - Chat list avatars
   - Message bubbles

6. **Notifications**
   - Notification item avatars

## Color Scheme

### Plate Colors
- Base: `#FFFFFF` (white)
- Border: `#E8E8E8` (light gray)
- Food area: `#F5F5F5` (very light gray)

### Story Ring
- Gradient: `colors.primary` → `colors.secondary`
- Applied when: `hasStory && !isViewed`

### Shadows
- Plate shadow: `rgba(0, 0, 0, 0.15)` with 8px radius
- Food shadow: `rgba(0, 0, 0, 0.1)` with 4px radius
- Mini plate shadow: `rgba(0, 0, 0, 0.1)` with 4px radius

## Accessibility

- Maintains circular shape for easy recognition
- High contrast between plate and food area
- Clear visual hierarchy
- Touch targets remain the same size
- Screen reader compatible

## Performance Considerations

- Uses native View components for optimal performance
- Shadows use elevation on Android for better performance
- Images are properly sized and cached
- No expensive animations on mount

## Future Enhancements

Potential improvements for the food plate design:

1. **Animated Transitions**
   - Subtle bounce when story ring appears
   - Smooth fade for story ring removal

2. **Customization**
   - Different plate colors for different user types
   - Special plate designs for verified accounts
   - Seasonal plate variations

3. **Interactions**
   - Ripple effect on press
   - Subtle scale animation on long press
   - Haptic feedback on interaction

4. **Variations**
   - Square plates for certain contexts
   - Different rim styles
   - Textured plate backgrounds

## Testing Checklist

- [ ] Stories bar displays correctly
- [ ] Story rings show for unviewed stories
- [ ] Add button appears when no stories
- [ ] Post headers use mini avatars
- [ ] Search results use mini avatars
- [ ] Profile headers use large avatars
- [ ] Placeholders work with text initials
- [ ] Placeholders work with icons
- [ ] Shadows render correctly on iOS
- [ ] Shadows render correctly on Android
- [ ] Performance is acceptable with many avatars
- [ ] Touch targets are accessible
- [ ] Images load and display correctly

## Maintenance Notes

- Keep plate proportions consistent across sizes
- Maintain 75% ratio for food area
- Keep 8% ratio for rim width
- Test on various screen sizes
- Verify shadow performance on older devices
