
# ✅ APK Build Fix - Stripe Dependency Resolution (PERMANENT SOLUTION)

## 🎯 Problem Summary

The Android APK build was failing with this error:
```
Could not resolve com.stripe:stripe-android:20.48.+.
Failed to list versions for com.stripe:stripe-android.
Unable to load Maven meta-data from https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml.
Could not GET 'https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml'.
Read timed out
```

**Root Cause:** Gradle was trying to resolve the dynamic version `20.48.+` from JitPack, which was timing out. Manual fixes to `/android/build.gradle` were lost every time `expo prebuild --clean` was run.

---

## ✅ Solution Implemented

### 1. **Local Expo Config Plugin Created**

**File:** `plugins/withStripeFixed.js`

This plugin automatically injects a `resolutionStrategy` into the Android `build.gradle` file during the prebuild process. It forces Gradle to use a specific, stable version of Stripe (`20.49.0`) from `mavenCentral()` instead of attempting to resolve dynamic versions from unreliable repositories.

**Key Features:**
- ✅ Survives `expo prebuild --clean` operations
- ✅ Automatically applied during every prebuild
- ✅ Prevents duplicate injection (checks if already present)
- ✅ Logs confirmation when applied

**How it works:**
```javascript
// Injects this into android/build.gradle:
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'com.stripe:stripe-android:20.49.0'
        }
    }
}
```

---

### 2. **Plugin Registered in app.json**

The plugin is registered at the **top** of the plugins array (after `expo-router`) to ensure it runs early in the build process:

```json
"plugins": [
  "expo-router",
  "./plugins/withStripeFixed",  // ← Our custom plugin
  // ... other plugins
]
```

---

### 3. **Repository Priority Configured**

In `app.json` → `expo-build-properties` → `android` → `extraMavenRepos`:

```json
"extraMavenRepos": [
  "google()",
  "mavenCentral()"
]
```

This ensures Gradle searches `mavenCentral()` (where Stripe is officially hosted) **before** any other repositories, avoiding JitPack entirely.

---

## 🚀 How to Use

### **For New Builds:**

1. The plugin is already registered in `app.json`
2. Simply trigger a build as usual:
   ```bash
   # EAS Build (recommended)
   eas build --platform android --profile production
   
   # Or local build
   expo prebuild -p android --clean
   ./gradlew assembleDebug
   ```

3. The plugin will automatically:
   - Inject the Stripe version fix
   - Log: `✅ Stripe dependency fix applied: forcing com.stripe:stripe-android:20.49.0`

---

### **Verification:**

After running `expo prebuild -p android`, check `android/build.gradle`:

```groovy
allprojects {
    configurations.all {
        resolutionStrategy {
            // Force specific Stripe version to avoid JitPack timeout
            force 'com.stripe:stripe-android:20.49.0'
        }
    }
    // ... rest of config
}
```

If you see this block, the plugin is working correctly! ✅

---

## 🔧 Technical Details

### **Why This Works:**

1. **Eliminates Dynamic Version Resolution:**
   - Before: `com.stripe:stripe-android:20.48.+` (Gradle searches for latest 20.48.x)
   - After: `com.stripe:stripe-android:20.49.0` (Gradle downloads exact version)

2. **Bypasses JitPack:**
   - JitPack is unreliable and times out frequently
   - `mavenCentral()` is Stripe's official repository and is highly reliable

3. **Persistent Configuration:**
   - Expo Config Plugins run during `expo prebuild`
   - The fix is re-applied automatically every time, even with `--clean`

---

## 📋 Troubleshooting

### **If the build still fails:**

1. **Clear Gradle cache:**
   ```bash
   cd android
   ./gradlew clean
   rm -rf ~/.gradle/caches/
   cd ..
   ```

2. **Verify plugin is registered:**
   - Check `app.json` → `plugins` array
   - Ensure `"./plugins/withStripeFixed"` is present

3. **Check plugin output:**
   - During `expo prebuild`, look for:
     ```
     ✅ Stripe dependency fix applied: forcing com.stripe:stripe-android:20.49.0
     ```
   - If you see `ℹ️ Stripe dependency fix already present`, the fix is already applied

4. **Verify build.gradle:**
   - After prebuild, check `android/build.gradle`
   - Ensure the `resolutionStrategy` block is present

---

## 🎉 Benefits

✅ **Permanent Fix:** Survives `expo prebuild --clean`  
✅ **Automatic:** No manual intervention required  
✅ **Reliable:** Uses official Stripe repository (mavenCentral)  
✅ **Maintainable:** Single source of truth in `plugins/withStripeFixed.js`  
✅ **Documented:** Clear logs and comments in code  

---

## 📚 References

- [Expo Config Plugins Documentation](https://docs.expo.dev/config-plugins/introduction/)
- [Gradle Dependency Resolution](https://docs.gradle.org/current/userguide/dependency_resolution.html)
- [Stripe Android SDK](https://github.com/stripe/stripe-android)

---

## 🔄 Future Updates

If Stripe releases a new version and you want to update:

1. Edit `plugins/withStripeFixed.js`
2. Change `force 'com.stripe:stripe-android:20.49.0'` to the new version
3. Run `expo prebuild -p android --clean`
4. Build as usual

---

**Status:** ✅ **IMPLEMENTED AND READY FOR PRODUCTION**

The APK build should now succeed without Stripe dependency timeout errors.
