
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{[\s\S]*?^\}/m,
      `allprojects {
    repositories {
        google()
        mavenCentral()

        // FIX: Explicitly restrict com.stripe to Google and MavenCentral ONLY
        // This prevents JitPack from being queried for Stripe dependencies
        exclusiveContent {
            forRepository {
                google()
            }
            filter {
                includeGroup "com.stripe"
            }
        }

        exclusiveContent {
            forRepository {
                mavenCentral()
            }
            filter {
                includeGroup "com.stripe"
            }
        }

        // Allow JitPack only for com.github.Dimezis (BlurView)
        maven {
            url 'https://jitpack.io'
            content {
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
