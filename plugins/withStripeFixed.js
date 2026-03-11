
const { withProjectBuildGradle, withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
  // 1. JitPack exclusion for Stripe (prevents timeout errors)
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("STRIPE JITPACK FIX")) {
      config.modResults.contents += `
// --- STRIPE JITPACK FIX ---
allprojects {
    repositories.all { repo ->
        if (repo instanceof MavenArtifactRepository && repo.url.toString().contains("jitpack")) {
            repo.content { excludeGroup("com.stripe") }
        }
    }
}
// --- END STRIPE JITPACK FIX ---
`;
    }
    return config;
  });

  // 2. Add multiDexEnabled to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("multiDexEnabled")) {
      config.modResults.contents = config.modResults.contents.replace(
        /defaultConfig\s*{/,
        `defaultConfig {
        multiDexEnabled true`
      );
    }
    return config;
  });

  // 3. ProGuard rules injection for R8 optimization (fixes Missing class error)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      
      // Ensure the file exists
      if (fs.existsSync(proguardPath)) {
        let contents = fs.readFileSync(proguardPath, 'utf-8');
        
        const stripeRules = `
# --- STRIPE & NITRO MODULES PROGUARD FIX ---
# Prevent R8 from stripping Stripe PushProvisioning classes
-dontwarn com.stripe.android.pushProvisioning.**
-keep class com.stripe.android.pushProvisioning.** { *; }

# Prevent R8 from stripping Nitro Modules classes
-dontwarn com.margelo.nitro.**
-keep class com.margelo.nitro.** { *; }

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}
# --- END STRIPE & NITRO MODULES PROGUARD FIX ---
`;
        
        // Only add if not already present
        if (!contents.includes('STRIPE & NITRO MODULES PROGUARD FIX')) {
          fs.writeFileSync(proguardPath, contents + stripeRules);
          console.log('✅ Stripe & Nitro Modules ProGuard rules injected successfully');
        }
      } else {
        console.log('⚠️ proguard-rules.pro not found, will be created during prebuild');
      }
      
      return config;
    },
  ]);

  return config;
};
