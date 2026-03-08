
const { withProjectBuildGradle, withAppBuildGradle, withProguardRules, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withStripeFixed(config) {
  // Apply JitPack exclusion and Kotlin flags to project-level build.gradle
  config = withProjectBuildGradle(config, (config) => {
    const gradleContents = config.modResults.contents;
    const jitpackFixMarker = "// --- STRIPE JITPACK FIX ---";

    if (!gradleContents.includes(jitpackFixMarker)) {
      config.modResults.contents += `

${jitpackFixMarker}
// Esto intercepta cualquier repositorio de JitPack y le prohíbe buscar Stripe.
allprojects {
    repositories.all { repo ->
        if (repo instanceof MavenArtifactRepository && repo.url.toString().contains("jitpack")) {
            repo.content {
                // EXCLUSIÓN TOTAL: Nunca busques com.stripe aquí.
                excludeGroup("com.stripe")
            }
        }
    }
}

// Relajamos las advertencias de versión de Kotlin para los módulos de Stripe
allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += [
                "-opt-in=kotlin.RequiresOptIn",
                "-Xsuppress-version-warnings"
            ]
        }
    }
}
// --- END STRIPE JITPACK FIX ---
`;
    }
    return config;
  });

  // Use the official withProguardRules API to add Stripe ProGuard rules
  config = withProguardRules(config, (config) => {
    // Add comprehensive Stripe ProGuard rules
    config.modResults.push(
      '# Stripe SDK - Keep all classes to prevent R8 minification issues',
      '-keep class com.stripe.android.** { *; }',
      '-keepclassmembers class com.stripe.android.** { *; }',
      '',
      '# Stripe Push Provisioning - Critical for payment flows',
      '-keep class com.stripe.android.pushProvisioning.** { *; }',
      '-keepclassmembers class com.stripe.android.pushProvisioning.** { *; }',
      '',
      '# Stripe Financial Connections',
      '-keep class com.stripe.android.financialconnections.** { *; }',
      '-keepclassmembers class com.stripe.android.financialconnections.** { *; }',
      '',
      '# Google Pay classes used by Stripe',
      '-keep class com.google.android.gms.wallet.** { *; }',
      '-keepclassmembers class com.google.android.gms.wallet.** { *; }',
      '',
      '# Prevent obfuscation of Stripe model classes',
      '-keepattributes Signature',
      '-keepattributes *Annotation*',
      '-keepattributes EnclosingMethod',
      '',
      '# Keep Stripe inner classes',
      '-keepclassmembers class com.stripe.android.** {',
      '    <init>(...);',
      '}',
      '',
      '# Dontwarn for optional dependencies',
      '-dontwarn com.stripe.android.**',
      '-dontwarn com.google.android.gms.wallet.**'
    );
    
    console.log('✅ Added comprehensive Stripe ProGuard rules via withProguardRules');
    return config;
  });

  return config;
}

module.exports = createRunOncePlugin(withStripeFixed, 'withStripeFixed', '2.0.0');
