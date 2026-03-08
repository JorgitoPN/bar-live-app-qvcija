
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{[\s\S]*?^\}/m,
      `allprojects {
    repositories {
        google()
        mavenCentral()
        maven { 
            url 'https://jitpack.io' 
            content {
                // SOLO JitPack para BlurView (Dimezis). 
                // PROHIBIDO buscar Stripe aquí para evitar el timeout de 12 min.
                includeGroup "com.github.Dimezis" 
            }
        }
    }

    // Quitamos el forzado de versiones para que stripe-react-native 
    // maneje sus propias dependencias internas correctamente.

    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            // Esto silencia los errores de "API under construction"
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
