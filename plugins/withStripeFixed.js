
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
                // SOLO JitPack para BlurView. PROHIBIDO para Stripe.
                includeGroup "com.github.Dimezis" 
            }
        }
    }
    // Eliminamos el forzado de versiones (ResolutionStrategy) 
    // para evitar errores de compilación.
    
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            // Esto permite usar las APIs de Stripe sin que Kotlin se bloquee
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
