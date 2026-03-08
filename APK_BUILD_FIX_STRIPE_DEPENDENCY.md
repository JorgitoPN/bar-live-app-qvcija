
# APK Build Fix - Stripe Android SDK Dependency Resolution

## Problem
The APK build is failing with the following error:
```
Could not resolve com.stripe:stripe-android:21.22.+.
Failed to list versions for com.stripe:stripe-android.
Unable to load Maven meta-data from https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml.
Read timed out
```

## Root Cause
The `@stripe/stripe-react-native` package is trying to fetch the Stripe Android SDK from JitPack, which is timing out. The Stripe Android SDK should be fetched from Maven Central instead.

## Solution Applied
The following fix has been applied to `android/build.gradle`:

### 1. Removed JitPack Repository
JitPack has been commented out from the repositories list to prevent Gradle from attempting to fetch Stripe from there:

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        // 🔥 REMOVED JitPack - it was causing timeouts for Stripe dependency
        // maven { url 'https://www.jitpack.io' }
    }
}
```

### 2. Force Stripe Version Resolution
Added a resolution strategy to force Gradle to use a specific stable version of Stripe Android SDK from Maven Central:

```gradle
configurations.all {
    resolutionStrategy {
        // Force version 20.49.0 for com.stripe:stripe-android (available in Maven Central)
        force 'com.stripe:stripe-android:20.49.0'

        // Intercept any dependency request for stripe-android and ensure it uses the forced version
        eachDependency { details ->
            if (details.requested.group == 'com.stripe' && details.requested.name == 'stripe-android') {
                details.useVersion '20.49.0'
                details.because 'Force Stripe to use Maven Central version 20.49.0, avoiding JitPack timeouts'
            }
        }
    }
}
```

### 3. Network Timeout Settings
Added network timeout settings in `android/gradle.properties` to prevent indefinite hangs:

```properties
# Network timeout settings to prevent indefinite hangs during dependency resolution
systemProp.http.connectionTimeout=60000
systemProp.http.socketTimeout=60000
systemProp.https.connectionTimeout=60000
systemProp.https.socketTimeout=60000
```

## Why This Works
1. **Removes JitPack**: By removing JitPack from the repositories, Gradle won't attempt to fetch from it
2. **Forces Specific Version**: Version 20.49.0 is a stable version available in Maven Central
3. **Intercepts Dynamic Versions**: The `eachDependency` block catches any request for `stripe-android` (including dynamic versions like `21.22.+`) and forces it to use 20.49.0
4. **Timeout Protection**: Network timeouts ensure the build doesn't hang forever if there are network issues

## Verification
The fix is already applied in your project. The next APK build should succeed without the JitPack timeout error.

## Alternative Solutions (If Issue Persists)
If the build still fails, you can try:

1. **Clear Gradle Cache**: The build system will automatically clear caches on the next build
2. **Check Stripe React Native Version**: Ensure `@stripe/stripe-react-native` is at version 0.50.3 (as specified in package.json)
3. **Verify Maven Central Access**: Ensure the build environment can access Maven Central (https://repo1.maven.org/maven2/)

## Technical Details
- **Stripe Android SDK Version**: 20.49.0 (forced)
- **Stripe React Native Version**: 0.50.3
- **Repository**: Maven Central (JitPack removed)
- **Gradle Version**: 8.14.3
- **Android Gradle Plugin**: 8.7.3

## Status
✅ Fix has been applied to `android/build.gradle`
✅ Network timeouts configured in `android/gradle.properties`
✅ Ready for next APK build attempt

The build should now succeed without the JitPack timeout error.
