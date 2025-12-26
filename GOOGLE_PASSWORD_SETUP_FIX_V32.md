
# Google Password Setup Fix v32.0

## Problem Description

After a Google user set up a password through the password configuration flow, the system would still prompt them to set up a password on every subsequent login attempt. This created a frustrating loop where users had to repeatedly change their password.

## Root Cause

The issue occurred because:

1. **Password was saved**: When a Google user configured a password, it was correctly saved in `auth.users` table
2. **Provider field not updated**: The `provider` field in the `usuarios` table remained as 'google' instead of being updated to 'email'
3. **Login check failed**: The `checkIfGoogleUserWithoutPassword` function in the login page checked BOTH:
   - If the user has a password in `auth.users` (✅ true after setup)
   - If the `provider` field is 'google' (❌ still true, causing the prompt)

## Solution Implemented

### 1. Updated Edge Function (`update-password-with-token`)

**File**: `supabase/functions/update-password-with-token/index.ts`

Added logic to update the `provider` field when a Google user sets up a password:

```typescript
// ✅ CRITICAL FIX: Update provider field for Google users
if (isGoogleUser) {
  console.log('[UpdatePasswordWithToken] 🔄 Updating provider field for Google user...');
  
  const { error: providerUpdateError } = await supabaseAdmin
    .from('usuarios')
    .update({ 
      provider: 'email',
      updated_at: new Date().toISOString()
    })
    .eq('email', normalizedEmail);

  if (providerUpdateError) {
    console.error('[UpdatePasswordWithToken] ⚠️ Error updating provider:', providerUpdateError);
    // Don't fail the whole operation, just log the error
  } else {
    console.log('[UpdatePasswordWithToken] ✅ Provider updated to email');
  }
}
```

### 2. Updated Password Validation Screen

**File**: `app/auth/validar-token-password.tsx`

Added client-side provider update as a backup:

```typescript
// ✅ CRITICAL FIX: Update provider field in usuarios table for Google users
if (isGoogleUser) {
  console.log('[ValidarTokenPassword] 🔄 Updating provider field for Google user...');
  
  const { error: updateError } = await supabase
    .from('usuarios')
    .update({ 
      provider: 'email',
      updated_at: new Date().toISOString()
    })
    .eq('email', email.trim().toLowerCase());

  if (updateError) {
    console.error('[ValidarTokenPassword] ⚠️ Error updating provider:', updateError);
    // Don't fail the whole operation, just log the error
  } else {
    console.log('[ValidarTokenPassword] ✅ Provider updated to email');
  }
}
```

### 3. Created Reusable Login Prompt Component

**File**: `components/common/LoginPrompt.tsx`

Created a consistent, reusable component for login prompts across the app:

```typescript
export default function LoginPrompt({
  title = 'Inicia sesión para ver el contenido',
  message = 'Para acceder a esta sección y ver todo el contenido, necesitas iniciar sesión en BarLive.',
  icon = 'lock.fill',
  androidIcon = 'lock',
}: LoginPromptProps)
```

Features:
- Gradient background matching app design
- Customizable title, message, and icon
- Login and register buttons
- Consistent styling across all pages

### 4. Updated Social Page

**File**: `app/(tabs)/social/index.tsx`

Replaced inline login UI with the reusable `LoginPrompt` component:

```typescript
if (!user && !isImpersonating) {
  return (
    <View style={styles.container}>
      <HeaderSocial
        unreadNotifications={0}
        unreadMessages={0}
        onCreatePost={handleCreatePost}
      />
      
      <LoginPrompt
        title="Inicia sesión para ver el contenido"
        message="Para acceder a la página social y ver las publicaciones de tus amigos, necesitas iniciar sesión en BarLive."
        icon="person.2.fill"
        androidIcon="people"
      />
    </View>
  );
}
```

### 5. Updated Favoritos Page

**File**: `app/(tabs)/favoritos/index.tsx`

Replaced inline login UI with the reusable `LoginPrompt` component:

```typescript
if (!user) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>Locales Favoritos</Text>
      </LinearGradient>

      <LoginPrompt
        title="Inicia sesión para ver tus favoritos"
        message="Regístrate o inicia sesión en BarLive para guardar tus locales favoritos y acceder a ellos desde cualquier dispositivo."
        icon="heart.circle"
        androidIcon="favorite"
      />
    </View>
  );
}
```

## Flow Diagram

```
Google User Sets Up Password
         ↓
1. User enters verification code
         ↓
2. Code validated successfully
         ↓
3. User enters new password
         ↓
4. Password saved to auth.users ✅
         ↓
5. Provider field updated to 'email' ✅ (NEW)
         ↓
6. Token marked as used
         ↓
7. User redirected to login
         ↓
8. Login check:
   - Has password? ✅ Yes
   - Provider is 'google'? ❌ No (now 'email')
         ↓
9. No password setup prompt! ✅
         ↓
10. User logs in successfully
```

## Testing Checklist

- [x] Google user can set up password
- [x] Provider field is updated to 'email' after password setup
- [x] Login page doesn't prompt for password setup after it's configured
- [x] User can log in with email and password after setup
- [x] Social page shows consistent login prompt
- [x] Favoritos page shows consistent login prompt
- [x] Login prompt design matches app theme

## Benefits

1. **Fixed Password Loop**: Google users no longer see the password setup prompt after configuring their password
2. **Consistent Design**: All login prompts across the app now use the same design
3. **Better UX**: Users can seamlessly switch between Google login and email/password login
4. **Maintainable Code**: Reusable `LoginPrompt` component reduces code duplication
5. **Proper State Management**: Provider field correctly reflects the authentication method

## Database Changes

The `provider` field in the `usuarios` table is now properly updated:

- **Before password setup**: `provider = 'google'`
- **After password setup**: `provider = 'email'`

This allows the system to correctly identify that the user has configured email authentication.

## Notes

- The fix is implemented in both the Edge Function (server-side) and the client-side as a backup
- The operation doesn't fail if the provider update fails, ensuring password setup always succeeds
- All existing Google users who have already set up passwords will need to go through the password setup flow one more time to update their provider field
- The `LoginPrompt` component can be easily customized for different pages with different icons and messages

## Version History

- **v32.0**: Initial implementation of Google password setup fix and consistent login design
