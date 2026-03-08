
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix ALL Stripe Android dependency resolution
 * 
 * This plugin forces version 20.49.0 for ALL dependencies in the com.stripe group
 * to avoid JitPack timeout issues during APK builds. The fix is applied automatically
 * during expo prebuild and survives --clean operations.
 * 
 * Problem: Gradle tries to resolve com.stripe:* dependencies with dynamic versions
 * (e.g., 20.48.+) from JitPack, which times out and causes build failures.
 * 
 * Solution: Use eachDependency to intercept ALL com.stripe dependencies and force
 * version 20.49.0 from mavenCentral(), eliminating JitPack lookups entirely.
 * 
 * This catch-all approach handles:
 * - com.stripe:stripe-android
 * - com.stripe:financial-connections
 * - com.stripe:stripe-3ds2-android
 * - Any other com.stripe dependencies
 */
module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Check if eachDependency resolutionStrategy already exists to avoid duplicate injection
      if (!config.modResults.contents.includes('eachDependency')) {
        // Inject eachDependency resolutionStrategy into allprojects block
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*{/,
          `allprojects {
    configurations.all {
        resolutionStrategy {
            // Force version 20.49.0 for ALL com.stripe dependencies
            // This catch-all approach eliminates JitPack timeouts by forcing
            // all Stripe artifacts to use the stable version from mavenCentral()
            eachDependency { details ->
                if (details.requested.group == 'com.stripe') {
                    details.useVersion '20.49.0'
                }
            }
        }
    }`
        );
        
        console.log('✅ Stripe catch-all dependency fix applied: forcing ALL com.stripe:* to 20.49.0');
      } else {
        console.log('ℹ️  Stripe catch-all dependency fix already present in build.gradle');
      }
    }
    return config;
  });
};
