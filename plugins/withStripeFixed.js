
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
                    if (details.requested.name == 'stripe-android' || 
                        details.requested.name == 'financial-connections' ||
                        details.requested.name == 'payment-method-messaging') {
                        details.useVersion '20.51.0'
                    }
                }
            }
        }
    }
    
    // FIX v13: Silenciar los errores de APIs experimentales de Stripe
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += [
                "-opt-in=com.stripe.android.customersheet.ExperimentalCustomerSheetApi",
                "-opt-in=com.stripe.android.paymentsheet.ExperimentalPaymentSheetApi",
                "-opt-in=com.stripe.android.core.ExperimentalStripeApi"
            ]
        }
    }
}`
    );
    return config;
  });
};
