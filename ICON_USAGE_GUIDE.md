
# Icon Usage Guide - Quick Reference

## Version 23.0 - Complete Android-iOS Parity

This guide provides quick reference for using icons in the BarLive app with guaranteed Android-iOS parity.

## Basic Usage

### Simple Icon
```typescript
import { IconSymbol } from '@/components/IconSymbol';

<IconSymbol
  ios_icon_name="heart.fill"
  android_material_icon_name="heart"
  size={24}
  color="#FFFFFF"
/>
```

### With Both Naming Conventions
```typescript
// Method 1: Explicit platform names (RECOMMENDED)
<IconSymbol
  ios_icon_name="house.fill"
  android_material_icon_name="home"
  size={28}
  color="#14B8A6"
/>

// Method 2: Single name with automatic mapping
<IconSymbol
  name="house.fill"  // Will be mapped to "home" on Android
  size={28}
  color="#14B8A6"
/>
```

## Common Icons Reference

### Navigation
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Home (filled) | `house.fill` | `home` | Active home tab |
| Home (outlined) | `house` | `home-outline` | Inactive home tab |
| Back arrow | `arrow.left` | `arrow-back` | Navigation back |
| Forward arrow | `arrow.right` | `arrow-forward` | Navigation forward |
| Chevron left | `chevron.left` | `chevron-back` | Dropdown/collapse |
| Chevron right | `chevron.right` | `chevron-forward` | Expand/next |

### Social & Communication
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Heart (filled) | `heart.fill` | `heart` | Liked/favorite |
| Heart (outlined) | `heart` | `heart-outline` | Not liked |
| Message (filled) | `message.fill` | `chatbubble` | Active chat |
| Message (outlined) | `message` | `chatbubble-outline` | Inactive chat |
| Bell (filled) | `bell.fill` | `notifications` | Notifications on |
| Bell (outlined) | `bell` | `notifications-outline` | Notifications off |
| Send | `paperplane.fill` | `send` | Send message |
| Phone | `phone.fill` | `call` | Call action |

### User & Profile
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Person (filled) | `person.fill` | `person` | Active profile |
| Person (outlined) | `person` | `person-outline` | Inactive profile |
| People (filled) | `person.2.fill` | `people` | Active social |
| People (outlined) | `person.2` | `people-outline` | Inactive social |
| Profile circle | `person.circle.fill` | `person-circle` | User avatar |

### Actions
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Add | `plus` | `add` | Add new item |
| Add circle | `plus.circle.fill` | `add-circle` | Add button |
| Remove | `minus` | `remove` | Remove item |
| Close | `xmark` | `close` | Close/dismiss |
| Checkmark | `checkmark` | `checkmark` | Confirm/done |
| Trash | `trash.fill` | `trash` | Delete |
| Edit | `pencil` | `pencil` | Edit item |

### Media
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Photo (filled) | `photo.fill` | `image` | Image/gallery |
| Photo (outlined) | `photo` | `image-outline` | Add photo |
| Camera | `camera.fill` | `camera` | Take photo |
| Video | `video.fill` | `videocam` | Video |
| Play | `play.fill` | `play` | Play media |
| Pause | `pause.fill` | `pause` | Pause media |

### Business & Work
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Briefcase (filled) | `briefcase.fill` | `briefcase` | Active work |
| Briefcase (outlined) | `briefcase` | `briefcase-outline` | Inactive work |
| Building (filled) | `building.2.fill` | `business` | Business/local |
| Building (outlined) | `building.2` | `business-outline` | Business outline |

### Location & Maps
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Location (filled) | `location.fill` | `location` | Current location |
| Location (outlined) | `location` | `location-outline` | Location pin |
| Map | `map.fill` | `map` | Map view |
| Compass | `compass.drawing` | `compass` | Explore/discover |

### System & Settings
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Settings (filled) | `gearshape.fill` | `settings` | Active settings |
| Settings (outlined) | `gear` | `settings-outline` | Inactive settings |
| Info | `info.circle.fill` | `information-circle` | Information |
| Warning | `exclamationmark.triangle.fill` | `warning` | Warning/alert |
| Help | `questionmark.circle.fill` | `help-circle` | Help/support |

### Calendar & Time
| Description | iOS (SF Symbol) | Android (Ionicon) | Usage |
|------------|-----------------|-------------------|-------|
| Calendar | `calendar.badge.clock` | `calendar` | Events/schedule |
| Calendar (outlined) | `calendar` | `calendar-outline` | Calendar view |
| Clock | `clock.fill` | `time` | Time/schedule |

## Tab Navigation Icons

