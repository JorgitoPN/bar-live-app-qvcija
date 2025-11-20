
# Complete Android Setup Guide - Google Sign-In & Push Notifications

## Overview

This guide addresses the two main issues you're experiencing on Android:

1. **Google Sign-In getting stuck on consent screen** ✅ FIXED
2. **Expo Notifications error requiring development build** ✅ DOCUMENTED

## Issue 1: Google Sign-In on Android

### Problem

The Google Sign-In flow was getting stuck on the consent screen showing:
```
Vas a volver a iniciar sesión en embntaqwlwmgazvrglaf.supabase.co
```

The user could see the consent screen but the app wouldn't receive the authentication callback.

### Root Cause

The previous implementation used the OAuth web flow with browser redirects, which doesn't work reliably on Android native apps. The proper way to implement Google Sign-In on Android is using the native Google Sign-In library.

### Solution

We've implemented the native Google Sign-In flow using `@react-native-google-signin/google-signin` library with Supabase's `signInWithIdToken` method.

### Setup Steps

#### 1. Install Dependencies ✅

The library has been installed:
```bash
npm install @react-native-google-signin/google-signin
```

#### 2. Configure Google Cloud Console

**Create Web OAuth Client ID:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click **Create Credentials** > **OAuth client ID**
4. Select **Web application**
5. Add authorized redirect URIs:
   ```
   https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
   http://localhost:19006/auth/callback
   ```
6. Click **Create** and copy the **Client ID**

**Create Android OAuth Client ID (Optional but Recommended):**

1. Click **Create Credentials** > **OAuth client ID**
2. Select **Android**
3. Package name: `com.barlive.app`
4. Get SHA-1 fingerprint:
   ```bash
   # Debug keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
5. Paste the SHA-1 fingerprint
6. Click **Create**

#### 3. Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `embntaqwlwmgazvrglaf`
3. Navigate to **Authentication** > **Providers** > **Google**
4. Enable the provider
5. Add your **Web Client ID** to "Authorized Client IDs"
6. Add your **Client Secret** (from Web OAuth client)
7. Save

#### 4. Update Your Code

**IMPORTANT:** Open `utils/auth.ts` and replace this line:

```typescript
webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // TODO: Replace with your Web Client ID
```

With your actual Web Client ID:

```typescript
webClientId: '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
```

#### 5. Rebuild Your App

**CRITICAL:** You MUST rebuild the app after installing the native library:

```bash
# Clear cache
npx expo start --clear

