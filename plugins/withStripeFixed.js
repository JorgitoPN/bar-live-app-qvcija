
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * BRUTE FORCE FIX (v9): Complete JitPack Elimination + Forced Stable Version
 * 
 * Problems Fixed: 
 * - JitPack timeouts cause APK build failures (Read timed out)
 * - Gradle attempting to resolve com.stripe:stripe-android:22.8.+ from JitPack
 * - "Duplicate class com.google.common.util.concurrent.ListenableFuture" error
 * - Dynamic version resolution (22.8.+) causing unnecessary repository lookups
 * 
 * Solution:
 * - FORCE com.stripe:stripe-android to version 20.51.0 (stable, no dynamic resolution)
 * - ISOLATE com.stripe group to ONLY use mavenCentral via content filter
 * - ELIMINATE any possibility of JitPack access for Stripe dependencies
 * - Add capabilitiesResolution to force empty listenablefuture version
 * - Use precise regex to replace entire allprojects block (prevents syntax errors)
 * 
 * This "brute force" approach ensures Gradle NEVER looks at JitPack for Stripe.
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
        // FIRST: MavenCentral with STRICT Stripe isolation
        // This ensures com.stripe artifacts are ONLY resolved from MavenCentral
        mavenCentral {
            content {
                includeGroup "com.stripe"
            }
        }
        google()
        mavenCentral()
        // NOTE: JitPack is COMPLETELY REMOVED - it does not have official Stripe artifacts
    }
    
    configurations.all {
        resolutionStrategy {
            // FORCE stable Stripe version - prevents dynamic resolution (22.8.+)
            // Using a fixed version avoids Gradle searching multiple repositories
            force 'com.stripe:stripe-android:20.51.0'
            
            // Fix for "Duplicate class com.google.common.util.concurrent.ListenableFuture"
            // This is a classic conflict between Stripe and Google libraries
            capabilitiesResolution.withCapability('com.google.guava:listenablefuture') {
                select('com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava')
            }
        }
    }
}`
      );
      
      console.log('✅ Stripe BRUTE FORCE Fix applied (v9):');
      console.log('   - Repository Isolation: com.stripe → mavenCentral ONLY (FIRST in list)');
      console.log('   - Version Forcing: stripe-android locked to 20.51.0 (no dynamic resolution)');
      console.log('   - JitPack COMPLETELY REMOVED from repositories');
      console.log('   - ListenableFuture conflict resolution added');
      console.log('   - This prevents Gradle from ever attempting JitPack for Stripe');
    }
    return config;
  });
};
