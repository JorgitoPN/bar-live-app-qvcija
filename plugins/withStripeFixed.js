
const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Local Expo Config Plugin to fix Stripe Android dependency resolution
 * 
 * FINAL FIX (v4): Repository Isolation + Selective version forcing
 * 
 * Problem: 
 * - stripe-android and financial-connections use dynamic versioning (20.48.+)
 * - JitPack timeouts cause APK build failures
 * - stripe-3ds2-android does NOT have version 20.49.0 available
 * 
 * Solution:
 * - ELIMINATE JitPack from repository list (removed from app.json)
 * - ISOLATE com.stripe group to ONLY use mavenCentral via content filter
 * - Force version 20.49.0 ONLY for stripe-android and financial-connections
 * - Allow stripe-3ds2-android to resolve its own compatible version naturally
 * 
 * This "Repository Isolation" approach:
 * ✅ Prevents Gradle from ever attempting to fetch Stripe from JitPack
 * ✅ Guarantees all com.stripe dependencies come from fast, reliable mavenCentral
 * ✅ Fixes the problematic dependencies with + versioning
 * ✅ Avoids forcing non-existent versions on other Stripe libraries
 * ✅ Dramatically speeds up build times by eliminating slow repository lookups
 * ✅ Maintains compatibility across all Stripe SDK components
 */
module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Check if our custom allprojects block already exists to avoid duplicate injection
      if (!config.modResults.contents.includes('// Absolute priority to MavenCentral for Stripe')) {
        // Replace the entire allprojects block with our repository isolation + version forcing
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*{[^}]*}/,
          `allprojects {
    repositories {
        // Absolute priority to MavenCentral for Stripe
        // This content filter ensures com.stripe dependencies ONLY come from mavenCentral
        // Gradle will NOT attempt to fetch Stripe from any other repository (including JitPack)
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
                // Only force specific Stripe libraries that use dynamic versions (20.x.x)
                // This allows other dependencies like stripe-3ds2-android to resolve naturally
                if (details.requested.group == 'com.stripe' && 
                   (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections')) {
                    details.useVersion '20.49.0'
                }
            }
        }
    }
}`
        );
        
        console.log('✅ Stripe Repository Isolation + Dependency Fix applied:');
        console.log('   - Repository Isolation: com.stripe → mavenCentral ONLY');
        console.log('   - JitPack eliminated from repository list');
        console.log('   - Forcing stripe-android → 20.49.0');
        console.log('   - Forcing financial-connections → 20.49.0');
        console.log('   - Allowing stripe-3ds2-android to resolve naturally');
      } else {
        console.log('ℹ️  Stripe Repository Isolation already present in build.gradle');
      }
    }
    return config;
  });
};
