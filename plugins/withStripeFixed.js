
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*{[\s\S]*?^}/m,
      `allprojects {
    repositories {
        google()
        mavenCentral()
        maven { 
            url 'https://jitpack.io' 
            content {
                // ONLY JitPack for BlurView. BLOCKED for Stripe.
                includeGroup "com.github.Dimezis" 
            }
        }
    }
    
    // Force specific Stripe versions to avoid dynamic resolution issues
    configurations.all {
        resolutionStrategy {
            force 'com.stripe:stripe-android:20.51.0'
            force 'com.stripe:financial-connections:20.51.0'
            force 'com.stripe:payments-core:20.51.0'
            force 'com.stripe:stripe-core:20.51.0'
            
            eachDependency { details ->
                if (details.requested.group == 'com.stripe') {
                    // Force all Stripe dependencies to use version 20.51.0
                    details.useVersion '20.51.0'
                }
            }
        }
    }
    
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            // Allow using Stripe experimental APIs without Kotlin blocking
            freeCompilerArgs += [
                "-opt-in=kotlin.RequiresOptIn",
                "-Xsuppress-version-warnings"
            ]
        }
    }
}`
    );
    return config;
  });
};
