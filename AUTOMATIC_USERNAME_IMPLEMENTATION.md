
# Automatic Username Generation Implementation

## Overview
This document describes the implementation of automatic username generation for new users in BarLive, along with token-based email verification.

## Changes Implemented

### 1. Automatic Username Generation (`app/auth/registro-v6.tsx`)

**Key Features:**
- Automatically generates a unique username during registration based on the user's name
- Username is created using the `generateUsername()` utility function
- Users are informed that they can edit their username later from the Edit Profile page
- Username is stored in both `auth.users.user_metadata` and `usuarios.username` table

**Flow:**
1. User enters name, email, and password
2. System validates input
3. System generates unique username from name (e.g., "Juan Pérez" → "juan_perez" or "juan_perez1" if taken)
4. User account is created in Supabase Auth with username in metadata
5. Username is updated in the `usuarios` table
6. Verification token is sent via email
7. User is redirected to token verification page

**Code Example:**
```typescript
// Generate unique username
const generatedUsername = await generateUsername(nombre.trim());

// Create auth user with username
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: normalizedEmail,
  password: password,
  options: {
    data: {
      nombre: nombre.trim(),
      username: generatedUsername,
      provider: 'barlive',
      email_verified: false,
    },
  },
});

// Update user profile with username
await supabase
  .from('usuarios')
  .update({ username: generatedUsername })
  .eq('id', authData.user.id);
```

### 2. Enhanced Username Generator (`utils/usernameGenerator.ts`)

**Key Features:**
- Works for both regular users and local profiles
- Generates clean, URL-safe usernames
- Checks uniqueness across both `usuarios` and `locales` tables
- Handles special characters, accents, and spaces
- Adds numeric suffixes if base username is taken (e.g., juan_perez1, juan_perez2)
- Fallback to random number if all numeric suffixes are taken

**Functions:**
- `generateUsernameFromName(name)`: Converts name to clean username format
- `isUsernameAvailable(username, excludeUserId?, excludeLocalId?)`: Checks if username is available
- `generateUniqueUsername(name, userId?, localId?)`: Generates unique username with numeric suffixes
- `generateUsername(name)`: Main function for user registration
- `assignUsernameToLocal(localId)`: Assigns username to local profiles with paid plans

**Username Rules:**
- Only lowercase letters, numbers, underscores, and periods
- Minimum 3 characters
- Maximum 30 characters
- No leading or trailing underscores
- Accents and special characters are removed
- Spaces are converted to underscores

### 3. Token-Based Email Verification

**Already Implemented:**
- `app/auth/verificar-cuenta-token.tsx`: Token input page
- Edge Functions:
  - `request-verification-token`: Generates and sends 6-digit token
  - `validate-verification-token`: Validates token
  - `verify-account-with-token`: Marks account as verified

**Flow:**
1. After registration, user receives email with 6-digit token
2. User is redirected to token verification page
3. User enters 6-digit token
4. System validates token (checks expiration and usage)
5. If valid, account is marked as verified
6. User is redirected to login page

### 4. Edit Profile Page (`app/editar/perfil.tsx`)

**Username Editing:**
- Users can edit their username from the Edit Profile page
- Username validation ensures:
  - Minimum 3 characters
  - Only alphanumeric, periods, and underscores
  - Uniqueness across users and locals
- Real-time validation feedback
- Username is displayed with @ prefix

## Database Schema

### usuarios table
```sql
username text UNIQUE NULLABLE
  -- Auto-generated username for users
  -- Can be edited by user from Edit Profile page
  -- Must be unique across both usuarios and locales tables
```

### locales table
```sql
username text UNIQUE NULLABLE
  -- Auto-generated username for locals with paid subscriptions
  -- Can be edited by local owner
  -- Must be unique across both usuarios and locales tables
```

## User Experience

### Registration Flow
1. **Enter Details**: User enters name, email, and password
2. **Auto-Username**: System generates username (e.g., @juan_perez)
3. **Confirmation**: User sees message: "Tu cuenta ha sido creada exitosamente con el nombre de usuario @juan_perez"
4. **Email Sent**: Verification token sent to email
5. **Verify**: User enters 6-digit token
6. **Complete**: Account verified, user can login

### Username Editing
1. Navigate to Profile → Edit Profile
2. See current username with @ prefix
3. Edit username (validation in real-time)
4. Save changes
5. Username updated across the app

## Testing Checklist

- [x] Username generation from various name formats
- [x] Username uniqueness validation
- [x] Special character handling (accents, spaces, etc.)
- [x] Numeric suffix generation when base username is taken
- [x] Username editing from Edit Profile page
- [x] Token-based email verification flow
- [x] Error handling for duplicate emails
- [x] Resend verification token functionality

## Migration Notes

**Existing Users:**
- Users without usernames can set one from Edit Profile page
- No automatic migration needed
- Username field is nullable, so existing users continue to work

**Existing Locals:**
- Locals get usernames when they activate paid subscriptions
- Username generation uses the same utility function
- Local owners can edit usernames from their profile

## Security Considerations

1. **Username Validation**: Only safe characters allowed
2. **Uniqueness**: Checked across both users and locals
3. **Token Expiration**: Verification tokens expire after 1 hour
4. **Single Use**: Tokens can only be used once
5. **Rate Limiting**: Consider implementing rate limiting for token requests

## Future Enhancements

1. **Username Suggestions**: Show available username suggestions during registration
2. **Username History**: Track username changes for moderation
3. **Reserved Usernames**: Prevent use of reserved/inappropriate usernames
4. **Username Search**: Allow users to search by username
5. **Vanity URLs**: Enable profile URLs like barlive.app/@username

## Support & Troubleshooting

### Common Issues

**Issue**: Username already taken
**Solution**: System automatically adds numeric suffix (e.g., juan_perez1)

**Issue**: Verification token not received
**Solution**: User can request new token from verification page

**Issue**: Token expired
**Solution**: User can request new token (tokens expire after 1 hour)

**Issue**: User wants to change username
**Solution**: Navigate to Profile → Edit Profile → Edit username field

## Related Files

- `app/auth/registro-v6.tsx` - Registration page with auto-username
- `app/auth/login-v6.tsx` - Login page with token verification support
- `app/auth/verificar-cuenta-token.tsx` - Token verification page
- `app/editar/perfil.tsx` - Profile editing with username change
- `utils/usernameGenerator.ts` - Username generation utility
- `supabase/functions/request-verification-token/` - Token generation Edge Function
- `supabase/functions/validate-verification-token/` - Token validation Edge Function
- `supabase/functions/verify-account-with-token/` - Account verification Edge Function

## Conclusion

The automatic username generation system provides a seamless onboarding experience for new users while maintaining flexibility for customization. The token-based verification ensures email ownership and account security.
