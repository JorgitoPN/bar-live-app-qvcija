
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

# ============================================================================
# Expo Modules - CRITICAL: Prevent R8 from removing Expo module classes
# ============================================================================
# These rules fix the "Missing class expo.modules.kotlin.runtime.Runtime" error
# R8 incorrectly identifies dynamically loaded/reflected classes as unused

# Keep all Expo modules and their members
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }
-dontwarn expo.modules.**

# Keep Expo Kotlin Runtime - Fix for expo.modules.kotlin.runtime.Runtime missing class error
-keep class expo.modules.kotlin.** { *; }
-keepclassmembers class expo.modules.kotlin.** { *; }
-dontwarn expo.modules.kotlin.**

# Keep Expo Media Library - Specific fix for the reported error
-keep class expo.modules.medialibrary.** { *; }
-keepclassmembers class expo.modules.medialibrary.** { *; }
-dontwarn expo.modules.medialibrary.**

# ============================================================================
# Kotlin Runtime and Reflection
# ============================================================================
# Kotlin classes are often accessed via reflection by Expo modules

-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# ============================================================================
# Kotlin Coroutines - Critical for async operations in Expo modules
# ============================================================================
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.** { volatile <fields>; }

# ============================================================================
# React Native Core
# ============================================================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ============================================================================
# Additional Expo Module Support
# ============================================================================
# Keep all classes that might be loaded dynamically
-keep class expo.modules.core.** { *; }
-keep class expo.modules.interfaces.** { *; }
-dontwarn expo.modules.core.**
-dontwarn expo.modules.interfaces.**
