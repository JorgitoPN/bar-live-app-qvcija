
# Google Sign-In Android Setup Guide - UPDATED

## Overview

This guide explains how to properly configure Google Sign-In for Android in your BarLive app using Supabase Auth with the native `@react-native-google-signin/google-signin` library.

## What Changed

**Previous Implementation (BROKEN):**
- Used OAuth web flow with `expo-web-browser`
- Got stuck on Google consent screen
- Couldn't properly redirect back to the app

**New Implementation (WORKING):**
- Uses native `@react-native-google-signin/google-signin` library
- Uses `signInWithIdToken` method from Supabase
- Proper native Android integration
- No browser redirects needed

## Prerequisites

Before you begin, ensure you have:

- A Google Cloud Console project
- A Supabase project (ID: `embntaqwlwmgazvrglaf`)
- Android development environment set up
- Package installed: `@react-native-google-signin/google-signin` ✅

## Step 1: Configure Google Cloud Console

### 1.1 Create Web OAuth Client ID

**IMPORTANT:** For native Google Sign-In to work, you need a **Web Client ID**, not an Android Client ID.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click **Create Credentials** > **OAuth client ID**
4. Select **Web application** as the application type
5. Name it something like "BarLive Web Client"
6. Add authorized redirect URIs:
   ```
   https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
   http://localhost:19006/auth/callback
   ```
7. Click **Create**
8. **Copy the Client ID** - You'll need this for the next steps

The Web Client ID will look like:
```
123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

### 1.2 Create Android OAuth Client ID (Optional but Recommended)

While the Web Client ID is what you'll use in the code, creating an Android OAuth client helps with Google Play Services integration:

1. Click **Create Credentials** > **OAuth client ID** again
2. Select **Android** as the application type
3. **Package name**: `com.barlive.app`
4. **SHA-1 certificate fingerprint**: Get it using the command below

#### Get SHA-1 Certificate Fingerprint

For **development** (debug keystore):
```bash
# On macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# On Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

For **production** (release keystore):
```bash
# Replace with your actual keystore path
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

Copy the SHA-1 fingerprint and paste it in the Google Cloud Console.

## Step 2: Configure Supabase

### 2.1 Enable Google Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `embntaqwlwmgazvrglaf`
3. Navigate to **Authentication** > **Providers**
4. Find **Google** and click **Enable**

### 2.2 Add Client IDs

In the Google provider settings:

1. **Authorized Client IDs**: Add your **Web Client ID** (and optionally Android Client IDs):
   ```
   123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
   ```
   
   If you have multiple (Web, Android Debug, Android Release), separate them with commas:
   ```
   web-client-id.apps.googleusercontent.com,
   android-debug-client-id.apps.googleusercontent.com,
   android-release-client-id.apps.googleusercontent.com
   ```

2. **Client Secret**: Add your Google OAuth client secret (from the Web OAuth client)

3. **Skip nonce check**: Leave **unchecked** for better security

4. Click **Save**

### 2.3 Configure Redirect URLs (for Web)

In Supabase Dashboard > **Authentication** > **URL Configuration**:

Add these redirect URLs:
```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
http://localhost:19006/auth/callback
```

**Note:** For native Android, redirect URLs are not used since we're using the native sign-in flow.

## Step 3: Update Your Code

### 3.1 Update utils/auth.ts

The `utils/auth.ts` file has been updated to use the native Google Sign-In library. 

**IMPORTANT:** You need to replace the placeholder Web Client ID with your actual Web Client ID:

Open `utils/auth.ts` and find this line:
```typescript
webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // TODO: Replace with your Web Client ID
```

Replace it with your actual Web Client ID from Step 1.1:
```typescript
webClientId: '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
```

### 3.2 Verify app.json Configuration

The `app.json` should have the correct package name:

```json
{
  "expo": {
    "android": {
      "package": "com.barlive.app"
    }
  }
}
```

## Step 4: Rebuild Your App

**IMPORTANT:** After installing the new library and updating the configuration, you MUST rebuild your app:

```bash
# Clear cache and rebuild
npx expo start --clear

