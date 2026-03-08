
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
                // SOLO permite entrar a JitPack para BlurView
                includeGroup "com.github.Dimezis" 
            }
        }
    }
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.stripe') {
                    // Forzamos versiones fijas para evitar que Gradle busque el "+" en JitPack
                    if (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections') {
                        details.useVersion '20.51.0'
                    }
                    if (details.requested.name == 'payment-method-messaging') {
                        details.useVersion '20.51.0'
                    }
                }
            }
        }
    }
}`
    );
    return config;
  });
};
