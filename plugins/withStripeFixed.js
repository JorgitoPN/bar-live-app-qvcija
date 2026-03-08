
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{[\s\S]*?^\}/m,
      `allprojects {
    repositories {
        // Primary repositories - order matters for resolution speed
        google()
        mavenCentral()
        
        // JitPack restricted to only BlurView to prevent Stripe timeout issues
        maven { 
            url 'https://jitpack.io' 
            content {
                // ONLY allow JitPack for BlurView (Dimezis)
                // This prevents Gradle from searching JitPack for Stripe dependencies
                includeGroup "com.github.Dimezis" 
            }
        }
    }

    // Kotlin compiler options to allow experimental APIs and suppress warnings
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
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
