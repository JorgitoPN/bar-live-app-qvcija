# BarLive

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.

---

## 🚨 APK Build Fix Required

**Issue:** The APK build is failing due to a Stripe Android SDK dependency timeout from JitPack.

**Solution:** Update `android/build.gradle` to force Stripe to use Maven Central instead.

**Instructions:** See `APK_BUILD_FIX_REQUIRED.md` for the complete fix (takes 30 seconds to apply).

**Files Ready:**
- ✅ `APK_BUILD_FIX_REQUIRED.md` - Quick fix guide with copy/paste code
- ✅ `FIX_APK_BUILD_STRIPE.md` - Step-by-step instructions
- ✅ `SOLUCION_BUILD_APK_STRIPE.md` - Complete technical documentation
