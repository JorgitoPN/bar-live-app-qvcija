
# 🖼️ Unified Icon System

## Overview
This document describes the unified icon system that ensures consistent iconography across all social features in the app.

## 📦 Icon Constants

All social icons are defined in `constants/SocialIcons.ts`:

```typescript
import { SOCIAL_ICONS, ICON_SIZES, ICON_COLORS } from '@/constants/SocialIcons';
```

## 🎯 Available Icons

### Post Actions
| Action | iOS Icon | Android Icon | Usage |
|--------|----------|--------------|-------|
| Like | `heart` / `heart.fill` | `favorite_border` / `favorite` | Like button |
| Comment | `bubble.right` / `bubble.right.fill` | `chat_bubble_outline` / `chat_bubble` | Comment button |
| Share | `paperplane` / `paperplane.fill` | `send` | Share button |
| Save | `bookmark` / `bookmark.fill` | `bookmark_border` / `bookmark` | Save button |
| More | `ellipsis` | `more_horiz` | More options |

### Story Actions
| Action | iOS Icon | Android Icon | Usage |
|--------|----------|--------------|-------|
| Delete | `trash.fill` | `delete` | Delete story |
| Views | `eye.fill` | `visibility` | View story stats |
| Send | `paperplane.fill` | `send` | Send message |

### User Actions
| Action | iOS Icon | Android Icon | Usage |
|--------|----------|--------------|-------|
| Follow | `person.badge.plus` | `person_add` | Follow user |
| Following | `person.badge.checkmark` | `person_add_disabled` | Unfollow user |
| Message | `message` / `message.fill` | `mail_outline` / `mail` | Send message |

### Navigation
| Action | iOS Icon | Android Icon | Usage |
|--------|----------|--------------|-------|
| Back | `chevron.left` | `arrow_back` | Go back |
| Close | `xmark` | `close` | Close modal |
| Settings | `gear` | `settings` | Settings |

## 📏 Icon Sizes

```typescript
ICON_SIZES.SMALL    // 18px
ICON_SIZES.MEDIUM   // 22px
ICON_SIZES.LARGE    // 26px
ICON_SIZES.XLARGE   // 32px
```

## 🎨 Icon Colors

```typescript
ICON_COLORS.PRIMARY          // Primary brand color
ICON_COLORS.SECONDARY        // Secondary brand color
ICON_COLORS.TEXT             // Main text color
ICON_COLORS.TEXT_SECONDARY   // Secondary text color
ICON_COLORS.HEADER_TEXT      // Header text color
ICON_COLORS.DANGER           // #EF4444 (Red)
ICON_COLORS.SUCCESS          // #10B981 (Green)
ICON_COLORS.WARNING          // #F59E0B (Orange)
```

## 💡 Usage Examples

### Basic Icon
```typescript
import { IconSymbol } from '@/components/IconSymbol';
import { SOCIAL_ICONS, ICON_SIZES } from '@/constants/SocialIcons';
import { colors } from '@/styles/commonStyles';

<IconSymbol
  ios_icon_name={SOCIAL_ICONS.LIKE.ios}
  android_material_icon_name={SOCIAL_ICONS.LIKE.android}
  size={ICON_SIZES.MEDIUM}
  color={colors.primary}
/>
```

### Filled Icon (Active State)
```typescript
<IconSymbol
  ios_icon_name={SOCIAL_ICONS.LIKE.iosFilled}
  android_material_icon_name={SOCIAL_ICONS.LIKE.androidFilled}
  size={ICON_SIZES.MEDIUM}
  color={ICON_COLORS.DANGER}
/>
```

### Dynamic Icon (Toggle State)
```typescript
const [liked, setLiked] = useState(false);

<IconSymbol
  ios_icon_name={liked ? SOCIAL_ICONS.LIKE.iosFilled : SOCIAL_ICONS.LIKE.ios}
  android_material_icon_name={liked ? SOCIAL_ICONS.LIKE.androidFilled : SOCIAL_ICONS.LIKE.android}
  size={ICON_SIZES.MEDIUM}
  color={liked ? ICON_COLORS.DANGER : colors.text}
/>
```

### Icon Button
```typescript
<TouchableOpacity
  style={styles.iconButton}
  onPress={handleLike}
  activeOpacity={0.7}
>
  <IconSymbol
    ios_icon_name={SOCIAL_ICONS.LIKE.ios}
    android_material_icon_name={SOCIAL_ICONS.LIKE.android}
    size={ICON_SIZES.LARGE}
    color={colors.primary}
  />
</TouchableOpacity>
```

## 🔄 Migration Guide

### Before (Inconsistent)
```typescript
// Different icons in different components
<Ionicons name="heart-outline" size={24} color={colors.text} />
<MaterialIcons name="favorite_border" size={22} color={colors.text} />
<IconSymbol ios_icon_name="heart" android_material_icon_name="favorite" size={20} color={colors.text} />
```

### After (Consistent)
```typescript
// Same icon definition everywhere
<IconSymbol
  ios_icon_name={SOCIAL_ICONS.LIKE.ios}
  android_material_icon_name={SOCIAL_ICONS.LIKE.android}
  size={ICON_SIZES.MEDIUM}
  color={colors.text}
/>
```

## 📋 Checklist for New Icons

When adding a new icon:
1. ✅ Add to `SOCIAL_ICONS` constant
2. ✅ Provide both iOS and Android variants
3. ✅ Include filled variant if applicable
4. ✅ Document in this file
5. ✅ Update all existing usages
6. ✅ Test on both platforms

## 🎯 Best Practices

1. **Always use constants**: Never hardcode icon names
2. **Consistent sizing**: Use predefined sizes from `ICON_SIZES`
3. **Semantic colors**: Use color constants that match the action
4. **Platform awareness**: Icons automatically adapt to platform
5. **Accessibility**: Ensure icons have proper labels for screen readers

## 🔍 Finding Icons

### iOS SF Symbols
- Browse: https://developer.apple.com/sf-symbols/
- Search by keyword
- Use exact symbol name

### Android Material Icons
- Browse: https://fonts.google.com/icons
- Search by keyword
- Use exact icon name

## 📝 Notes

- Icons are automatically sized and colored
- Platform-specific icons ensure native look and feel
- Filled variants indicate active/selected states
- All icons support dynamic color changes
