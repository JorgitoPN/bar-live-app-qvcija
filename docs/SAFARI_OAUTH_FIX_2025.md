
# Safari "Invalid Address" Error Fix - Google OAuth

## Problem Description

After clicking "Continue" on the Google OAuth consent screen in Safari (iOS), the browser shows an error: **"Safari cannot open the page because the address is not valid"** (Safari no puede abrir la página porque la dirección no es válida).

This prevents users from completing the Google Sign-In flow on iOS devices.

## Root Cause

The issue occurs because Safari is trying to redirect to a URL that it doesn't recognize as valid. This happens when:

1. The redirect URL uses a custom URL scheme that Safari doesn't understand
2. The redirect URL is not properly configured in Google Cloud Console
3. The app's URL scheme configuration in `app.json` doesn't match the redirect URL

## Solution

### 1. Update Redirect URL Logic

The redirect URL has been changed from using Supabase's callback URL to using the app's custom URL scheme:

**Before:**
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
return `${supabaseUrl}/auth/v1/callback`;
```

**After:**
```typescript
const customScheme = 'com.barlive.app://auth/callback';
return customScheme;
```

**Why this works:**
- Custom URL schemes are properly recognized by iOS
- The app can register to handle this specific URL scheme
- Safari knows to open the app when it encounters this URL

### 2. Configure Google Cloud Console

You need to add the custom URL scheme to your Google OAuth configuration:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your **OAuth 2.0 Client ID for Web**
4. Click **Edit**
5. Under **Authorized redirect URIs**, add:
   ```
   com.barlive.app://auth/callback
   ```
6. Click **Save**

**Important:** You need to add this to the **Web** client ID, not the iOS client ID. Supabase uses the Web client ID for OAuth flows.

### 3. Verify app.json Configuration

Ensure your `app.json` has the correct URL scheme configuration:

```json
{
  "expo": {
    "scheme": "com.barlive.app",
    "ios": {
      "bundleIdentifier": "com.barlive.app",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": [
              "com.barlive.app"
            ]
          }
        ]
      }
    },
    "android": {
      "package": "com.barlive.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "com.barlive.app"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### 4. Update Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication** > **URL Configuration**
3. Under **Redirect URLs**, add:
   ```
   com.barlive.app://auth/callback
   ```
4. Click **Save**

### 5. Rebuild the App

After making changes to `app.json`, you **must** rebuild the app:

```bash
# Clear cache
npx expo start --clear

# For iOS
npx expo prebuild --platform ios --clean
npx expo run:ios

# For Android
npx expo prebuild --platform android --clean
npx expo run:android
```

## Testing the Fix

### On iOS Device

1. Open the app
2. Tap "Continuar con Google"
3. Select your Google account
4. Tap "Continue" on the consent screen
5. **Expected behavior:**
   - Safari closes automatically
   - App opens and shows "Completando autenticación..."
   - User is logged in successfully

### On Android Device

1. Open the app
2. Tap "Continuar con Google"
3. Select your Google account
4. Tap "Continue" on the consent screen
5. **Expected behavior:**
   - Chrome closes automatically
   - App opens and shows "Completando autenticación..."
   - User is logged in successfully

## Troubleshooting

### Issue: Still getting "Invalid Address" error

**Possible causes:**
1. Google Cloud Console redirect URI not updated
2. Changes not propagated yet (wait 5-10 minutes)
3. App not rebuilt after `app.json` changes

**Solutions:**
1. Double-check Google Cloud Console configuration
2. Wait 10 minutes and try again
3. Rebuild the app: `npx expo prebuild --clean`

### Issue: App doesn't open after OAuth

**Possible causes:**
1. URL scheme not registered in `app.json`
2. App not rebuilt after configuration changes
3. Deep link handler not working

**Solutions:**
1. Verify `app.json` has correct URL scheme
2. Rebuild the app completely
3. Check console logs for deep link handling

### Issue: "Provider not enabled" error

**Possible causes:**
1. Google provider not enabled in Supabase
2. Client ID/Secret not configured

**Solutions:**
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google provider
3. Add Client ID and Secret from Google Cloud Console

### Issue: Tokens not found in callback

**Possible causes:**
1. OAuth flow didn't complete successfully
2. Redirect URL mismatch
3. Token extraction logic failing

**Solutions:**
1. Check console logs for detailed error messages
2. Verify redirect URLs match in all configurations
3. Check if error parameters are present in callback URL

## Configuration Checklist

Before testing, verify:

- [ ] Custom URL scheme added to Google Cloud Console redirect URIs
- [ ] Custom URL scheme added to Supabase redirect URLs
- [ ] `app.json` has correct URL scheme configuration
- [ ] App has been rebuilt after `app.json` changes
- [ ] Google provider is enabled in Supabase Dashboard
- [ ] Client ID and Secret are configured in Supabase
- [ ] Waited 5-10 minutes after Google Cloud Console changes

## Key Changes Made

### utils/auth.ts

- Changed `getRedirectUrl()` to return custom URL scheme for native apps
- Updated `signInWithGoogle()` to set `skipBrowserRedirect: true` for native
- Added token extraction from callback URL in `WebBrowser.openAuthSessionAsync` result
- Improved error handling and logging

### app/_layout.tsx

- Updated deep link handler to recognize custom URL scheme
- Added support for `com.barlive.app://auth/callback` pattern
- Improved token extraction from deep link URL

### app.json

- Simplified URL scheme configuration
- Removed complex intent filters
- Focused on single custom URL scheme

## Why This Approach Works

1. **Custom URL Schemes are Native:** iOS and Android natively support custom URL schemes, making them more reliable than Universal Links for OAuth callbacks.

2. **Direct App Opening:** When Safari encounters `com.barlive.app://`, it knows to open the BarLive app directly, avoiding any "invalid address" errors.

3. **Token Extraction:** The tokens are passed in the URL, and we extract them immediately when the app opens, ensuring a smooth authentication flow.

4. **Fallback Handling:** If token extraction fails, we still redirect to the callback screen which can check for an existing session.

## Additional Notes

- This fix works for both iOS and Android
- The same custom URL scheme is used for both platforms
- Web continues to use the standard web callback URL
- Expo Go may still use Supabase callback URL (development only)

## Related Files

- `utils/auth.ts` - Authentication logic with redirect URL
- `app/_layout.tsx` - Deep link handler
- `app/auth/callback.tsx` - OAuth callback processor
- `app.json` - URL scheme configuration

## Future Improvements

1. Add retry logic for failed token extraction
2. Implement better error messages for users
3. Add analytics to track OAuth success/failure rates
4. Consider implementing Sign in with Apple as alternative
5. Add automated tests for OAuth flow

## Support

If you continue experiencing issues:

1. Check console logs for detailed error messages
2. Verify all configuration steps were completed
3. Ensure app was rebuilt after configuration changes
4. Wait 10 minutes for Google Cloud Console changes to propagate
5. Try clearing app data and reinstalling

## References

- [Expo Deep Linking Guide](https://docs.expo.dev/guides/deep-linking/)
- [Expo Web Browser API](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
