
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*{[\s\S]*?^}/m,
      `allprojects {
    repositories {
        // 1. Prioridad absoluta a Google y Maven Central
        google()
        mavenCentral()
        
        // 2. Stripe exclusivo desde Maven Central (evita búsqueda en JitPack)
        exclusiveContent {
            forRepository {
                mavenCentral()
            }
            filter {
                includeGroup "com.stripe"
            }
        }
        
        // 3. JitPack con timeout agresivo y filtro estricto (solo BlurView)
        maven { 
            url 'https://jitpack.io'
            content {
                // Solo permitir JitPack para BlurView, bloqueando todo lo demás
                includeGroup "com.github.Dimezis"
            }
        }
    }
    
    configurations.all {
        resolutionStrategy {
            // 4. Forzar versiones específicas de Stripe
            eachDependency { details ->
                if (details.requested.group == 'com.stripe') {
                    if (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections') {
                        details.useVersion '20.51.0'
                    }
                }
                // 5. Forzar versión específica de BlurView
                if (details.requested.group == 'com.github.Dimezis' && details.requested.name == 'BlurView') {
                    details.useVersion '2.0.6'
                }
            }
            
            // 6. Resolver conflicto de ListenableFuture
            capabilitiesResolution.withCapability('com.google.guava:listenablefuture') {
                select('com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava')
            }
            
            // 7. No cachear versiones dinámicas (forzar resolución fresca)
            cacheDynamicVersionsFor 0, 'seconds'
        }
    }
}`
    );
    return config;
  });
};
