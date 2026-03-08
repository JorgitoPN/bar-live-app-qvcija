
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * FINAL FIX (v3): Selective version forcing for Stripe dependencies
 * 
 * Problem: 
 * - stripe-android and financial-connections use dynamic versioning (20.48.+)
 * - This causes JitPack timeout issues during APK builds
 * - stripe-3ds2-android does NOT have version 20.49.0 available
 * 
 * Solution:
 * - Force version 20.49.0 ONLY for stripe-android and financial-connections
 * - Allow stripe-3ds2-android to resolve its own compatible version naturally
 * - Repository priority: google() and mavenCentral() first, JitPack last (configured in app.json)
 * 
 * This targeted approach:
 * ✅ Fixes the problematic dependencies with + versioning
 * ✅ Avoids forcing non-existent versions on other Stripe libraries
 * ✅ Eliminates JitPack timeouts by prioritizing fast, reliable repositories
 * ✅ Maintains compatibility across all Stripe SDK components
 */
module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Check if eachDependency resolutionStrategy already exists to avoid duplicate injection
      if (!config.modResults.contents.includes('eachDependency')) {
        // Inject selective eachDependency resolutionStrategy into allprojects block
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*{/,
          `allprojects {
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                // Only force specific Stripe libraries that use dynamic versions (20.x.x)
                // This allows other dependencies like stripe-3ds2-android to resolve naturally
                if (details.requested.group == 'com.stripe' && 
                   (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections')) {
                    details.useVersion '20.49.0'
                }
            }
        }
    }`
        );
        
        console.log('✅ Stripe selective dependency fix applied:');
        console.log('   - Forcing stripe-android → 20.49.0');
        console.log('   - Forcing financial-connections → 20.49.0');
        console.log('   - Allowing stripe-3ds2-android to resolve naturally');
      } else {
        console.log('ℹ️  Stripe dependency fix already present in build.gradle');
      }
    }
    return config;
  });
};
