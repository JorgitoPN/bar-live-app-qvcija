
# 🔍 Verification Checklist - Stripe APK Build Fix

Run through this checklist to verify the Stripe dependency fix is properly configured:

## ✅ Pre-Build Verification

### 1. **Plugin File Exists**
- [ ] File `plugins/withStripeFixed.js` exists
- [ ] File contains `withProjectBuildGradle` import
- [ ] File contains `force 'com.stripe:stripe-android:20.49.0'`

### 2. **Plugin Registered in app.json**
- [ ] Open `app.json`
- [ ] Check `expo.plugins` array
- [ ] Verify `"./plugins/withStripeFixed"` is present
- [ ] Verify it's listed **after** `"expo-router"` but **before** other plugins

### 3. **Repository Configuration**
- [ ] Open `app.json`
- [ ] Navigate to `expo.plugins` → find `expo-build-properties`
- [ ] Check `android.extraMavenRepos`
- [ ] Verify `"google()"` is listed
- [ ] Verify `"mavenCentral()"` is listed

---

## 🏗️ Build Verification

### 4. **Run Prebuild**
```bash
expo prebuild -p android --clean
```

**Expected Output:**
```
✅ Stripe dependency fix applied: forcing com.stripe:stripe-android:20.49.0
```

OR (if already applied):
```
ℹ️  Stripe dependency fix already present in build.gradle
```

### 5. **Check Generated build.gradle**
- [ ] Open `android/build.gradle`
- [ ] Search for `resolutionStrategy`
- [ ] Verify this block exists:
```groovy
allprojects {
    configurations.all {
        resolutionStrategy {
            // Force specific Stripe version to avoid JitPack timeout
            force 'com.stripe:stripe-android:20.49.0'
        }
    }
}
```

---

## 🚀 Build Test

### 6. **Trigger APK Build**

**Option A: EAS Build (Recommended)**
```bash
eas build --platform android --profile production
```

**Option B: Local Build**
```bash
cd android
./gradlew assembleDebug
cd ..
```

### 7. **Monitor Build Logs**
- [ ] Build starts without errors
- [ ] No "Read timed out" errors for Stripe
- [ ] No JitPack timeout errors
- [ ] Build completes successfully
- [ ] APK file is generated

---

## ✅ Success Indicators

If you see these, the fix is working:

1. ✅ Plugin logs appear during prebuild
2. ✅ `resolutionStrategy` block is in `android/build.gradle`
3. ✅ Build completes without Stripe dependency errors
4. ✅ APK file is generated successfully

---

## ❌ Troubleshooting

### If prebuild doesn't show plugin logs:

1. **Check plugin syntax:**
   ```bash
   node -c plugins/withStripeFixed.js
   ```
   Should output nothing (no syntax errors)

2. **Verify plugin path in app.json:**
   - Must be `"./plugins/withStripeFixed"` (relative path with `./`)
   - NOT `"plugins/withStripeFixed"` (missing `./`)

3. **Clear Expo cache:**
   ```bash
   expo start --clear
   ```

### If build still fails with Stripe errors:

1. **Clear Gradle cache:**
   ```bash
   cd android
   ./gradlew clean
   rm -rf ~/.gradle/caches/
   cd ..
   ```

2. **Verify mavenCentral is accessible:**
   - Check internet connection
   - Check if behind corporate firewall/proxy

3. **Try different Stripe version:**
   - Edit `plugins/withStripeFixed.js`
   - Change to `force 'com.stripe:stripe-android:20.48.0'`
   - Run prebuild again

---

## 📊 Expected Timeline

- **Prebuild:** ~2-5 minutes
- **Local Gradle build:** ~5-10 minutes (first time), ~2-3 minutes (subsequent)
- **EAS Build:** ~15-20 minutes

---

## 🎯 Final Confirmation

Once the APK builds successfully:

- [ ] APK file exists in `android/app/build/outputs/apk/`
- [ ] APK installs on Android device/emulator
- [ ] App launches without crashes
- [ ] Stripe functionality works (if implemented)

---

**Status:** Ready for verification ✅

Run through this checklist after implementing the fix to ensure everything is working correctly.
