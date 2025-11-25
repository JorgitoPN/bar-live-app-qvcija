
# Google OAuth Authentication Fix - January 2025

## Problem Description

The app was getting stuck on "Conectando con Google..." (Connecting with Google...) during Google Sign-In, both in Expo Go and standalone builds. The authentication process would not complete, leaving users unable to log in.

## Root Causes

1. **Redirect URL Mismatch**: The redirect URL logic was not properly handling different environments (Expo Go vs standalone)
2. **Token Extraction Issues**: The token extraction from the OAuth callback URL was not robust enough
3. **Session Detection**: Supabase's automatic session detection from URL was interfering with manual token handling
4. **Deep Link Handling**: The deep link listener was not properly catching and processing OAuth callbacks
5. **Insufficient Logging**: Lack of detailed logging made it difficult to diagnose where the process was failing

## Solutions Implemented

### 1. Enhanced Redirect URL Logic (`utils/auth.ts`)

```typescript
const getRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth/callback`;
    }
    return 'http://localhost:19006/auth/callback';
  }
  
  const isExpoGo = Constants.appOwnership === 'expo';
  
  if (isExpoGo) {
    // In Expo Go, use Supabase's callback URL directly
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    return `${supabaseUrl}/auth/v1/callback`;
  }
  
  // For standalone apps, use custom scheme
  return 'natively://auth/callback';
};
```

**Why this works:**
- Expo Go doesn't support custom URL schemes properly, so we use Supabase's callback URL
- Standalone apps use the custom `natively://` scheme
- Web uses the current origin

### 2. Improved Token Extraction

Added comprehensive token extraction logic that:
- Tries hash parameters first (standard OAuth flow)
- Falls back to query parameters (some OAuth providers)
- Checks for existing session if tokens aren't in URL
- Provides detailed logging at each step

### 3. Disabled Automatic Session Detection

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disabled for manual control
    flowType: 'pkce', // Use PKCE for better security
  },
});
```

**Why this works:**
- Prevents Supabase from automatically trying to extract tokens from URL
- Gives us full control over when and how tokens are processed
- Avoids race conditions between automatic and manual token handling

### 4. Enhanced Deep Link Handling (`app/_layout.tsx`)

```typescript
const handleDeepLink = async (event: { url: string }) => {
  // Prevent multiple simultaneous deep link handling
  if (isHandlingDeepLink.current) {
    return;
  }

  if (event.url.includes('access_token') || 
      event.url.includes('auth/callback') || 
      event.url.includes('auth/v1/callback')) {
    isHandlingDeepLink.current = true;
    
    // Extract and set tokens
    // Navigate to callback screen
    
    setTimeout(() => {
      isHandlingDeepLink.current = false;
    }, 2000);
  }
};
```

**Why this works:**
- Prevents duplicate processing of the same deep link
- Handles multiple OAuth callback URL patterns
- Properly sets session before navigating to callback screen

### 5. Comprehensive Debug Logging (`app/auth/callback.tsx`)

Added detailed debug logging that:
- Shows each step of the authentication process
- Displays token extraction attempts
- Shows session state changes
- Visible in development mode for troubleshooting

## Testing Checklist

### Expo Go (iOS/Android)
- [ ] Open app in Expo Go
- [ ] Tap "Continuar con Google"
- [ ] Complete Google sign-in in browser
- [ ] Verify redirect back to app
- [ ] Verify successful login
- [ ] Check console logs for any errors

### Standalone Build (iOS/Android)
- [ ] Build standalone app
- [ ] Install on device
- [ ] Tap "Continuar con Google"
- [ ] Complete Google sign-in in browser
- [ ] Verify redirect back to app
- [ ] Verify successful login
- [ ] Check console logs for any errors

### Web
- [ ] Open app in browser
- [ ] Click "Continuar con Google"
- [ ] Complete Google sign-in
- [ ] Verify redirect to callback page
- [ ] Verify successful login
- [ ] Check browser console for any errors

## Configuration Requirements

### Supabase Dashboard

1. **Enable Google Provider**
   - Go to Authentication > Providers
   - Enable Google
   - Add your Google OAuth Client ID and Secret

2. **Configure Redirect URLs**
   Add these URLs to your allowed redirect URLs:
   - `http://localhost:19006/auth/callback` (for web development)
   - `https://yourdomain.com/auth/callback` (for web production)
   - `natively://auth/callback` (for standalone apps)
   - `https://[your-project-ref].supabase.co/auth/v1/callback` (for Expo Go)

### Google Cloud Console

1. **Create OAuth 2.0 Client ID**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID for Web application
   - Add authorized redirect URIs:
     - `https://[your-project-ref].supabase.co/auth/v1/callback`

2. **For Android (Standalone)**
   - Create OAuth 2.0 Client ID for Android
   - Add your app's package name: `com.barlive.app`
   - Add your SHA-1 certificate fingerprint

3. **For iOS (Standalone)**
   - Create OAuth 2.0 Client ID for iOS
   - Add your app's bundle ID: `com.barlive.app`

### app.json Configuration

Ensure your `app.json` has the correct URL schemes:

```json
{
  "expo": {
    "scheme": "natively",
    "ios": {
      "bundleIdentifier": "com.barlive.app",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["natively", "com.barlive.app", "exp"]
          }
        ]
      }
    },
    "android": {
      "package": "com.barlive.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "[your-project-ref].supabase.co",
              "pathPrefix": "/auth/v1/callback"
            },
            { "scheme": "natively" },
            { "scheme": "com.barlive.app" },
            { "scheme": "exp" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## Troubleshooting

### Issue: Still stuck on "Conectando con Google..."

**Solution:**
1. Check console logs for detailed error messages
2. Verify Supabase Google provider is enabled
3. Verify redirect URLs are correctly configured
4. Try clearing app data and reinstalling

### Issue: "Provider not enabled" error

**Solution:**
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials
4. Save changes

### Issue: Redirect not working in Expo Go

**Solution:**
1. Verify you're using the Supabase callback URL for Expo Go
2. Check that the URL scheme is registered in app.json
3. Try restarting Expo Go

### Issue: Tokens not found in callback URL

**Solution:**
1. Check console logs to see what URL was received
2. Verify the OAuth flow completed successfully
3. Check if there's an error parameter in the URL
4. Verify Google OAuth credentials are correct

## Additional Notes

- The fix includes extensive logging that can be viewed in the console
- In development mode, debug information is displayed on the callback screen
- The authentication flow now has better error handling and user feedback
- Session persistence is handled by SecureStore on native platforms

## Related Files

- `utils/auth.ts` - Main authentication logic
- `app/auth/callback.tsx` - OAuth callback handler
- `app/_layout.tsx` - Deep link listener
- `utils/supabase.ts` - Supabase client configuration
- `app/auth/login-popup.tsx` - Login UI

## Future Improvements

1. Add retry logic for failed token extraction
2. Implement better error messages for users
3. Add analytics to track authentication success/failure rates
4. Consider implementing Apple Sign-In as an alternative
5. Add unit tests for authentication flow
