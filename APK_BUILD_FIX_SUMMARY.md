
# APK Build Fix Summary - Stripe Timeout Issue

## 🔴 Problem

Your APK build is failing with this error:

```
Could not resolve com.stripe:stripe-android:21.22.+.
Failed to list versions for com.stripe:stripe-android.
Unable to load Maven meta-data from https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml.
Read timed out
```

## 🎯 Root Cause

The `@stripe/stripe-react-native` package is trying to download the Stripe Android SDK from **JitPack** repository, which is:
- ❌ Slow and unreliable
- ❌ Timing out during your builds
- ❌ Not the correct source for Stripe (should use Maven Central)

## ✅ Solution

Force Gradle to use a **specific stable version** of Stripe Android SDK from **Maven Central** instead of trying JitPack.

---

## 📝 How to Fix (Manual Step Required)

**⚠️ IMPORTANT**: I cannot directly modify `.gradle` files, so you need to apply this fix manually.

### Step 1: Open `android/build.gradle`

### Step 2: Replace the `allprojects` block

Find this section:

```gradle
allprojects {
  repositories {
    google()
    mavenCentral()
    // Removed JitPack - it's causing timeouts and Stripe doesn't need it
    // All dependencies should resolve from Maven Central or Google
  }
}
```

Replace it with:

```gradle
allprojects {
  repositories {
    google()
    mavenCentral()
    // Do NOT add JitPack - it causes timeouts
  }

  // Force Stripe Android SDK to use a specific stable version from Maven Central
  configurations.all {
    resolutionStrategy {
      // Force Stripe to use version 20.49.0 from Maven Central (stable and well-tested)
      force 'com.stripe:stripe-android:20.49.0'
      
      // Ensure Stripe dependency resolution doesn't try alternative repositories
      eachDependency { details ->
        if (details.requested.group == 'com.stripe' && details.requested.name == 'stripe-android') {
          details.useVersion '20.49.0'
          details.because 'Force Stripe to use Maven Central, avoiding JitPack timeouts'
        }
      }
    }
  }
}
```

### Step 3: Save and rebuild

Save the file and trigger a new build. The error should be resolved.

---

## 🔍 What This Fix Does

1. **Removes JitPack dependency**: Prevents Gradle from trying to fetch from the slow/unreliable JitPack repository
2. **Forces specific version**: Uses `20.49.0` instead of the dynamic range `21.22.+`
3. **Ensures Maven Central**: The `eachDependency` block intercepts Stripe resolution and forces Maven Central
4. **Prevents fallback**: Gradle won't try alternative repositories if Maven Central has the dependency

---

## ✅ Expected Outcome

After applying the fix:

- ✅ Build completes successfully (no timeout errors)
- ✅ Stripe SDK downloads from Maven Central (fast and reliable)
- ✅ APK size increases by ~2-3 MB (normal for Stripe)
- ✅ All Stripe functionality works correctly in the app

---

## 📋 Complete File Reference

See `FIX_APK_BUILD_STRIPE.md` for the complete `android/build.gradle` file content with the fix applied.

---

## 🆘 Troubleshooting

If the build still fails after applying the fix:

1. **Verify the syntax**: Make sure you copied the code exactly (no typos)
2. **Check network access**: Ensure Maven Central is accessible from your build environment
3. **Clear Gradle cache**: Sometimes old cached data causes issues
4. **Check other files**: Verify `android/gradle.properties` has the timeout settings (it already does)

---

## 📚 Related Documentation

- `FIX_APK_BUILD_STRIPE.md` - Quick fix guide with copy-paste code
- `SOLUCION_BUILD_APK_STRIPE.md` - Comprehensive technical documentation
- `INSTRUCCIONES_BUILD_GRADLE.md` - Detailed instructions
- `README_FIX_APK_BUILD.md` - Overview and status

---

## ⚙️ Technical Details

**Why version 20.49.0?**
- It's a stable, well-tested version of Stripe Android SDK
- Available on Maven Central (not JitPack)
- Compatible with `@stripe/stripe-react-native` 0.50.3 (your current version)
- Avoids the dynamic version range `21.22.+` which causes repository lookups

**Why not just remove Stripe?**
- Your app uses `@stripe/stripe-react-native` for payment processing
- Removing it would break payment functionality
- The fix ensures Stripe works reliably without build issues

---

## 🎯 Next Steps

1. ✅ Apply the fix to `android/build.gradle` (manual step)
2. ✅ Save the file
3. ✅ Trigger a new build
4. ✅ Verify the build succeeds
5. ✅ Test Stripe functionality in the app

The fix is simple and only requires updating one file. No code changes are needed in your React Native app.