# For Android
npx expo run:android
```

**Note:** The native Google Sign-In library requires a native build. It will NOT work in Expo Go. You must use:
- `npx expo run:android` for development
- `eas build` for production builds

## Step 5: Test Google Sign-In

### 5.1 Development Testing

1. **Build and run the app**:
   ```bash
   npx expo run:android
   ```

2. **Test the flow**:
   - Tap "Continuar con Google"
   - Native Google account picker appears
   - Select your Google account
   - Grant permissions
   - User should be logged in immediately (no browser redirect!)

### 5.2 Debugging

Check the logs for these messages:

```bash
npx expo start
```

Look for:
- `[Google Auth Native] Configurando Google Sign-In`
- `[Google Auth Native] Verificando Google Play Services`
- `[Google Auth Native] Iniciando sign in`
- `[Google Auth Native] Usuario obtenido: { hasIdToken: true, email: '...' }`
- `[Google Auth Native] Autenticando con Supabase usando ID token`
- `[Google Auth Native] Usuario autenticado: ...`
- `[Google Auth Native] Google Sign-In completado exitosamente`

### 5.3 Common Issues and Solutions

#### Issue: "Google Play Services not available"
**Solution**: 
- Ensure your Android device/emulator has Google Play Services installed
- Update Google Play Services to the latest version
- Use a device/emulator with Google Play (not AOSP)

#### Issue: "Developer Error" or "Error 10"
**Solution**:
- Verify the SHA-1 fingerprint is correct
- Make sure you're using the debug keystore SHA-1 for development
- Rebuild the app after changing configuration

#### Issue: "Google Sign-In no está configurado correctamente"
**Solution**:
- Verify you've added the Web Client ID to `utils/auth.ts`
- Ensure the Web Client ID is added to Supabase Dashboard
- Check that Google provider is enabled in Supabase

#### Issue: "No se pudo obtener el token de autenticación"
**Solution**:
- Check that the Web Client ID in the code matches the one in Google Cloud Console
- Verify the Web Client ID is added to Supabase's "Authorized Client IDs"
- Ensure you're using the Web Client ID, not the Android Client ID

#### Issue: App crashes when tapping Google Sign-In
**Solution**:
- Make sure you rebuilt the app after installing the library
- Check that `@react-native-google-signin/google-signin` is properly installed
- Verify the package name in app.json matches the one in Google Cloud Console

## Step 6: Production Build

### 6.1 Create Release Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore barlive-release.keystore -alias barlive-key -keyalg RSA -keysize 2048 -validity 10000
```

### 6.2 Get Production SHA-1

```bash
keytool -list -v -keystore barlive-release.keystore -alias barlive-key
```

### 6.3 Create Production Android OAuth Client

1. Go to Google Cloud Console
2. Create a new **Android** OAuth client with:
   - Package name: `com.barlive.app`
   - SHA-1: Your production SHA-1 fingerprint

### 6.4 Update Supabase

Add the production Android Client ID to Supabase Dashboard > Authentication > Providers > Google > Authorized Client IDs

### 6.5 Build for Production

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Login
eas login

# Build for production
eas build -p android --profile production
```

## Verification Checklist

- [ ] Web OAuth Client ID created in Google Cloud Console
- [ ] Android OAuth Client ID created (optional but recommended)
- [ ] SHA-1 fingerprints are correct for debug and release
- [ ] Web Client ID added to `utils/auth.ts`
- [ ] All Client IDs added to Supabase Dashboard
- [ ] Google provider enabled in Supabase
- [ ] Package name matches in app.json and Google Cloud Console
- [ ] App rebuilt after installing library and updating configuration
- [ ] Google Sign-In works in development
- [ ] Production OAuth client created with release SHA-1

## Key Differences from Web OAuth Flow

| Feature | Web OAuth Flow (Old) | Native Sign-In (New) |
|---------|---------------------|---------------------|
| Library | `expo-web-browser` | `@react-native-google-signin/google-signin` |
| User Experience | Opens browser, redirects | Native account picker |
| Configuration | Redirect URLs | Web Client ID |
| Works in Expo Go | Yes | No (requires native build) |
| Android Integration | Deep linking | Native Google Play Services |
| Reliability | Can get stuck | More reliable |

## Additional Resources

- [Supabase Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [React Native Google Sign-In Documentation](https://github.com/react-native-google-signin/google-signin)
- [Google OAuth Android Setup](https://developers.google.com/identity/sign-in/android/start)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)

## Summary

The main changes implemented:

1. **Installed native library**: `@react-native-google-signin/google-signin`
2. **Updated auth flow**: Now uses `signInWithIdToken` instead of OAuth redirect
3. **Simplified configuration**: Only needs Web Client ID in code
4. **Better user experience**: Native account picker instead of browser
5. **More reliable**: No redirect issues or stuck consent screens

Your Google Sign-In should now work correctly on Android! 🎉

## Next Steps

1. **Replace the Web Client ID** in `utils/auth.ts` with your actual Web Client ID
2. **Rebuild your app** using `npx expo run:android`
3. **Test Google Sign-In** on your Android device
4. **Create production build** when ready to publish

If you continue to experience issues, check the console logs and verify all configuration steps above.
