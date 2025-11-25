
# Google OAuth Configuration Guide

This guide explains how to properly configure Google OAuth for the BarLive app to fix authentication issues.

## Problem Summary

The app was experiencing these issues:
- "Safari no puede abrir la página porque la dirección no es válida"
- "OAuth state parameter missing"
- "token has invalid claims: token is expired"
- Authentication stuck on Google login screen

## Root Cause

The redirect URLs configured in Google Cloud Console didn't match the URLs being used by the app in different environments (Expo Go vs standalone).

## Solution

### 1. Configure Redirect URLs in Google Cloud Console

You need to add **ALL** of these redirect URLs to your Google Cloud Console OAuth configuration:

#### For Expo Go (Development):
```
exp://127.0.0.1:8081/--/auth/callback
exp://localhost:8081/--/auth/callback
```

#### For Standalone App (Production):
```
natively://auth/callback
com.barlive.app://auth/callback
```

#### For Supabase (Required):
```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
```

#### For Web (if applicable):
```
http://localhost:19006/auth/callback
https://yourdomain.com/auth/callback
```

### 2. Steps to Configure in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID (or create one if you don't have it)
5. Under **Authorized redirect URIs**, add ALL the URLs listed above
6. Click **Save**

### 3. Configure in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** and click to configure
5. Enable the provider
6. Add your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
7. Make sure the **Redirect URL** shows: `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
8. Click **Save**

### 4. Android-Specific Configuration

For Android, you also need to configure the SHA-1 fingerprint:

#### Development (Debug):
```bash
# Get your debug SHA-1
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Production (Release):
```bash
# Get your release SHA-1
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

Add these SHA-1 fingerprints to your Google Cloud Console:
1. Go to **APIs & Services** > **Credentials**
2. Find your **Android** OAuth client (or create one)
3. Add the SHA-1 fingerprints
4. Set the package name to: `com.barlive.app`

### 5. Verify app.json Configuration

Make sure your `app.json` has the correct schemes configured:

```json
{
  "expo": {
    "scheme": "natively",
    "ios": {
      "bundleIdentifier": "com.barlive.app",
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
              "host": "embntaqwlwmgazvrglaf.supabase.co",
              "pathPrefix": "/auth/v1/callback"
            },
            {
              "scheme": "natively"
            },
            {
              "scheme": "com.barlive.app"
            },
            {
              "scheme": "exp"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    }
  }
}
```

## Testing the Configuration

### In Expo Go:
1. Run `npm run dev`
2. Open the app in Expo Go
3. Try to sign in with Google
4. You should be redirected to Google's login page
5. After authentication, you should be redirected back to the app

### In Standalone App:
1. Build the app: `eas build --platform android` or `eas build --platform ios`
2. Install the app on your device
3. Try to sign in with Google
4. You should be redirected to Google's login page
5. After authentication, you should be redirected back to the app

## Troubleshooting

### "Safari cannot open the page because the address is invalid"
- **Cause**: The redirect URL is not properly configured in Google Cloud Console
- **Solution**: Make sure ALL redirect URLs are added to Google Cloud Console

### "OAuth state parameter missing"
- **Cause**: The OAuth state token expired before the callback completed
- **Solution**: This is now handled by the updated code which waits for the session to be established

### "token has invalid claims: token is expired"
- **Cause**: The OAuth flow took too long and the state token expired
- **Solution**: The updated code now handles this by checking for existing sessions

### Still stuck on Google login screen
- **Cause**: Deep link not being handled properly
- **Solution**: Make sure the app.json schemes are correctly configured and the app is rebuilt

## How the Flow Works Now

1. User clicks "Sign in with Google"
2. App calls `signInWithGoogle()` which:
   - Determines the correct redirect URL based on environment
   - Calls Supabase OAuth with the redirect URL
   - Opens the Google OAuth page in a browser
3. User authenticates with Google
4. Google redirects to the configured redirect URL with tokens
5. The app's deep link handler (`app/_layout.tsx`) catches the redirect:
   - Extracts tokens from the URL
   - Sets the Supabase session
   - Navigates to the callback screen
6. The callback screen (`app/auth/callback.tsx`):
   - Waits for the session to be fully established
   - Gets the user profile
   - Redirects to the appropriate screen based on user state

## Important Notes

- The redirect URL **must** match exactly between Google Cloud Console and the app
- For Expo Go, the URL includes the dev server address (e.g., `exp://127.0.0.1:8081`)
- For standalone apps, the URL uses the custom scheme (e.g., `natively://`)
- Supabase always needs its own redirect URL configured
- After changing redirect URLs in Google Cloud Console, it may take a few minutes to propagate

## Additional Resources

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)
- [Expo Web Browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
