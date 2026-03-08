
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * DENEGACIÓN TOTAL (v10): Complete JitPack Elimination + Static Version Forcing
 * 
 * Problems Fixed: 
 * - JitPack timeouts cause APK build failures (Read timed out)
 * - Gradle attempting to resolve com.stripe:financial-connections:22.8.+ from JitPack
 * - Dynamic version resolution (22.8.+, 20.+) causing unnecessary repository lookups
 * - "Duplicate class com.google.common.util.concurrent.ListenableFuture" error
 * 
 * Solution:
 * - FORCE ALL com.stripe dependencies to version 20.51.0 (no dynamic resolution)
 * - Use exclusiveContent to ISOLATE com.stripe group to ONLY mavenCentral
 * - ELIMINATE any possibility of JitPack access for Stripe dependencies
 * - Add eachDependency hook to intercept ALL com.stripe requests
 * - Add capabilitiesResolution to force empty listenablefuture version
 * - Use precise regex to replace entire allprojects block (prevents syntax errors)
 * 
 * This "Denegación Total" approach ensures Gradle NEVER looks at JitPack for Stripe.
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
        // EXCLUSIVE CONTENT: Stripe artifacts can ONLY come from mavenCentral
        // This is the strongest form of repository isolation in Gradle
        exclusiveContent {
            forRepository {
                mavenCentral()
            }
            filter {
                includeGroup "com.stripe"
            }
        }
        google()
        mavenCentral()
        // NOTE: JitPack is COMPLETELY REMOVED - it does not have official Stripe artifacts
    }
    
    configurations.all {
        resolutionStrategy {
            // FORCE stable Stripe version - prevents dynamic resolution (22.8.+, 20.+)
            // Using a fixed version avoids Gradle searching multiple repositories
            force 'com.stripe:stripe-android:20.51.0'
            
            // INTERCEPT ALL com.stripe dependency requests and force version 20.51.0
            // This catches stripe-android, financial-connections, and any other Stripe modules
            eachDependency { details ->
                if (details.requested.group == 'com.stripe') {
                    details.useVersion '20.51.0'
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
      
      console.log('✅ Stripe DENEGACIÓN TOTAL Fix applied (v10):');
      console.log('   - exclusiveContent: com.stripe → mavenCentral ONLY (strongest isolation)');
      console.log('   - Version Forcing: ALL com.stripe artifacts locked to 20.51.0');
      console.log('   - eachDependency hook: Intercepts ALL com.stripe requests');
      console.log('   - JitPack COMPLETELY REMOVED from repositories');
      console.log('   - ListenableFuture conflict resolution added');
      console.log('   - Gradle is now FORBIDDEN from accessing JitPack for Stripe');
    }
    return config;
  });
};
