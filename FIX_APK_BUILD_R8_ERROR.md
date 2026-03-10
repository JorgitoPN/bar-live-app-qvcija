
# 🔧 APK Build Fix - R8 Missing Class Error

## ❌ Problem
The APK build is failing with R8 minification error:
```
ERROR: R8: Missing class expo.modules.kotlin.runtime.Runtime
(referenced from: expo.modules.medialibrary.next.objects.album.Album)
```

**Root Cause:** R8 (Android's code shrinker) is aggressively removing essential Expo module classes during the release build because it cannot detect their usage through reflection.

---

## ✅ Solution - Add ProGuard Rules

### Step 1: Update ProGuard Rules File ⚙️

**File to edit:** `android/app/proguard-rules.pro`

**Add these two lines at the end of the file:**

```proguard
# Expo modules - Prevent R8 from removing Expo module classes
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**
```

### Complete File Content

Your `android/app/proguard-rules.pro` should look like this:

```proguard
# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo modules - Prevent R8 from removing Expo module classes
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Add any project specific keep options here:
```

---

### Step 2: Clean Build Cache 🧹

After updating the ProGuard rules, clean the build cache:

```bash
cd android
./gradlew clean
cd ..
```

---

### Step 3: Rebuild APK 🚀

Trigger a new build:

```bash
eas build --platform android --profile production
```

---

## 📖 What This Fix Does

| Rule | Purpose |
|------|---------|
| `-keep class expo.modules.** { *; }` | Preserves **all classes** in `expo.modules` package and subpackages with all methods and fields |
| `-dontwarn expo.modules.**` | Suppresses warnings related to Expo modules during build |

---

## 🔍 Why This Happens

1. **R8 Optimization:** R8 performs aggressive code shrinking to reduce APK size
2. **Reflection Usage:** Expo modules use reflection and dynamic class loading
3. **Detection Failure:** R8 cannot detect dynamically loaded classes through static analysis
4. **Incorrect Removal:** R8 removes classes it thinks are unused
5. **Runtime Error:** App crashes when trying to load removed classes

**The ProGuard rules explicitly tell R8 to preserve these classes.**

---

## ✅ Expected Results

After applying this fix:

1. ✅ Build completes successfully without R8 errors
2. ✅ No "Missing class expo.modules.kotlin.runtime.Runtime" error
3. ✅ APK size may be slightly larger (expected - preserving necessary code)
4. ✅ App runs correctly on Android devices

---

## 🚨 Important Notes

- **Do NOT disable minification** - This fix preserves only necessary Expo classes
- **Build time may increase slightly** - R8 processes more classes
- **APK size impact is minimal** - Only essential classes are preserved
- **This is a standard fix** - Common for React Native/Expo projects

---

## 🆘 If Build Still Fails

If issues persist:

1. Verify ProGuard rules were saved correctly
2. Ensure you ran `./gradlew clean`
3. Check for other R8 errors in build log
4. Try adding more specific rules:
   ```proguard
   -keep class expo.modules.medialibrary.** { *; }
   -keep class expo.modules.kotlin.** { *; }
   ```

---

**Status:** ✅ Ready to apply
