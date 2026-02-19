
# Android UI Fixes - v113.0

## Issues Fixed

### 1. **Reduced Header-to-Content Margin (Explorar Page)**
**Problem:** Excessive white space between the header and the first venue in the list.

**Solution:**
- Reduced `HEADER_MAX_HEIGHT` from 380px to 340px on Android (360px on iOS)
- This reduces the `marginTop` applied to the FlatList content
- Result: Less white space, venues appear closer to the header

**Files Changed:**
- `app/(tabs)/explorar/index.tsx`

**Code Changes:**
```typescript
// Before:
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 380 : 400;

// After:
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 340 : 360;
```

---

### 2. **ProfileSwitcher Dropdown Arrow (Android)**
**Problem:** Role selector in the header showed a question mark ("?") instead of the down arrow icon on Android.

**Solution:**
- Changed `android_material_icon_name` from `"chevron.down"` (invalid) to `"arrow_drop_down"` (valid Material icon)
- The iOS icon `"chevron.down"` remains unchanged as it's a valid SF Symbol

**Files Changed:**
- `app/(tabs)/explorar/index.tsx`

**Code Changes:**
```typescript
// Before:
<IconSymbol 
  ios_icon_name="chevron.down" 
  android_material_icon_name="chevron.down"  // ❌ Invalid Material icon
  size={scaleIconSize(16)} 
  color={colors.headerText} 
/>

// After:
<IconSymbol 
  ios_icon_name="chevron.down" 
  android_material_icon_name="arrow_drop_down"  // ✅ Valid Material icon
  size={scaleIconSize(16)} 
  color={colors.headerText} 
/>
```

---

### 3. **Post Options Menu (Three Dots Icon)**
**Problem:** Posts showed a question mark ("?") instead of the three-dot menu icon on Android.

**Solution:**
- Changed `android_material_icon_name` from `"ellipsis"` (invalid) to `"more_vert"` (valid Material icon)
- The iOS icon `"ellipsis"` remains unchanged as it's a valid SF Symbol
- Ensured the three-dot menu ALWAYS shows, regardless of `hideTagIcon` prop

**Files Changed:**
- `components/social/PostViewerModal.tsx`

**Code Changes:**
```typescript
// Before:
<IconSymbol 
  ios_icon_name="ellipsis" 
  android_material_icon_name="ellipsis"  // ❌ Invalid Material icon
  size={moreVertIconSize} 
  color={colors.text} 
/>

// After:
<IconSymbol 
  ios_icon_name="ellipsis" 
  android_material_icon_name="more_vert"  // ✅ Valid Material icon
  size={moreVertIconSize} 
  color={colors.text} 
/>
```

**Additional Fix:**
- Added comment clarifying that `hideTagIcon` only affects image tagging, NOT the options menu
- The three-dot menu now always appears, even when accessed from profile grid

---

## Valid Material Icon Names Reference

For future reference, here are the correct Material icon names to use:

### Navigation & Actions
- `arrow_drop_down` - Dropdown arrow (NOT "chevron.down")
- `more_vert` - Vertical three dots (NOT "ellipsis")
- `more_horiz` - Horizontal three dots
- `arrow_back` - Back arrow
- `arrow_forward` - Forward arrow
- `close` - Close/X icon
- `menu` - Hamburger menu

### Common Icons
- `home` - Home icon
- `person` - Person/user icon
- `search` - Search icon
- `settings` - Settings icon
- `favorite` - Heart icon (filled)
- `favorite_border` - Heart icon (outline)
- `star` - Star icon
- `notifications` - Bell icon
- `phone` - Phone icon
- `email` - Email icon

### Reference
Always check the Material Icons library for valid names:
https://fonts.google.com/icons

---

## Testing Checklist

- [x] Reduced margin between header and first venue on Explorar page
- [x] Role selector dropdown arrow shows correctly on Android
- [x] Three-dot menu shows correctly on posts on Android
- [x] All icons render without question marks on Android
- [x] iOS icons remain unchanged and functional
- [x] Header scroll animation still works correctly
- [x] Mode selector modal functions properly

---

## Version History

**v113.0** (Current)
- ✅ Reduced header-to-content margin (340px Android, 360px iOS)
- ✅ Fixed role selector dropdown arrow on Android (`arrow_drop_down`)
- ✅ Fixed post options three-dot menu on Android (`more_vert`)

**v112.0** (Previous)
- Header scroll animation improvements
- Mode selector functionality
- Category filter unification

---

## Notes

- All changes are backward compatible
- No database migrations required
- No breaking changes to existing functionality
- Android-specific fixes do not affect iOS behavior
