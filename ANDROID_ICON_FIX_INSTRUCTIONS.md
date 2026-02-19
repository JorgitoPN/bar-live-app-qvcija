
# Android Icon Fix Instructions

## Issue
Android shows question marks () instead of icons in:
- Role selector dropdown (cliente, propietario, admin) 
- Three-dot menu in posts

## Solution
Replace IconSymbol components with correct Material Icons names:

### 1. Role Selector Icon
```tsx
<IconSymbol
  ios_icon_name="chevron.down"
  android_material_icon_name="arrow_drop_down"
  size={20}
  color={colors.white}
/>
```

### 2. Post Menu Icon (Three Dots)
```tsx
<IconSymbol
  ios_icon_name="ellipsis"
  android_material_icon_name="more_vert"
  size={24}
  color={colors.white}
/>
```

## Valid Material Icons Names
- `arrow_drop_down` - Dropdown arrow
- `more_vert` - Vertical three dots
- `more_horiz` - Horizontal three dots
- `expand_more` - Expand arrow

## Files to Check
- `components/perfil/ProfileSwitcher.tsx` - Role selector
- `components/social/PostViewerModal.tsx` - Post options
- Any component rendering post cards with menu options
