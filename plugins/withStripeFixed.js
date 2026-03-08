
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * This plugin forces version 20.49.0 ONLY for specific Stripe dependencies that use
 * dynamic versioning (20.x.x) to avoid JitPack timeout issues during APK builds.
 * 
 * Problem: Gradle tries to resolve com.stripe:stripe-android and com.stripe:financial-connections
 * with dynamic versions (e.g., 20.48.+) from JitPack, which times out and causes build failures.
 * 
 * Solution: Use eachDependency to intercept ONLY stripe-android and financial-connections,
 * forcing version 20.49.0 from mavenCentral(). Other Stripe dependencies (like stripe-3ds2-android)
 * are allowed to resolve their versions naturally to avoid compatibility issues.
 * 
 * This targeted approach:
 * - Fixes stripe-android and financial-connections (the problematic ones with + versioning)
 * - Allows stripe-3ds2-android to use its correct version (not 20.49.0, which doesn't exist)
 * - Eliminates JitPack timeouts by prioritizing mavenCentral and google repositories
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
            // Only force versions for specific Stripe libraries that use 20.x.x versioning
            // This allows other dependencies (like stripe-3ds2-android) to resolve naturally
            eachDependency { details ->
                if (details.requested.group == 'com.stripe' && 
                   (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections')) {
                    details.useVersion '20.49.0'
                }
            }
        }
    }`
        );
        
        console.log('✅ Stripe targeted dependency fix applied: forcing stripe-android and financial-connections to 20.49.0');
      } else {
        console.log('ℹ️  Stripe dependency fix already present in build.gradle');
      }
    }
    return config;
  });
};
