
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * This plugin forces a specific version of com.stripe:stripe-android to avoid
 * JitPack timeout issues during APK builds. The fix is applied automatically
 * during expo prebuild and survives --clean operations.
 * 
 * Problem: Gradle tries to resolve com.stripe:stripe-android:20.48.+ from JitPack,
 * which times out and causes build failures.
 * 
 * Solution: Force version 20.49.0 from mavenCentral() using resolutionStrategy.
 */
module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Check if resolutionStrategy already exists to avoid duplicate injection
      if (!config.modResults.contents.includes('resolutionStrategy')) {
        // Inject resolutionStrategy into allprojects block
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*{/,
          `allprojects {
    configurations.all {
        resolutionStrategy {
            // Force specific Stripe version to avoid JitPack timeout
            force 'com.stripe:stripe-android:20.49.0'
        }
    }`
        );
        
        console.log('✅ Stripe dependency fix applied: forcing com.stripe:stripe-android:20.49.0');
      } else {
        console.log('ℹ️  Stripe dependency fix already present in build.gradle');
      }
    }
    return config;
  });
};
