
# User-Local Assignment Cleanup Fix v55.0

## Problem Description

The user `jorgepereznoyagh@gmail.com` had residual data showing they were assigned to "Bar A Coviña" even though they no longer owned that local. This was causing incorrect state in the application.

## Root Cause

The issue was caused by:

1. **Inactive records in `propietarios_locales`**: When a user's local assignment was removed, the record was set to `activo=false` but not deleted
2. **Cancelled subscriptions in `suscripciones_locales`**: Subscription records were set to `estado='cancelada'` but not cleaned up
3. **Missing filtering in ModeContext**: The `ModeContext` was loading ALL local assignments without filtering by `activo=true`

## Solution Implemented

### 1. Database Cleanup (Migration)

Created migration `fix_user_local_assignment_cleanup` that:

- ✅ Deleted the specific inactive record for user `jorgepereznoyagh@gmail.com`
- ✅ Deleted the cancelled subscription for the same user
- ✅ Created `cleanup_inactive_owner_assignments()` function to periodically clean up old inactive records
- ✅ Created `auto_cleanup_inactive_owner()` trigger function that automatically:
  - Cancels subscriptions when `propietarios_locales.activo` is set to false
  - Clears `locales.propietario_id` if it matches
  - Updates user's `rol_app` to 'cliente' if they have no other active locals
- ✅ Created `remove_user_from_local()` function for complete user-local dissociation

### 2. ModeContext Fixes (v55.0)

Updated `contexts/ModeContext.tsx` to:

- ✅ Filter by `activo=true` when loading owned locals in `loadOwnedLocals()`
- ✅ Validate `activo=true` when restoring saved local profile on app initialization
- ✅ Check `activo=true` when auto-selecting first local in propietario mode
- ✅ Verify `activo=true` when switching to a local profile

### 3. Database Functions

#### `cleanup_inactive_owner_assignments()`
Periodic cleanup function that:
- Deletes inactive `propietarios_locales` records older than 7 days
- Deletes cancelled `suscripciones_locales` records older than 30 days

#### `auto_cleanup_inactive_owner()` (Trigger)
Automatically runs when `propietarios_locales.activo` changes from true to false:
- Cancels active subscriptions for that owner-local pair
- Clears the local's `propietario_id` if it matches
- Updates user's `rol_app` to 'cliente' if they have no other active locals

#### `remove_user_from_local(user_id, local_id)`
Complete removal function that:
- Deletes from `propietarios_locales`
- Cancels subscriptions in `suscripciones_locales`
- Clears `locales.propietario_id`
- Updates user's `rol_app` and `local_profile_id` if needed

## Verification

After applying the fix:

```sql
SELECT 
  u.id as user_id,
  u.email,
  u.nombre,
  u.rol_app,
  u.local_profile_id,
  COUNT(pl.id) as propietarios_locales_count,
  COUNT(sl.id) as suscripciones_count
FROM usuarios u
LEFT JOIN propietarios_locales pl ON u.id = pl.propietario_id
LEFT JOIN suscripciones_locales sl ON u.id = sl.propietario_id
WHERE u.email = 'jorgepereznoyagh@gmail.com'
GROUP BY u.id, u.email, u.nombre, u.rol_app, u.local_profile_id;
```

Result:
- `propietarios_locales_count`: 0 ✅
- `suscripciones_count`: 0 ✅
- `rol_app`: 'admin' ✅
- `local_profile_id`: null ✅

## Prevention

The implemented triggers and functions ensure that:

1. **Automatic cleanup**: When a local assignment is deactivated, all related data is automatically cleaned up
2. **Filtered queries**: All queries in ModeContext now filter by `activo=true`
3. **Periodic maintenance**: The `cleanup_inactive_owner_assignments()` function can be called periodically to remove old inactive records

## Usage

### Manual Cleanup
To manually clean up old inactive records:
```sql
SELECT cleanup_inactive_owner_assignments();
```

### Remove User from Local
To completely remove a user from a local:
```sql
SELECT remove_user_from_local(
  'user-uuid-here'::uuid,
  'local-uuid-here'::uuid
);
```

## Testing

To test the fix:

1. ✅ Verify user `jorgepereznoyagh@gmail.com` no longer shows "Bar A Coviña" in their owned locals
2. ✅ Verify switching to propietario mode doesn't show any locals for this user
3. ✅ Verify the user can only interact as a cliente
4. ✅ Test that setting `propietarios_locales.activo=false` triggers automatic cleanup
5. ✅ Test that `remove_user_from_local()` function works correctly

## Related Files

- `contexts/ModeContext.tsx` - Updated to filter by `activo=true`
- Migration: `fix_user_local_assignment_cleanup`
- This documentation: `docs/USER_LOCAL_ASSIGNMENT_FIX_V55.md`

## Version History

- **v55.0** (Current): Fixed inactive local assignment filtering
- **v53.0**: Fixed propietario mode auto-assignment
- **v52.0**: Previous version

## Notes

- The trigger `auto_cleanup_inactive_owner` runs automatically on UPDATE of `propietarios_locales`
- The cleanup function `cleanup_inactive_owner_assignments()` should be called periodically (e.g., daily via cron job)
- All changes are backwards compatible with existing code
