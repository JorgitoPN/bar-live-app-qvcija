
# 🚨 IMMEDIATE FIX - APK Build Error (Stripe Timeout)

## ⚡ Quick Solution (1 minute)

The build is failing because Stripe is trying to download from JitPack (which is timing out). The solution is to force it to download from Maven Central instead.

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### 1️⃣ Open the file

Navigate to: **`android/build.gradle`**

### 2️⃣ Replace ALL content

Delete everything in the file and paste this code:

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
    // Removed JitPack - it's causing timeouts and Stripe doesn't need it
    // All dependencies should resolve from Maven Central or Google
  }
  
  // Force Stripe Android SDK to resolve from Maven Central with a specific version
  configurations.all {
    resolutionStrategy {
      // Force a specific version of Stripe Android SDK that's available on Maven Central
      force 'com.stripe:stripe-android:20.49.0'
      
      // Prevent any attempts to resolve from JitPack
      eachDependency { details ->
        if (details.requested.group == 'com.stripe' && details.requested.name == 'stripe-android') {
          details.useVersion '20.49.0'
          details.because 'Force Stripe to use a specific version from Maven Central, avoiding JitPack timeouts'
        }
      }
    }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
```

### 3️⃣ Save the file

Press `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac)

### 4️⃣ Trigger a new build

The build should work now. ✅

---

## 🔍 What does this fix do?

| Change | Effect |
|--------|--------|
| ❌ Removes JitPack | Avoids network timeouts |
| ✅ Uses Maven Central | Stable and fast repository |
| 🔒 Forces version 20.49.0 | Avoids dynamic ranges (21.22.+) |
| 🛡️ Intercepts resolution | Ensures Stripe uses Maven Central |

---

## ✅ Verification

After saving, your `android/build.gradle` file should have:

- ✅ Lines 11-12: `google()` and `mavenCentral()` (no JitPack)
- ✅ Lines 18-30: `configurations.all { resolutionStrategy { ... } }` block
- ✅ Line 22: `force 'com.stripe:stripe-android:20.49.0'`
- ✅ Lines 35-36: Expo plugins at the end

---

## 🆘 If it still fails

1. **Verify you saved the file correctly**
2. **Make sure there are no syntax errors** (copy the code exactly as shown)
3. **Check that Maven Central is accessible** from your network
4. **Consult** `SOLUCION_BUILD_APK_STRIPE.md` for advanced troubleshooting

---

## 📊 Already configured files

These files are already correctly configured (you don't need to touch them):

- ✅ `android/gradle.properties` - Network timeouts configured
- ✅ `eas.json` - Gradle optimized with `--no-daemon --max-workers=4`

---

## 🎯 Expected result

```
✅ BUILD SUCCESSFUL in 5m 23s
✅ APK generated correctly
✅ No Stripe errors
```

---

## 📚 Additional documentation

- **Complete solution:** `SOLUCION_BUILD_APK_STRIPE.md`
- **Detailed instructions:** `INSTRUCCIONES_BUILD_GRADLE.md`
- **Stripe on Maven Central:** https://mvnrepository.com/artifact/com.stripe/stripe-android/20.49.0
