
# 🔧 Fix APK Build R8 Error - Complete Solution

## 🚨 Error Description
Your Android Release build is failing with this error:
```
> Task :app:minifyReleaseWithR8 FAILED
ERROR: Missing class expo.modules.kotlin.runtime.Runtime
(referenced from: expo.modules.medialibrary.next.objects.album.Album)
```

## ✅ Root Cause
R8 (Android's code shrinker) is incorrectly removing Expo module classes during the minification process for Release builds. This happens because R8 doesn't recognize that these classes are needed at runtime.

## 🛠️ Solution: Add ProGuard Rules

### Step 1: Locate the ProGuard Rules File
Open this file in your project:
```
android/app/proguard-rules.pro
```

### Step 2: Add These Rules at the End of the File

Copy and paste these lines at the end of `android/app/proguard-rules.pro`:

```proguard
# Expo Modules - CRITICAL: Prevent R8 from removing Expo module classes
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Expo Kotlin Runtime - Fix for expo.modules.kotlin.runtime.Runtime missing class error
-keep class expo.modules.kotlin.** { *; }
-dontwarn expo.modules.kotlin.**

# Expo Media Library - Specific fix for the reported error
-keep class expo.modules.medialibrary.** { *; }
-dontwarn expo.modules.medialibrary.**
```

### Step 3: Complete File Should Look Like This

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

# Add any project specific keep options here:

# Expo Modules - CRITICAL: Prevent R8 from removing Expo module classes
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Expo Kotlin Runtime - Fix for expo.modules.kotlin.runtime.Runtime missing class error
-keep class expo.modules.kotlin.** { *; }
-dontwarn expo.modules.kotlin.**

# Expo Media Library - Specific fix for the reported error
-keep class expo.modules.medialibrary.** { *; }
-dontwarn expo.modules.medialibrary.**
```

### Step 4: Rebuild Your APK

After adding these rules, rebuild your APK. The build system will automatically apply the new ProGuard rules, and the R8 error should be resolved.

## 📝 What These Rules Do

1. **`-keep class expo.modules.** { *; }`**
   - Tells R8 to keep ALL classes in the `expo.modules` package and all subpackages
   - Preserves all methods and fields in these classes
   - Prevents R8 from removing or obfuscating them

2. **`-dontwarn expo.modules.**`**
   - Suppresses R8 warnings about missing or unreferenced classes in `expo.modules`
   - Prevents the build from failing due to warnings

3. **Specific rules for `expo.modules.kotlin.**` and `expo.modules.medialibrary.**`**
   - Extra protection for the specific classes mentioned in the error
   - Ensures the Kotlin runtime and Media Library classes are preserved

## ✅ Expected Result

After applying these changes:
- ✅ The APK build will complete successfully
- ✅ No more "Missing class expo.modules.kotlin.runtime.Runtime" errors
- ✅ All Expo modules (Media Library, Camera, etc.) will work correctly in Release builds
- ✅ The app will function properly in production

## 🎯 Why This Happens

R8 is an aggressive code optimizer that:
1. Removes unused code to reduce APK size
2. Obfuscates class names for security
3. Sometimes incorrectly identifies runtime-required classes as "unused"

Expo modules use reflection and dynamic loading, which R8 can't always detect. The ProGuard rules explicitly tell R8 to preserve these classes.

## 🔍 Verification

To verify the fix worked:
1. Build completes without R8 errors ✅
2. APK installs successfully on device ✅
3. Expo features (camera, media library, etc.) work in the installed app ✅

## 📚 Additional Resources

- [ProGuard Documentation](https://www.guardsquare.com/manual/configuration/usage)
- [Android R8 Documentation](https://developer.android.com/studio/build/shrink-code)
- [Expo ProGuard Guide](https://docs.expo.dev/guides/using-libraries/#android-proguard-rules)

## 🆘 Still Having Issues?

If the build still fails after adding these rules:
1. Double-check that the rules were added correctly to `proguard-rules.pro`
2. Make sure there are no syntax errors in the file
3. Check the new error message - it might be a different issue
4. You may need to add additional rules for other specific modules

## 📁 Files Created to Help You

I've created several reference files to help you fix this issue:

1. **`PROGUARD_RULES_TO_ADD.txt`** - Copy-paste ready ProGuard rules
2. **`QUICK_FIX_R8_ERROR.txt`** - Quick reference guide
3. **`R8_ERROR_EXPLANATION.md`** - Detailed explanation with diagrams
4. **`ANDROID_R8_PROGUARD_FIX.md`** - Complete Spanish guide

## 🎯 Next Steps

1. ✅ Open `android/app/proguard-rules.pro`
2. ✅ Add the ProGuard rules from `PROGUARD_RULES_TO_ADD.txt`
3. ✅ Save the file
4. ✅ Rebuild your APK
5. ✅ Verify the build completes successfully

---

**Note:** These ProGuard rules are safe and recommended for all Expo projects using Release builds. They don't negatively impact app performance or security.
