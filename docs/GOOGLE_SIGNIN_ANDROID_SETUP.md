
# Google Sign-In Android Setup Guide

## Overview

This guide explains how to properly configure Google Sign-In for Android in your BarLive app using Supabase Auth.

## Issues Addressed

1. **Google Sign-In getting stuck on consent screen** - Fixed by proper redirect URL configuration and deep linking
2. **Expo Notifications warning** - Documented that push notifications require a development build in SDK 53+

## Prerequisites

Before you begin, ensure you have:

- A Google Cloud Console project
- A Supabase project (ID: `embntaqwlwmgazvrglaf`)
- Android development environment set up

## Step 1: Configure Google Cloud Console for Android

### 1.1 Create Android OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click **Create Credentials** > **OAuth client ID**
4. Select **Android** as the application type

### 1.2 Get SHA-1 Certificate Fingerprint

You need **two** SHA-1 fingerprints:
- One for **development** (debug keystore)
- One for **production** (release keystore)

#### For Development (Debug Keystore):

```bash
# On macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# On Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

#### For Production (Release Keystore):

```bash
# Replace with your actual keystore path
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

### 1.3 Configure OAuth Client

1. **Package name**: `com.barlive.app` (from app.json)
2. **SHA-1 certificate fingerprint**: Paste the SHA-1 from the previous step
3. Click **Create**
4. **Important**: Create **separate** OAuth clients for debug and release keystores

### 1.4 Copy Client IDs

After creating the OAuth clients, you'll get Client IDs like:
```
123456789-abcdefghijklmnop.apps.googleusercontent.com
```

Copy **all** Client IDs (debug and release).

## Step 2: Configure Supabase

### 2.1 Enable Google Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication** > **Providers**
3. Find **Google** and click **Enable**

### 2.2 Add Client IDs

In the Google provider settings:

1. **Authorized Client IDs**: Add **all** your Client IDs (Web, Android Debug, Android Release) separated by commas:
   ```
   web-client-id.apps.googleusercontent.com,
   android-debug-client-id.apps.googleusercontent.com,
   android-release-client-id.apps.googleusercontent.com
   ```

2. **Client Secret**: Add your Google OAuth client secret (from Web OAuth client)

3. **Skip nonce check**: Leave **unchecked** for better security

### 2.3 Configure Redirect URLs

In Supabase Dashboard > **Authentication** > **URL Configuration**:

Add these redirect URLs:
```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
natively://auth/callback
com.barlive.app://auth/callback
http://localhost:19006/auth/callback
```

## Step 3: Configure app.json

The `app.json` has been updated with proper deep linking configuration:

```json
{
  "expo": {
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
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "scheme": "natively"
  }
}
```

## Step 4: Test Google Sign-In

### 4.1 Development Testing

1. **Build the app**:
   ```bash
   npx expo run:android
   ```

2. **Test the flow**:
   - Tap "Continuar con Google"
   - Browser opens with Google consent screen
   - Select your Google account
   - Grant permissions
   - Browser should redirect back to the app
   - User should be logged in

### 4.2 Debugging

If Google Sign-In fails, check the logs:

```bash
npx expo start --android
```

Look for these log messages:
- `[Google Auth] Iniciando Google Sign-In`
- `[Google Auth] OAuth URL: ...`
- `[Google Auth] Resultado de autenticación: success`
- `[Google Auth] URL de callback recibida: ...`
- `[Google Auth] Tokens encontrados: ...`
- `[Google Auth] Sesión establecida para usuario: ...`

### 4.3 Common Issues

#### Issue: "Google Sign-In no está configurado"
**Solution**: Enable Google provider in Supabase Dashboard and add Client IDs

#### Issue: "No se pudieron obtener los tokens"
**Solution**: 
- Verify SHA-1 fingerprints are correct
- Ensure all Client IDs are added to Supabase
- Check that redirect URLs are configured

#### Issue: Browser doesn't redirect back to app
**Solution**:
- Verify intent filters in app.json
- Rebuild the app after changing app.json
- Check that the scheme matches (`natively://`)

#### Issue: "Error estableciendo sesión"
**Solution**:
- Check Supabase logs for authentication errors
- Verify that the user's email is allowed in Supabase Auth settings
- Ensure the Google account has the required permissions

## Step 5: Push Notifications (Development Build Required)

### Important Note

Starting with Expo SDK 53, **push notifications are not available in Expo Go**. You need to create a **development build**.

### 5.1 Create Development Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS project
eas project:init

# Create development build for Android
eas build -p android --profile development
```

### 5.2 Install Development Build

1. After the build completes, download the `.apk` file
2. Install it on your Android device:
   ```bash
   adb install path/to/your-app.apk
   ```

### 5.3 Test Push Notifications

Push notifications will now work in the development build (but not in Expo Go).

## Step 6: Production Build

When you're ready for production:

### 6.1 Create Release Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore barlive-release.keystore -alias barlive-key -keyalg RSA -keysize 2048 -validity 10000
```

### 6.2 Get Production SHA-1

```bash
keytool -list -v -keystore barlive-release.keystore -alias barlive-key
```

### 6.3 Create Production OAuth Client

1. Go to Google Cloud Console
2. Create a new Android OAuth client with:
   - Package name: `com.barlive.app`
   - SHA-1: Your production SHA-1 fingerprint

### 6.4 Update Supabase

Add the production Client ID to Supabase Dashboard > Authentication > Providers > Google

### 6.5 Build for Production

```bash
eas build -p android --profile production
```

## Verification Checklist

- [ ] Google Cloud Console has Android OAuth clients (debug + release)
- [ ] SHA-1 fingerprints are correct for both debug and release
- [ ] All Client IDs are added to Supabase
- [ ] Redirect URLs are configured in Supabase
- [ ] Intent filters are configured in app.json
- [ ] App has been rebuilt after app.json changes
- [ ] Google Sign-In works in development
- [ ] Development build created for push notifications
- [ ] Production OAuth client created with release SHA-1

## Additional Resources

- [Supabase Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo Deep Linking Guide](https://docs.expo.dev/guides/deep-linking/)
- [Google OAuth Android Setup](https://developers.google.com/identity/sign-in/android/start)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Support

If you continue to experience issues:

1. Check the console logs for detailed error messages
2. Verify all configuration steps above
3. Test with a fresh Google account
4. Ensure your device has Google Play Services installed
5. Try clearing app data and cache

## Summary

The main fixes implemented:

1. **Proper redirect URL configuration** - Added `natively://auth/callback` for native apps
2. **Intent filters in app.json** - Configured deep linking for Android
3. **Improved token extraction** - Parse tokens from both hash and query parameters
4. **Better error handling** - More descriptive error messages
5. **Development build documentation** - Clear instructions for push notifications

Your Google Sign-In should now work correctly on Android! 🎉