### Complete Tab Icon Setup
```typescript
import { TabIcon } from '@/components/navigation/TabIcon';

// Home Tab
<TabIcon
  iosIconFilled="house.fill"
  iosIconOutlined="house"
  androidIconFilled="home"
  androidIconOutlined="home-outline"
  isActive={isActive}
  size={28}
/>

// Events Tab
<TabIcon
  iosIconFilled="calendar.badge.clock"
  iosIconOutlined="calendar"
  androidIconFilled="calendar"
  androidIconOutlined="calendar-outline"
  isActive={isActive}
  size={28}
/>

// Favorites Tab
<TabIcon
  iosIconFilled="heart.fill"
  iosIconOutlined="heart"
  androidIconFilled="heart"
  androidIconOutlined="heart-outline"
  isActive={isActive}
  size={28}
/>

// Explore Tab
<TabIcon
  iosIconFilled="sparkles"
  iosIconOutlined="sparkles"
  androidIconFilled="compass"
  androidIconOutlined="compass-outline"
  isActive={isActive}
  size={28}
/>

// Social Tab
<TabIcon
  iosIconFilled="person.2.fill"
  iosIconOutlined="person.2"
  androidIconFilled="people"
  androidIconOutlined="people-outline"
  isActive={isActive}
  size={28}
/>

// Profile Tab
<TabIcon
  iosIconFilled="person.fill"
  iosIconOutlined="person"
  androidIconFilled="person"
  androidIconOutlined="person-outline"
  isActive={isActive}
  size={28}
/>

// Management Tab
<TabIcon
  iosIconFilled="building.2.fill"
  iosIconOutlined="building.2"
  androidIconFilled="business"
  androidIconOutlined="business-outline"
  isActive={isActive}
  size={28}
/>

// Admin Tab
<TabIcon
  iosIconFilled="gearshape.fill"
  iosIconOutlined="gear"
  androidIconFilled="settings"
  androidIconOutlined="settings-outline"
  isActive={isActive}
  size={28}
/>
```

## Best Practices

### 1. Always Specify Both Platform Icons
```typescript
// ✅ GOOD: Explicit platform icons
<IconSymbol
  ios_icon_name="heart.fill"
  android_material_icon_name="heart"
  size={24}
  color="#FF0000"
/>

// ⚠️ OK: Relies on automatic mapping
<IconSymbol
  name="heart.fill"
  size={24}
  color="#FF0000"
/>

// ❌ BAD: Only iOS icon specified
<IconSymbol
  ios_icon_name="heart.fill"
  size={24}
  color="#FF0000"
/>
```

### 2. Use Consistent Sizes
```typescript
// Standard sizes
const ICON_SIZES = {
  small: 16,
  medium: 24,
  large: 28,
  xlarge: 32,
};

<IconSymbol
  ios_icon_name="heart.fill"
  android_material_icon_name="heart"
  size={ICON_SIZES.medium}
  color="#FF0000"
/>
```

### 3. Use Theme Colors
```typescript
import { colors } from '@/styles/commonStyles';

<IconSymbol
  ios_icon_name="heart.fill"
  android_material_icon_name="heart"
  size={24}
  color={colors.primary}  // Use theme colors
/>
```

### 4. Handle Active/Inactive States
```typescript
// For tab icons or toggleable buttons
const iconName = isActive ? 'heart.fill' : 'heart';
const androidIconName = isActive ? 'heart' : 'heart-outline';

<IconSymbol
  ios_icon_name={iconName}
  android_material_icon_name={androidIconName}
  size={24}
  color={isActive ? colors.primary : colors.textSecondary}
/>
```

## Troubleshooting

### Icon Shows as "?"
**Problem:** Icon not rendering on Android

**Solution:**
1. Check console logs for missing mapping warning
2. Add mapping to `MAPPING` object in `components/IconSymbol.tsx`
3. Restart development server

### Icons Different Sizes
**Problem:** Icons appear different sizes on iOS vs Android

**Solution:**
1. Verify `size` prop is consistent
2. Check if custom styles are overriding size
3. Use standard size constants

### Icons Wrong Color
**Problem:** Icons not showing correct color

**Solution:**
1. Verify `color` prop is being passed
2. Check if parent component has opacity/filter styles
3. Use theme colors from `commonStyles.ts`

## Adding New Icons

### Step-by-Step Process

1. **Find SF Symbol** (for iOS)
   - Open SF Symbols app on Mac
   - Search for desired icon
   - Note the symbol name (e.g., `star.fill`)

2. **Find Ionicon** (for Android)
   - Visit https://ionic.io/ionicons
   - Search for equivalent icon
   - Note the icon name (e.g., `star`)

3. **Add Mapping**
   ```typescript
   // In components/IconSymbol.tsx
   const MAPPING = {
     // ... existing mappings ...
     "star.fill": "star",
     "star": "star-outline",
   };
   ```

4. **Test on Both Platforms**
   ```typescript
   <IconSymbol
     ios_icon_name="star.fill"
     android_material_icon_name="star"
     size={24}
     color="#FFD700"
   />
   ```

5. **Verify in Console**
   - Check for successful rendering logs
   - Verify no warning messages

## Resources

### Icon Libraries
- **SF Symbols**: https://developer.apple.com/sf-symbols/
- **Ionicons**: https://ionic.io/ionicons
- **Material Icons**: https://fonts.google.com/icons

### Documentation
- **Expo Symbols**: https://docs.expo.dev/versions/latest/sdk/symbols/
- **Expo Vector Icons**: https://docs.expo.dev/guides/icons/

---

**Last Updated:** 2025-01-XX
**Version:** 23.0
**Status:** ✅ Production Ready
