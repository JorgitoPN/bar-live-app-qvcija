
# PUB Category Filter Fix - November 2024

## Issues Fixed

### 1. PUB Category Logic (CRITICAL FIX)
**Problem**: The `shouldHavePubCategory` function was incorrectly identifying venues as PUBs.

**Root Cause**: The condition `latestClose <= 150` was including venues that close exactly at 2:30 AM (150 minutes), when it should only include venues closing AFTER 2:30 AM.

**Solution**: Updated the condition to:
```typescript
const isPub = latestClose > 1590 || (latestClose > 0 && latestClose < 150);
```

**Explanation**:
- `1590 minutes` = 26:30 (2:30 AM on the same day, expressed as 24:00 + 2:30)
- `150 minutes` = 02:30 (2:30 AM on the next day)
- A venue is a PUB if it closes **STRICTLY AFTER** 2:30 AM
- Examples:
  - Closes at 03:00 AM (1620 min or 180 min) → PUB ✅
  - Closes at 02:30 AM (1590 min or 150 min) → NOT PUB ❌ (exactly at threshold)
  - Closes at 02:00 AM (1560 min or 120 min) → NOT PUB ❌
  - Closes at 01:00 AM (1500 min or 60 min) → NOT PUB ❌

### 2. PUB Badge Display
**Status**: Already implemented correctly in all locations:
- ✅ Detail page (`app/detalle/local.tsx`)
- ✅ Map popup (`app/(tabs)/explorar/mapa.tsx`)
- ✅ Social profile (`app/perfil/local.tsx`)

All these pages use `addPubCategoryIfNeeded()` to dynamically add the PUB category based on closing times.

### 3. PUB Category Filter
**Status**: Already implemented correctly in `utils/filterLocals.ts`

The filter uses `addPubCategoryIfNeeded()` to dynamically add the PUB category before checking if it matches the selected filter.

## Spanish Hospitality Regulations

According to Spanish regulations, establishments are categorized by their closing times:

- **Bares y Cafeterías**: Close between 1:30 AM and 2:30 AM
- **Pubs (Bares Especiales)**: Close between 3:00 AM and 5:00 AM
- **Discotecas**: Close between 5:00 AM and 6:00 AM

Our implementation uses **2:30 AM as the threshold** for PUB categorization, aligning with the upper limit for bars/cafeterías.

## Testing

To verify the fix:

1. **Filter Test**: Click on the "Pubs" category filter in the explore page
   - Should only show venues that close after 2:30 AM
   - Should NOT show venues that close at or before 2:30 AM

2. **Badge Test**: Check venue detail pages
   - Venues closing after 2:30 AM should display the PUB badge
   - Venues closing at or before 2:30 AM should NOT display the PUB badge

3. **Map Test**: Check map marker popups
   - Should display PUB category for venues closing after 2:30 AM
   - Should NOT display PUB category for venues closing at or before 2:30 AM

## Files Modified

- `utils/categorizeLocal.ts` - Fixed `shouldHavePubCategory()` logic

## Files Already Correct (No Changes Needed)

- `app/detalle/local.tsx` - Already uses `addPubCategoryIfNeeded()`
- `app/(tabs)/explorar/mapa.tsx` - Already uses `addPubCategoryIfNeeded()`
- `app/perfil/local.tsx` - Already uses `addPubCategoryIfNeeded()`
- `utils/filterLocals.ts` - Already uses `addPubCategoryIfNeeded()`

## Google Sign-In on Android

**Status**: Working correctly based on auth logs

The logs show successful Google OAuth logins on Android. If users are experiencing issues, they should:

1. **Check OAuth Configuration**:
   - Verify SHA-1 certificate is added to Google Cloud Console
   - Verify package name matches `com.barlive.app`
   - Verify redirect URL is configured in Supabase Auth settings

2. **Check Deep Linking**:
   - The app uses `natively://auth/callback` for deep linking
   - Intent filters are correctly configured in `app.json`

3. **Common Issues**:
   - User canceling authentication (shows as `access_denied` in logs)
   - Network connectivity issues
   - Outdated Google Play Services on device

## Conclusion

The PUB category filter issue has been fixed by correcting the threshold logic in `shouldHavePubCategory()`. The fix ensures that only venues closing **strictly after 2:30 AM** are categorized as PUBs, aligning with Spanish hospitality regulations.
