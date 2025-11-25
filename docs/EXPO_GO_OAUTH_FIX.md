
# Expo Go OAuth Authentication Fix

## Problem

When running the app in Expo Go on iOS, the Google Sign-in flow was getting stuck on the Google consent screen. After the user clicked "Continue", the app would not properly handle the redirect back, leaving the user on the consent screen.

## Root Cause

The issue was caused by incorrect deep link handling in Expo Go. Expo Go uses a different URL scheme (`exp://`) compared to standalone apps (`natively://`), and the OAuth redirect URL was not properly configured for the Expo Go environment.

## Solution

### 1. Dynamic Redirect URL Detection

Updated `utils/auth.ts` to detect the runtime environment and use the appropriate redirect URL:

```typescript
const getRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/auth/callback`;
  }
  
  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  
  if (isExpoGo) {
    // Use Expo Go deep link format
    return `exp://127.0.0.1:8081/--/auth/callback`;
  }
  
  // For standalone apps
  return 'natively://auth/callback';
};
```

### 2. Supabase Client Configuration

Updated `utils/supabase.ts` to disable automatic session detection from URL on native platforms:

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Only on web
  },
});
```

### 3. Deep Link Listener

Added a deep link listener in `app/_layout.tsx` to handle OAuth callbacks:

```typescript
useEffect(() => {
  const handleDeepLink = async (event: { url: string }) => {
    if (event.url.includes('access_token') || event.url.includes('auth/callback')) {
      // Extract and set session tokens
      // Navigate to callback screen
    }
  };

  const subscription = Linking.addEventListener('url', handleDeepLink);
  
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink({ url });
  });

  return () => subscription.remove();
}, [router]);
```

### 4. Enhanced Callback Screen

Updated `app/auth/callback.tsx` to better handle token extraction from both hash and query parameters:

```typescript
// Parse tokens from URL
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Try hash first (web OAuth flow)
if (url.includes('#')) {
  const hashParams = new URLSearchParams(url.split('#')[1]);
  accessToken = hashParams.get('access_token');
  refreshToken = hashParams.get('refresh_token');
}

// Try query params (native OAuth flow)
if (!accessToken && url.includes('?')) {
  const queryString = url.split('?')[1].split('#')[0];
  const queryParams = new URLSearchParams(queryString);
  accessToken = queryParams.get('access_token');
  refreshToken = queryParams.get('refresh_token');
}
```

### 5. App Configuration

Updated `app.json` to include the `exp` scheme for Expo Go compatibility:

```json
{
  "ios": {
    "infoPlist": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLSchemes": [
            "natively",
            "com.barlive.app",
            "exp"
          ]
        }
      ]
    }
  }
}
```

## Testing

To test the fix:

1. **In Expo Go (iOS)**:
   - Open the app in Expo Go
   - Tap "Continuar con Google"
   - Complete the Google sign-in flow
   - The app should now properly redirect back and complete authentication

2. **In Standalone App**:
   - Build and install the standalone app
   - The OAuth flow should work with the `natively://` scheme

3. **On Web**:
   - Open the app in a web browser
   - The OAuth flow should work with the web redirect URL

## Key Changes

- ✅ Dynamic redirect URL based on runtime environment
- ✅ Proper deep link handling for Expo Go
- ✅ Enhanced token extraction from OAuth callback
- ✅ Disabled automatic session detection on native
- ✅ Added deep link listener in root layout
- ✅ Updated app.json with exp scheme

## Supabase Configuration

Make sure your Supabase project has the following redirect URLs configured:

1. **For Expo Go**: `exp://127.0.0.1:8081/--/auth/callback`
2. **For Standalone**: `natively://auth/callback`
3. **For Web**: `https://yourdomain.com/auth/callback`

To add these in Supabase:
1. Go to Authentication > URL Configuration
2. Add each URL to the "Redirect URLs" list
3. Save changes

## Troubleshooting

If authentication still doesn't work:

1. **Check Supabase Logs**: Look for OAuth errors in the Supabase dashboard
2. **Check Console Logs**: Look for `[Google Auth]` and `[Callback]` logs
3. **Verify Redirect URLs**: Make sure all redirect URLs are configured in Supabase
4. **Clear App Data**: Uninstall and reinstall the app to clear cached sessions
5. **Check Google OAuth Configuration**: Verify that the Google OAuth client is properly configured

## Notes

- The `exp://` scheme only works in Expo Go
- Standalone apps will use the `natively://` scheme
- Web apps use the standard HTTPS redirect
- The deep link listener in `_layout.tsx` ensures callbacks are handled even if the app is in the background
