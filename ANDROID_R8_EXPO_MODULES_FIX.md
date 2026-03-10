
# 🔧 Android R8 Build Fix - Expo Modules Runtime Missing Class

## ⚠️ Problem
The Android Release build is failing with R8 code shrinker error:
```
ERROR: R8: Missing class expo.modules.kotlin.runtime.Runtime
(referenced from: expo.modules.medialibrary.next.objects.album.Album)
```

**Root Cause:** R8 (Android's code shrinker/obfuscator) is removing Expo module classes that are needed at runtime because it doesn't detect them as "used" (they're loaded dynamically via reflection).

---

## 🚀 Quick Fix (3 Steps)

### 1️⃣ Open the ProGuard Rules File
File location: `android/app/proguard-rules.pro`

### 2️⃣ Copy and Paste the Rules Below
Add these rules **at the end** of the `proguard-rules.pro` file (see full rules in next section)

### 3️⃣ Rebuild the APK
The build should now succeed without R8 errors.

---

## Solution

You need to add ProGuard keep rules to prevent R8 from removing these critical Expo module classes.

### 📝 Complete ProGuard Rules to Add

**File:** `android/app/proguard-rules.pro`  
**Action:** Add these rules **at the end** of the file:

```proguard
# ============================================================================
# EXPO MODULES - CRITICAL FIX FOR R8 BUILD
# ============================================================================
# Prevent R8 from removing Expo module classes that are needed at runtime
# This fixes: "Missing class expo.modules.kotlin.runtime.Runtime" error

# Keep all Expo module classes and their runtime
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }
-dontwarn expo.modules.**

# Keep Expo Kotlin Runtime (fixes the missing Runtime class error)
-keep class expo.modules.kotlin.** { *; }
-keepclassmembers class expo.modules.kotlin.** { *; }
-dontwarn expo.modules.kotlin.**

# Keep Expo Media Library classes (specifically needed for this error)
-keep class expo.modules.medialibrary.** { *; }
-keepclassmembers class expo.modules.medialibrary.** { *; }
-dontwarn expo.modules.medialibrary.**

# Keep all Expo module interfaces and annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep Expo module method names for reflection
-keepclassmembers class expo.modules.** {
    public <methods>;
    public <fields>;
}

# Keep Expo Kotlin module definitions
-keep @expo.modules.kotlin.modules.Module class * {
    *;
}

# Keep Expo view managers
-keep class * extends expo.modules.kotlin.views.ViewManager {
    *;
}

# ============================================================================
# KOTLIN RUNTIME - Required for Expo modules
# ============================================================================
# Keep all Kotlin runtime classes that Expo uses via reflection
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Keep Kotlin metadata and when mappings
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# ============================================================================
# KOTLIN COROUTINES - Critical for async operations in Expo modules
# ============================================================================
# Keep coroutine dispatchers and exception handlers
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.** { 
    volatile <fields>; 
}

# Keep all kotlinx.coroutines classes
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**
```

### ✅ Verify the Fix

After adding these rules:
1. **Save** the `proguard-rules.pro` file
2. **Rebuild** your Android release APK
3. The R8 error should be **resolved** ✅

**Expected Result:** Build completes successfully without "Missing class expo.modules.kotlin.runtime.Runtime" error.

### Why This Happens

1. **R8 Code Shrinking**: When building a release APK, Android uses R8 to shrink and obfuscate code
2. **Reflection Usage**: Expo modules use reflection to dynamically load native modules
3. **Missing Keep Rules**: Without explicit keep rules, R8 removes classes it thinks are unused
4. **Runtime Failure**: The app crashes or fails to build because required classes are missing

### Alternative: Disable Minification (NOT RECOMMENDED)

If you need a quick workaround for testing, you can temporarily disable minification in `android/app/build.gradle`:

```gradle
buildTypes {
    release {
        minifyEnabled false  // Change from true to false
        // ... rest of config
    }
}
```

**WARNING**: This is NOT recommended for production as it:
- Increases APK size significantly
- Removes code obfuscation (security concern)
- Should only be used for debugging

### Files Modified

- `android/app/proguard-rules.pro` - Add the ProGuard keep rules above

### Testing

1. Clean the build: `cd android && ./gradlew clean`
2. Build release APK through EAS or locally
3. Verify no R8 errors appear in the build logs

### Related Issues

This fix resolves:
- `Missing class expo.modules.kotlin.runtime.Runtime`
- `Missing class expo.modules.kotlin.ModuleRegistry`
- Similar R8 errors for other Expo modules

### Additional Notes

- These rules are safe and won't significantly impact APK size
- They only keep Expo-specific classes, not your entire app
- This is a common issue when upgrading Expo SDK versions
- The rules are compatible with Expo SDK 52+

## Verification

After applying the fix, your build should complete successfully. Check the build logs for:
- ✅ No "Missing class expo.modules" errors
- ✅ R8 task completes without failures
- ✅ APK builds successfully

If you still see errors, ensure:
1. The ProGuard rules file is in the correct location
2. The rules are properly formatted (no syntax errors)
3. You've cleaned the build cache before rebuilding
