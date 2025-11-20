
# Expo Notifications in SDK 53+ - Development Build Required

## Important Change in Expo SDK 53

Starting with **Expo SDK 53**, **push notifications are no longer available in Expo Go**. This is a breaking change that affects all apps using `expo-notifications`.

## The Error You're Seeing

```
expo-notifications: Android Push notifications (remote notifications) 
functionality provided by expo-notifications was removed from Expo Go 
with the release of SDK 53. Use a development build instead of Expo Go.
```

## Why This Change?

Expo made this change because:
- Push notifications require native configuration (FCM, APNs)
- Expo Go is a generic app that can't have app-specific push notification credentials
- Development builds provide a better development experience for push notifications

## Solution: Create a Development Build

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Initialize EAS Project

```bash
eas project:init
```

This will:
- Create an `eas.json` configuration file
- Link your project to an Expo account
- Generate a project ID

### Step 4: Update app.json

Add the project ID to your `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

### Step 5: Create Development Build

For Android:
```bash
eas build -p android --profile development
```

For iOS:
```bash
eas build -p ios --profile development
```

### Step 6: Install the Build

#### Android:
1. Download the `.apk` file from the EAS build page
2. Install on your device:
   ```bash
   adb install path/to/your-app.apk
   ```
   Or transfer the APK to your device and install it manually

#### iOS:
1. Download the build from the EAS build page
2. Install using TestFlight or ad-hoc distribution

### Step 7: Run Your App

Once the development build is installed:

```bash
npx expo start --dev-client
```

The app will open in your development build (not Expo Go), and push notifications will work!

## What Works in Development Builds

✅ **Push notifications** - Full support for remote notifications
✅ **Local notifications** - Schedule and display local notifications
✅ **Custom notification sounds** - Use custom audio files
✅ **Notification channels** - Configure Android notification channels
✅ **Badge counts** - Update app icon badge
✅ **Deep linking** - Handle notification taps
✅ **Background notifications** - Receive notifications when app is closed

## What Still Works in Expo Go

✅ **Local notifications** - You can still test local notifications in Expo Go
✅ **Notification permissions** - Request and check permissions
✅ **Notification handlers** - Set up notification handlers
❌ **Push notifications** - Remote notifications do NOT work in Expo Go

## Testing Without Development Build

If you want to test your app without creating a development build, you can:

1. **Test local notifications only**:
   ```typescript
   import * as Notifications from 'expo-notifications';
   
   // This works in Expo Go
   await Notifications.scheduleNotificationAsync({
     content: {
       title: 'Test Notification',
       body: 'This is a local notification',
     },
     trigger: { seconds: 2 },
   });
   ```

2. **Mock push notifications**:
   ```typescript
   // In development, simulate push notifications with local ones
   if (__DEV__) {
     // Use local notifications for testing
     await sendLocalNotification(data);
   } else {
     // Use real push notifications in production
     await sendPushNotification(userId, data);
   }
   ```

## Updated Code

The `utils/notifications.ts` file has been updated to:

1. **Detect Expo Go** and show helpful error messages
2. **Gracefully handle** missing push notification support
3. **Provide clear instructions** on how to enable push notifications
4. **Fall back to local notifications** when push notifications aren't available

## Development Workflow

### During Development (Expo Go):
```bash
npx expo start
```
- ✅ Test UI and app logic
- ✅ Test local notifications
- ❌ Push notifications won't work

### During Development (Development Build):
```bash
npx expo start --dev-client
```
- ✅ Test UI and app logic
- ✅ Test local notifications
- ✅ Test push notifications

### Production:
```bash
eas build -p android --profile production
eas build -p ios --profile production
```
- ✅ Full push notification support
- ✅ Optimized build
- ✅ Ready for app stores

## EAS Build Profiles

Your `eas.json` should have these profiles:

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
    "preview": {
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

## Cost Considerations

- **Development builds**: Free (unlimited)
- **Preview builds**: Free (unlimited)
- **Production builds**: Limited free builds per month, then paid

## Alternative: Local Development Build

If you don't want to use EAS, you can create a local development build:

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

This creates a development build locally without using EAS servers.

## Summary

| Feature | Expo Go | Development Build | Production Build |
|---------|---------|-------------------|------------------|
| Local Notifications | ✅ | ✅ | ✅ |
| Push Notifications | ❌ | ✅ | ✅ |
| Fast Refresh | ✅ | ✅ | ❌ |
| OTA Updates | ✅ | ✅ | ✅ |
| Custom Native Code | ❌ | ✅ | ✅ |
| App Store Ready | ❌ | ❌ | ✅ |

## Next Steps

1. **Create a development build** to test push notifications
2. **Configure Firebase Cloud Messaging** (FCM) for Android
3. **Configure Apple Push Notification Service** (APNs) for iOS
4. **Test push notifications** in the development build
5. **Create production builds** when ready to publish

## Resources

- [Expo Development Builds Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Push Notifications Setup Guide](https://docs.expo.dev/push-notifications/overview/)

## Conclusion

The notification warning you're seeing is **expected behavior** in Expo SDK 53+. To use push notifications, you need to create a development build. This is a one-time setup that provides a better development experience and is required for production apps anyway.

The good news is that **local notifications still work in Expo Go**, so you can continue developing and testing most of your app's functionality without a development build. When you're ready to test push notifications, follow the steps above to create a development build.
