
# 🔍 Understanding the R8 Error

## The Error Message
```
ERROR: R8: Missing class expo.modules.kotlin.runtime.Runtime
(referenced from: expo.modules.medialibrary.next.objects.album.Album)
```

---

## 📊 Visual Explanation

### What's Happening (The Problem)

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR CODE                                                   │
│  ├── Uses expo-media-library                                │
│  └── Imports Expo modules                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  ANDROID BUILD PROCESS                                       │
│  ├── Compiles Kotlin/Java code                             │
│  ├── Packages dependencies                                  │
│  └── Runs R8 code shrinker (Release builds only)           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  R8 CODE SHRINKER                                           │
│  ├── Analyzes code to find "unused" classes                │
│  ├── Removes "unused" classes to reduce APK size           │
│  └── ❌ PROBLEM: Removes expo.modules.kotlin.runtime.Runtime│
│     (R8 doesn't detect it's used via reflection)           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  BUILD FAILS ❌                                             │
│  ERROR: Missing class expo.modules.kotlin.runtime.Runtime   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 The Fix (ProGuard Rules)

```
┌─────────────────────────────────────────────────────────────┐
│  ADD PROGUARD RULES                                         │
│  File: android/app/proguard-rules.pro                       │
│                                                              │
│  -keep class expo.modules.** { *; }                         │
│  -keep class kotlin.** { *; }                               │
│  -keep class kotlinx.coroutines.** { *; }                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  R8 CODE SHRINKER (WITH RULES)                              │
│  ├── Analyzes code to find "unused" classes                │
│  ├── Reads ProGuard rules                                   │
│  ├── ✅ KEEPS expo.modules.kotlin.runtime.Runtime           │
│  │   (ProGuard rule tells R8 to keep it)                   │
│  └── Removes only truly unused classes                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  BUILD SUCCEEDS ✅                                          │
│  APK created with all required Expo classes intact          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Concepts

### Why R8 Removes the Class
1. **Static Analysis:** R8 analyzes code at compile time
2. **Reflection is Dynamic:** Expo loads classes at runtime using reflection
3. **R8 Can't See It:** R8's static analysis doesn't detect reflection usage
4. **Removes "Unused" Class:** R8 thinks the class is unused and removes it

### Why ProGuard Rules Fix It
1. **Explicit Instructions:** ProGuard rules explicitly tell R8 what to keep
2. **Overrides Analysis:** Rules override R8's automatic analysis
3. **Keeps Required Classes:** R8 keeps the classes even if it thinks they're unused
4. **Build Succeeds:** All required classes are present in the APK

---

## 📋 Classes That Need to Be Kept

### Expo Modules
- `expo.modules.**` - All Expo module classes
- `expo.modules.kotlin.**` - Expo Kotlin runtime
- `expo.modules.medialibrary.**` - Media library module

### Kotlin Runtime
- `kotlin.**` - Kotlin standard library
- `kotlin.Metadata` - Kotlin metadata for reflection
- `kotlinx.coroutines.**` - Kotlin coroutines

### Why These Specific Classes?
- **Expo Modules:** Used via reflection by Expo's module system
- **Kotlin Runtime:** Required by Expo's Kotlin-based modules
- **Coroutines:** Used for async operations in Expo modules

---

## 🔬 Technical Details

### R8 vs ProGuard
- **R8:** Modern code shrinker (default in Android Gradle Plugin 3.4+)
- **ProGuard:** Legacy code shrinker (still uses same rule syntax)
- **Rules:** Both use the same ProGuard rule syntax

### When Does This Happen?
- **Debug Builds:** R8 is usually disabled (no error)
- **Release Builds:** R8 is enabled (error occurs)
- **Why:** Release builds optimize for size and performance

### Impact on APK Size
- **Without Rules:** Smaller APK (but broken - missing classes)
- **With Rules:** Slightly larger APK (~1-2 MB) but functional
- **Trade-off:** Necessary for app to work correctly

---

## ✅ Summary

**Problem:** R8 removes Expo classes it thinks are unused  
**Cause:** Expo uses reflection, R8 can't detect it  
**Solution:** Add ProGuard rules to keep required classes  
**Result:** Build succeeds, app works correctly ✅

---

## 📚 Related Concepts

### Reflection in Java/Kotlin
```kotlin
// This is how Expo loads modules dynamically
val clazz = Class.forName("expo.modules.kotlin.runtime.Runtime")
val instance = clazz.newInstance()
```
R8 doesn't see this as "using" the Runtime class, so it removes it.

### ProGuard Keep Rules
```proguard
-keep class expo.modules.** { *; }
```
This tells R8: "Keep ALL classes in expo.modules package and ALL their members"

---

## 🎓 Learn More

- [Android R8 Documentation](https://developer.android.com/studio/build/shrink-code)
- [ProGuard Manual](https://www.guardsquare.com/manual/home)
- [Expo ProGuard Guide](https://docs.expo.dev/guides/proguard/)