# Rebuild for Android
npx expo run:android
```

**Note:** This will NOT work in Expo Go. You need a native build.

#### 6. Test Google Sign-In

1. Run the app on your Android device
2. Tap "Continuar con Google"
3. Native Google account picker should appear
4. Select your account
5. You should be logged in immediately!

### How It Works Now

**Before (Broken):**
```
App → Browser → Google Consent → Redirect → App (STUCK HERE)
```

**After (Working):**
```
App → Native Google Sign-In → ID Token → Supabase → Logged In ✅
```

### Troubleshooting Google Sign-In

#### Error: "Google Play Services not available"
- Ensure your device has Google Play Services installed
- Update Google Play Services to the latest version
- Use a device with Google Play (not AOSP emulator)

#### Error: "Developer Error" or "Error 10"
- Verify SHA-1 fingerprint is correct
- Use debug keystore SHA-1 for development
- Rebuild the app after configuration changes

#### Error: "No se pudo obtener el token"
- Check Web Client ID in `utils/auth.ts`
- Verify Web Client ID is in Supabase Dashboard
- Ensure Google provider is enabled in Supabase

## Issue 2: Expo Notifications Error

### Problem

You're seeing this error:
```
expo-notifications: Android Push notifications (remote notifications) 
functionality provided by expo-notifications was removed from Expo Go 
with the release of SDK 53. Use a development build instead of Expo Go.
```

### Root Cause

Starting with Expo SDK 53 (you're using SDK 54), **push notifications are not available in Expo Go**. This is an intentional change by Expo because push notifications require native configuration that can't be provided in the generic Expo Go app.

### Solution

You need to create a **development build** to use push notifications.

### What Still Works in Expo Go

✅ **Local notifications** - You can schedule and display local notifications
✅ **Notification permissions** - Request and check permissions
✅ **Most app features** - Everything except push notifications

❌ **Push notifications** - Remote notifications do NOT work in Expo Go

### Setup Steps for Push Notifications

#### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

#### 2. Login to Expo

```bash
eas login
```

#### 3. Initialize EAS Project

```bash
eas project:init
```

This will:
- Create an `eas.json` file
- Generate a project ID
- Link your project to your Expo account

#### 4. Update app.json

After running `eas project:init`, update the project ID in `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id-here"
      }
    }
  }
}
```

Replace `REPLACE_WITH_YOUR_PROJECT_ID` with the actual project ID from EAS.

#### 5. Create Development Build

```bash
# For Android
eas build -p android --profile development
```

This will:
- Build your app with native code
- Include push notification support
- Create an installable APK

#### 6. Install the Build

1. Download the APK from the EAS build page
2. Transfer it to your Android device
3. Install it (you may need to enable "Install from unknown sources")

Or use ADB:
```bash
adb install path/to/your-app.apk
```

#### 7. Run Your App

```bash
npx expo start --dev-client
```

The app will open in your development build (not Expo Go), and push notifications will work!

### Alternative: Local Development Build

If you don't want to use EAS, you can create a local build:

```bash
npx expo run:android
```

This creates a development build locally without using EAS servers.

### Development Workflow

**During Development (Expo Go):**
```bash
npx expo start
```
- ✅ Test UI and app logic
- ✅ Test local notifications
- ❌ Push notifications won't work

**During Development (Development Build):**
```bash
npx expo start --dev-client
```
- ✅ Test UI and app logic
- ✅ Test local notifications
- ✅ Test push notifications
- ✅ Test Google Sign-In

**Production:**
```bash
eas build -p android --profile production
```
- ✅ Full push notification support
- ✅ Optimized build
- ✅ Ready for Google Play Store

## Complete Setup Checklist

### Google Sign-In Setup
- [ ] Web OAuth Client ID created in Google Cloud Console
- [ ] Android OAuth Client ID created (optional)
- [ ] SHA-1 fingerprint added to Android OAuth client
- [ ] Web Client ID added to `utils/auth.ts`
- [ ] Web Client ID added to Supabase Dashboard
- [ ] Google provider enabled in Supabase
- [ ] App rebuilt with `npx expo run:android`
- [ ] Google Sign-In tested and working

### Push Notifications Setup
- [ ] EAS CLI installed
- [ ] EAS project initialized
- [ ] Project ID added to app.json
- [ ] Development build created
- [ ] Development build installed on device
- [ ] Push notifications tested and working

## Testing Your Setup

### Test Google Sign-In

1. Open the app on your Android device
2. Tap "Continuar con Google"
3. Select your Google account from the native picker
4. Verify you're logged in

**Expected logs:**
```
[Google Auth Native] Configurando Google Sign-In
[Google Auth Native] Verificando Google Play Services
[Google Auth Native] Iniciando sign in
[Google Auth Native] Usuario obtenido: { hasIdToken: true, email: '...' }
[Google Auth Native] Autenticando con Supabase usando ID token
[Google Auth Native] Usuario autenticado: ...
[Google Auth Native] Google Sign-In completado exitosamente
```

### Test Push Notifications

1. Ensure you're running the development build (not Expo Go)
2. Grant notification permissions when prompted
3. Send a test notification
4. Verify you receive the notification

**Expected logs:**
```
[Notifications] Iniciando registro...
[Notifications] Estado de permisos existente: granted
[Notifications] ✅ Push token obtenido: ExponentPushToken[...]
[Notifications] Canales de Android configurados
```

## Common Issues

### Issue: "This app won't run without Google Play Services"
**Solution:** Your device needs Google Play Services. Use a device with Google Play or a Google Play-enabled emulator.

### Issue: "Developer Error" when signing in with Google
**Solution:** 
- Verify SHA-1 fingerprint matches your debug keystore
- Rebuild the app after configuration changes
- Check that package name matches in app.json and Google Cloud Console

### Issue: "Push notifications not working"
**Solution:**
- Ensure you're using a development build, not Expo Go
- Verify EAS project ID is configured in app.json
- Check that notification permissions are granted

### Issue: "App crashes on startup"
**Solution:**
- Clear cache: `npx expo start --clear`
- Rebuild: `npx expo run:android`
- Check for any missing dependencies

## Production Deployment

### 1. Create Release Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore barlive-release.keystore -alias barlive-key -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Get Production SHA-1

```bash
keytool -list -v -keystore barlive-release.keystore -alias barlive-key
```

### 3. Create Production Android OAuth Client

1. Go to Google Cloud Console
2. Create Android OAuth client with production SHA-1
3. Add production Client ID to Supabase

### 4. Configure EAS for Production

Create or update `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### 5. Build for Production

```bash
eas build -p android --profile production
```

### 6. Submit to Google Play Store

```bash
eas submit -p android
```

## Summary

### What We Fixed

1. **Google Sign-In**: Switched from OAuth web flow to native Google Sign-In library
2. **Push Notifications**: Documented that development build is required (not a bug, it's expected behavior)

### What You Need to Do

1. **Add your Web Client ID** to `utils/auth.ts`
2. **Rebuild your app** with `npx expo run:android`
3. **Create a development build** for push notifications (optional, but recommended)

### Key Takeaways

- **Google Sign-In** now uses native Android integration (more reliable)
- **Push notifications** require a development build (this is normal in Expo SDK 54)
- **Expo Go** is great for development but has limitations for native features
- **Development builds** give you the best of both worlds: fast refresh + native features

## Resources

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## Support

If you continue to experience issues:

1. Check the console logs for detailed error messages
2. Verify all configuration steps in this guide
3. Ensure you're using a development build (not Expo Go)
4. Test with a fresh Google account
5. Clear app data and cache

Both issues should now be resolved! 🎉
