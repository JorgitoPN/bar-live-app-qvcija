
# Momento System Fixes - Summary

## Issues Fixed

### 1. "+" Icon Visibility on Social Feed
**Problem**: The "+" icon on the Momento carousel was being hidden behind the circular border.

**Solution**:
- Changed `overflow: 'hidden'` to `overflow: 'visible'` on the avatar container
- Increased icon size from 28px to 30px
- Adjusted positioning with negative offsets (-2px) to move it outside the border
- Added very high z-index (100) and elevation (10) for Android
- Added shadow effects for better visibility
- Changed border color from white to `colors.background` for better contrast in both light and dark modes

**Files Modified**:
- `components/momento/MomentoCarousel.tsx`

### 2. RLS Policy Violation on Momento Upload
**Problem**: Users were getting "StorageApiError: new row violates row-level security policy" when trying to upload Momentos.

**Root Cause**: The RLS policy on the `momentos` table requires:
```sql
(auth.uid() = autor_id) AND (
  (tipo = 'usuario') OR 
  (tipo = 'local' AND local_id IN (
    SELECT local_id FROM propietarios_locales 
    WHERE propietario_id = auth.uid()
  ))
)
```

**Solution**:
- Reorganized data preparation to happen BEFORE image upload
- Ensured `autor_id` is always set to the authenticated user's ID
- Properly set `tipo` to 'usuario' or 'local' based on active profile
- Set `local_id` only when uploading as a local
- Added comprehensive error logging
- Added specific error messages for RLS violations
- Verified ownership before attempting the insert

**Files Modified**:
- `components/momento/MomentoUpload.tsx`

## Technical Details

### Storage RLS Policy
The storage bucket requires files to be uploaded with the user's ID in the path:
```
momentos/{user_id}/{filename}
```

This is enforced by the policy:
```sql
(bucket_id = 'momentos' AND auth.uid()::text = (storage.foldername(name))[1])
```

### Database RLS Policy
The momentos table INSERT policy ensures:
1. The `autor_id` matches the authenticated user
2. For user momentos: `tipo = 'usuario'`
3. For local momentos: `tipo = 'local'` AND the user owns the local (verified via `propietarios_locales`)

## Testing Checklist

- [ ] Upload momento as user profile
- [ ] Upload momento as local profile (with ownership)
- [ ] Verify "+" icon is visible above the border on social feed
- [ ] Verify "+" icon is visible on user profile page
- [ ] Verify "+" icon is visible on local profile page
- [ ] Verify momentos appear in carousel after upload
- [ ] Verify neon green border appears for unviewed momentos
- [ ] Verify momentos expire after 24 hours

## Error Messages

### Before Fix
```
[MomentoUpload] Error uploading: StorageApiError: new row violates row-level security policy
```

### After Fix
If RLS error occurs, users now see:
```
Error de permisos
No tienes permisos para crear este Momento. Verifica que estés autenticado correctamente.
```

## Database Schema

### momentos table
```sql
- id: uuid (PK)
- autor_id: uuid (FK -> auth.users) NOT NULL
- tipo: text NOT NULL ('usuario' | 'local')
- local_id: uuid (FK -> locales) NULLABLE
- imagen_url: text NOT NULL
- categoria: text NULLABLE
- likes_count: integer DEFAULT 0
- vistas_count: integer DEFAULT 0
- created_at: timestamp DEFAULT now()
- expires_at: timestamp DEFAULT now() + 24 hours
```

### propietarios_locales table
```sql
- id: uuid (PK)
- propietario_id: uuid (FK -> auth.users) NOT NULL
- local_id: uuid (FK -> locales) NOT NULL
- rol: text
- activo: boolean
- created_at: timestamp
- updated_at: timestamp
```

## Next Steps

1. Test the upload functionality with both user and local profiles
2. Monitor logs for any remaining RLS issues
3. Consider adding a loading state during ownership verification
4. Add analytics to track momento upload success/failure rates
