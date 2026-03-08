
# 🚨 CRITICAL: APK Build Fix for Stripe Dependency Issue

## Problem
The APK build is failing because Gradle is trying to resolve `com.stripe:stripe-android:21.22.+` from JitPack, which is timing out:

```
Could not resolve com.stripe:stripe-android:21.22.+.
> Failed to list versions for com.stripe:stripe-android.
   > Unable to load Maven meta-data from https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml.
      > Could not GET 'https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml'.
         > Read timed out
```

## Root Cause
The `@stripe/stripe-react-native` package is requesting a dynamic version (`21.22.+`) which Gradle tries to resolve from multiple repositories, including JitPack. JitPack is unreliable and causing timeouts.

## Solution
Force Gradle to use a specific stable version of the Stripe Android SDK from Maven Central by adding a resolution strategy to `android/build.gradle`.

## Required Changes

### File: `android/build.gradle`

**IMPORTANT:** You need to manually edit this file. Add the following configuration inside the `allprojects` block:

```gradle
allprojects {
  repositories {
    google()
    mavenCentral()
    // DO NOT add JitPack here - it causes timeouts
  }

  // ⬇️ ADD THIS ENTIRE BLOCK ⬇️
  configurations.all {
    resolutionStrategy {
      // Force Stripe Android SDK to use a specific stable version from Maven Central
      force 'com.stripe:stripe-android:20.49.0'
      
      eachDependency { details ->
        if (details.requested.group == 'com.stripe' && details.requested.name == 'stripe-android') {
          details.useVersion '20.49.0'
          details.because 'Force Stripe to use Maven Central, avoiding JitPack timeouts'
        }
      }
    }
  }
  // ⬆️ END OF BLOCK TO ADD ⬆️
}
```

### Complete Example

Your `android/build.gradle` should look like this:

```gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
  }

  configurations.all {
    resolutionStrategy {
      force 'com.stripe:stripe-android:20.49.0'
      
      eachDependency { details ->
        if (details.requested.group == 'com.stripe' && details.requested.name == 'stripe-android') {
          details.useVersion '20.49.0'
          details.because 'Force Stripe to use Maven Central, avoiding JitPack timeouts'
        }
      }
    }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
```

## Why This Works

1. **Specific Version:** Instead of using a dynamic version range (`21.22.+`), we force Gradle to use a specific stable version (`20.49.0`)
2. **Maven Central Only:** This version is available on Maven Central, which is reliable and fast
3. **Bypass JitPack:** By forcing the version, Gradle won't try to query JitPack for available versions
4. **Resolution Strategy:** The `eachDependency` block ensures this applies to all transitive dependencies requesting Stripe

## Verification

After making this change, rebuild your APK. The build should:
1. ✅ Skip JitPack entirely
2. ✅ Resolve Stripe Android SDK from Maven Central
3. ✅ Complete successfully without timeout errors

## Alternative: If Version 20.49.0 Doesn't Work

If you need a newer version, you can try:
- `20.49.0` (stable, tested)
- `20.48.0` (fallback)
- Check Maven Central for available versions: https://mvnrepository.com/artifact/com.stripe/stripe-android

## Network Timeout Settings

Your `android/gradle.properties` already has good timeout settings:
```properties
systemProp.org.gradle.internal.http.connectionTimeout=60000
systemProp.org.gradle.internal.http.socketTimeout=60000
systemProp.http.socketTimeout=60000
systemProp.http.connectionTimeout=60000
```

These help prevent indefinite hangs, but the real fix is forcing the Stripe version as shown above.

## Summary

**Action Required:** Edit `android/build.gradle` and add the `configurations.all` block inside `allprojects` as shown above. This will force Gradle to use a stable Stripe version from Maven Central and avoid JitPack timeouts.

**Expected Result:** APK build will succeed without timeout errors.
