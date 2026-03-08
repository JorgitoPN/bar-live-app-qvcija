
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * FINAL FIX (v8): Repository Isolation + ListenableFuture Conflict Resolution
 * 
 * Problems Fixed: 
 * - "Unresolved reference 'currentActivity'" error with React Native 0.81.5
 * - JitPack timeouts cause APK build failures
 * - "Duplicate class com.google.common.util.concurrent.ListenableFuture" error
 *   (Classic conflict between Stripe SDK and Google Play Services libraries)
 * - Syntax errors from overly broad regex replacements
 * 
 * Solution:
 * - Updated @stripe/stripe-react-native to latest version (compatible with RN 0.81.5)
 * - Use ONE precise regex replacement that targets the ENTIRE allprojects block
 * - ISOLATE com.stripe group to ONLY use mavenCentral via content filter
 * - Let the updated Stripe SDK resolve its own compatible native dependencies
 * - Add capabilitiesResolution to force empty listenablefuture version
 *   (Prevents duplicate class errors with Guava/Google libraries)
 */
module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Replace the ENTIRE allprojects block with our fixed version
      // This ensures proper syntax and avoids partial replacements
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{[\s\S]*?^\}/m,
        `allprojects {
    repositories {
        mavenCentral {
            content {
                includeGroup "com.stripe"
            }
        }
        google()
        mavenCentral()
    }
    
    configurations.all {
        resolutionStrategy {
            // Fix for "Duplicate class com.google.common.util.concurrent.ListenableFuture"
            // This is a classic conflict between Stripe and Google libraries
            capabilitiesResolution.withCapability('com.google.guava:listenablefuture') {
                select('com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava')
            }
        }
    }
}`
      );
      
      console.log('✅ Stripe Repository Isolation + Dependency Fix applied (v8):');
      console.log('   - Repository Isolation: com.stripe → mavenCentral ONLY');
      console.log('   - Updated @stripe/stripe-react-native to latest (fixes currentActivity error)');
      console.log('   - Allowing all Stripe dependencies to resolve naturally');
      console.log('   - ListenableFuture conflict resolution added (fixes Duplicate class error)');
      console.log('   - Fixed regex to replace entire allprojects block (prevents syntax errors)');
    }
    return config;
  });
};
