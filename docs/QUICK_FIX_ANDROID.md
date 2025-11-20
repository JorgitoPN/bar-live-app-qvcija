
# Quick Fix Guide - Android Issues

## 🚨 Issue 1: Google Sign-In Stuck on Consent Screen

### Quick Fix (5 minutes)

1. **Get your Web Client ID from Google Cloud Console:**
   - Go to https://console.cloud.google.com/
   - APIs & Services > Credentials
   - Find your Web OAuth Client ID
   - Copy the Client ID (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)

2. **Add it to Supabase:**
   - Go to https://supabase.com/dashboard
   - Your project > Authentication > Providers > Google
   - Enable Google provider
   - Paste your Web Client ID in "Authorized Client IDs"
   - Save

3. **Update your code:**
   - Open `utils/auth.ts`
   - Find line ~200: `webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'`
   - Replace with your actual Web Client ID
   - Save

4. **Rebuild your app:**
   ```bash
   npx expo start --clear
   npx expo run:android
   ```

5. **Test:**
   - Tap "Continuar con Google"
   - Native account picker should appear
   - Select account
   - You're logged in! ✅

### Why This Works

- **Before:** Used browser OAuth flow (unreliable on Android)
- **After:** Uses native Google Sign-In (reliable, no browser needed)

---

## 🚨 Issue 2: Expo Notifications Error

### Quick Understanding

The error you're seeing is **EXPECTED BEHAVIOR** in Expo SDK 54.

```
expo-notifications: Android Push notifications functionality 
was removed from Expo Go with the release of SDK 53.
Use a development build instead of Expo Go.
```

### What This Means

- ✅ **Local notifications** still work in Expo Go
- ❌ **Push notifications** (remote) do NOT work in Expo Go
- ✅ **Push notifications** work in development builds

### Quick Fix (15 minutes)

**Option 1: Create Development Build (Recommended)**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Initialize project
eas project:init

# Build for Android
eas build -p android --profile development

# Wait for build to complete, then download and install the APK
```

**Option 2: Local Development Build (Faster)**

```bash
# This creates a local build without using EAS
npx expo run:android
```

### What Works Where

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| UI/Logic | ✅ | ✅ |
| Local Notifications | ✅ | ✅ |
| Push Notifications | ❌ | ✅ |
| Google Sign-In | ❌ | ✅ |
| Fast Refresh | ✅ | ✅ |

### Recommendation

For the best development experience:

1. **Use Expo Go** for UI development and testing
2. **Use Development Build** when you need to test:
   - Google Sign-In
   - Push notifications
   - Other native features

---

## 📋 Complete Setup Checklist

### Google Sign-In
- [ ] Created Web OAuth Client ID in Google Cloud Console
- [ ] Added Web Client ID to Supabase Dashboard
- [ ] Updated `utils/auth.ts` with Web Client ID
- [ ] Rebuilt app with `npx expo run:android`
- [ ] Tested Google Sign-In (should work!)

### Push Notifications
- [ ] Understand that Expo Go doesn't support push notifications
- [ ] Created development build (optional, for testing push notifications)
- [ ] Installed development build on device
- [ ] Tested push notifications in development build

---

## 🎯 Priority Actions

### Must Do Now (Google Sign-In)
1. Get Web Client ID from Google Cloud Console
2. Add to Supabase Dashboard
3. Update `utils/auth.ts`
4. Rebuild: `npx expo run:android`

### Can Do Later (Push Notifications)
1. Create development build when you need to test push notifications
2. For now, you can continue using Expo Go for everything else

---

## 🆘 Still Having Issues?

### Google Sign-In Not Working?

**Check these:**
- [ ] Web Client ID is correct in `utils/auth.ts`
- [ ] Web Client ID is in Supabase Dashboard
- [ ] Google provider is enabled in Supabase
- [ ] You rebuilt the app after changes
- [ ] You're NOT using Expo Go (use `npx expo run:android`)

**Common errors:**
- "Developer Error" → Wrong SHA-1 fingerprint
- "Error 10" → Package name mismatch
- "Play Services not available" → Device needs Google Play Services

### Push Notifications Not Working?

**This is normal!** Push notifications don't work in Expo Go.

**To fix:**
- Create a development build
- Install it on your device
- Push notifications will work in the development build

---

## 📚 Detailed Documentation

For more details, see:
- `docs/ANDROID_SETUP_COMPLETE.md` - Complete setup guide
- `docs/GOOGLE_SIGNIN_ANDROID_SETUP.md` - Google Sign-In details
- `docs/EXPO_NOTIFICATIONS_SDK53.md` - Push notifications details

---

## ✅ Success Criteria

### Google Sign-In Working
- Tap "Continuar con Google"
- Native account picker appears (not browser)
- Select account
- Logged in immediately

### Push Notifications Working
- Running in development build (not Expo Go)
- Notification permissions granted
- Can receive push notifications

---

## 🎉 Summary

**Google Sign-In Issue:** FIXED by using native library
- Just need to add your Web Client ID and rebuild

**Push Notifications Issue:** NOT A BUG, expected behavior
- Expo Go doesn't support push notifications in SDK 54
- Create development build to test push notifications

Both issues are now resolved! Just follow the steps above. 🚀
