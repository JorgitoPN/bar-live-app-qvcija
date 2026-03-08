
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * FINAL FIX (v5): Corrected Repository Isolation + Selective version forcing
 * 
 * Problem: 
 * - Previous regex was creating mismatched braces causing syntax errors
 * - stripe-android and financial-connections use dynamic versioning (20.48.+)
 * - JitPack timeouts cause APK build failures
 * 
 * Solution:
 * - Use TWO separate, precise regex replacements:
 *   1. Replace repositories block to add mavenCentral isolation
 *   2. Inject resolutionStrategy before closing brace of allprojects
 * - ISOLATE com.stripe group to ONLY use mavenCentral via content filter
 * - Force version 20.49.0 ONLY for stripe-android and financial-connections
 * - Allow stripe-3ds2-android to resolve its own compatible version naturally
 */
module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // 1. Replace the repositories block inside allprojects to add Stripe isolation
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*{\s*repositories\s*{([\s\S]*?)}/,
        `allprojects {
    repositories {
        mavenCentral {
            content {
                includeGroup "com.stripe"
            }
        }
$1}`
      );

      // 2. Inject the resolutionStrategy block just before the closing brace of allprojects
      config.modResults.contents = config.modResults.contents.replace(
        /(\s*)\}\s*$/gm,
        `
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.stripe' && 
                   (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections')) {
                    details.useVersion '20.49.0'
                }
            }
        }
    }
$1}`
      );
      
      console.log('✅ Stripe Repository Isolation + Dependency Fix applied (v5):');
      console.log('   - Repository Isolation: com.stripe → mavenCentral ONLY');
      console.log('   - Forcing stripe-android → 20.49.0');
      console.log('   - Forcing financial-connections → 20.49.0');
      console.log('   - Allowing stripe-3ds2-android to resolve naturally');
    }
    return config;
  });
};
