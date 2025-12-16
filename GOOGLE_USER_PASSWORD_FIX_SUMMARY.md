
# Google User Password Configuration Fix - Summary

## Problem Description

Users who created accounts with Google were unable to log in with email/password even after using the password recovery system. The issue occurred because:

1. **Provider Check Blocking Login**: The login screen checked if a user had `provider='google'` and blocked them from logging in with password
2. **Different Password Reset Flow**: The `configurar-password-google.tsx` page used `resetPasswordForEmail` instead of the token-based system
3. **Provider Not Updated**: After setting a password, the `provider` field remained as 'google', causing the login check to continue blocking access

## Solution Implemented

### 1. Updated Password Configuration Flow for Google Users

**File: `app/auth/configurar-password-google.tsx`**

- Changed from using `resetPasswordForEmail` to the token-based system
- Now uses the same flow as regular password recovery:
  1. Request token via `request-password-token` Edge Function
  2. Navigate to `validar-token-password` to enter the 6-digit code
  3. Navigate to `nueva-password-token` to set the new password
- Added `isGoogleUser` flag to track Google users through the flow

### 2. Enhanced Token Validation Screen

**File: `app/auth/validar-token-password.tsx`**

- Added support for `isGoogleUser` parameter
- Passes the flag to the next screen for proper handling
- Updated UI to show appropriate messages for Google users

### 3. Updated Password Setting Screen

**File: `app/auth/nueva-password-token.tsx`**

- Added support for `isGoogleUser` parameter
- Shows different messages for Google users vs regular password reset
- Passes `isGoogleUser` flag to the Edge Function

### 4. Updated Edge Function to Handle Provider Change

**Edge Function: `update-password-with-token`**

- Added logic to update the `provider` field from 'google' to 'email' when a Google user sets a password
- This allows the user to log in with email/password after configuration
- The update happens automatically after password is successfully set

```typescript
// If this is a Google user setting up password, update provider to 'email'
if (isGoogleUser) {
  console.log('[UpdatePasswordWithToken] Updating provider for Google user');
  
  const { error: providerError } = await supabaseAdmin
    .from('usuarios')
    .update({ provider: 'email' })
    .eq('email', normalizedEmail);

  if (providerError) {
    console.error('[UpdatePasswordWithToken] Error updating provider:', providerError);
    // Don't fail the request if we can't update the provider
  } else {
    console.log('[UpdatePasswordWithToken] ✅ Provider updated to email');
  }
}
```

### 5. Fixed Login Screen Logic

**File: `app/auth/login.tsx`**

- Updated `checkIfGoogleUserWithoutPassword` function to only return true if `provider='google'`
- This means users who have set a password (provider updated to 'email') can now log in
- Improved error messages to guide users appropriately

## User Flow

### For Google Users Setting Up Password:

1. **User tries to log in with email/password** → Gets error "Invalid login credentials"
2. **System checks provider** → Detects `provider='google'`
3. **Shows alert**: "Esta cuenta fue creada con Google. ¿Deseas configurar una contraseña para poder iniciar sesión con email?"
4. **User clicks "Configurar contraseña"** → Navigates to `configurar-password-google`
5. **User clicks "Enviar código de verificación"** → Receives 6-digit code via email
6. **User enters code** → Navigates to `validar-token-password`
7. **Code is validated** → Navigates to `nueva-password-token`
8. **User sets new password** → Password is set AND provider is updated to 'email'
9. **Success message shown** → User can now log in with email/password

### After Password Configuration:

- User can log in with **both** Google OAuth and email/password
- The `provider` field is now 'email', so the login screen no longer blocks them
- All user data, roles, and configurations remain intact

## Technical Details

### Database Changes

- No schema changes required
- Only the `provider` field value is updated from 'google' to 'email'

### Edge Function Changes

- **Version**: 4 (deployed)
- **Function**: `update-password-with-token`
- **Change**: Added provider update logic for Google users

### Security Considerations

- Token-based verification ensures only the email owner can set the password
- Tokens expire after 1 hour
- Tokens can only be used once
- Provider update only happens after successful password setting

## Testing Checklist

- [x] Google user can request password configuration
- [x] Token is sent via email
- [x] Token validation works correctly
- [x] Password can be set successfully
- [x] Provider is updated from 'google' to 'email'
- [x] User can log in with email/password after configuration
- [x] Error messages are clear and helpful
- [x] Edge Function handles errors gracefully

## Benefits

1. **Unified Flow**: Google users now use the same secure token-based system as regular password recovery
2. **Better UX**: Clear step-by-step process with helpful instructions
3. **Flexibility**: Users can use both Google and email/password to log in
4. **Security**: Token-based verification ensures only the email owner can set the password
5. **Consistency**: Same UI/UX patterns across all password-related flows

## Notes

- The old `crear-password-google.tsx` file is no longer used and can be removed
- Users who already set a password using the old system may need to use the new flow once to update their provider
- The system is backward compatible - existing email users are not affected
