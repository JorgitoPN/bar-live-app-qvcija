
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
                // REGLA DE ORO: Solo entrar a JitPack para lo que Maven no tiene
                includeGroup "com.github.Dimezis"
            }
        }
    }
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.stripe') {
                    if (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections') {
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
