
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * FINAL FIX (v7): Repository Isolation + Version Forcing + ListenableFuture Conflict Resolution
 * 
 * Problems Fixed: 
 * - stripe-android and financial-connections use dynamic versioning (20.48.+)
 * - JitPack timeouts cause APK build failures
 * - "Duplicate class com.google.common.util.concurrent.ListenableFuture" error
 *   (Classic conflict between Stripe SDK and Google Play Services libraries)
 * - Syntax errors from overly broad regex replacements
 * 
 * Solution:
 * - Use ONE precise regex replacement that targets the ENTIRE allprojects block
 * - ISOLATE com.stripe group to ONLY use mavenCentral via content filter
 * - Force version 20.49.0 ONLY for stripe-android and financial-connections
 * - Allow stripe-3ds2-android to resolve its own compatible version naturally
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
            eachDependency { details ->
                if (details.requested.group == 'com.stripe' && 
                   (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections')) {
                    details.useVersion '20.49.0'
                }
            }
            
            // Fix for "Duplicate class com.google.common.util.concurrent.ListenableFuture"
            // This is a classic conflict between Stripe and Google libraries
            capabilitiesResolution.withCapability('com.google.guava:listenablefuture') {
                select('com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava')
            }
        }
    }
}`
      );
      
      console.log('✅ Stripe Repository Isolation + Dependency Fix applied (v7):');
      console.log('   - Repository Isolation: com.stripe → mavenCentral ONLY');
      console.log('   - Forcing stripe-android → 20.49.0');
      console.log('   - Forcing financial-connections → 20.49.0');
      console.log('   - Allowing stripe-3ds2-android to resolve naturally');
      console.log('   - ListenableFuture conflict resolution added (fixes Duplicate class error)');
      console.log('   - Fixed regex to replace entire allprojects block (prevents syntax errors)');
    }
    return config;
  });
};
