
const { withProjectBuildGradle, withAppBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');
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

  // Apply R8/ProGuard rules to app-level build.gradle
  config = withAppBuildGradle(config, (config) => {
    const appGradleContents = config.modResults.contents;
    const r8FixMarker = "# --- START STRIPE R8/PROGUARD RULES ---";
    const stripeR8RulesFileName = 'stripe-r8-rules.pro';

    // Ensure the stripe-r8-rules.pro file exists and contains the rules
    const projectRoot = config.modRequest.projectRoot;
    const androidAppPath = path.join(projectRoot, 'android', 'app');
    const proguardRulesPath = path.join(androidAppPath, stripeR8RulesFileName);

    const stripeR8RulesContent = `
${r8FixMarker}
# Keep Stripe Push Provisioning classes from being minified by R8
-keep class com.stripe.android.pushProvisioning.** { *; }
-keepclassmembers class com.stripe.android.pushProvisioning.** { *; }

# Keep all Stripe SDK classes to prevent any minification issues
-keep class com.stripe.android.** { *; }
-keepclassmembers class com.stripe.android.** { *; }

# Keep Google Pay classes used by Stripe
-keep class com.google.android.gms.wallet.** { *; }
-keepclassmembers class com.google.android.gms.wallet.** { *; }
# --- END STRIPE R8/PROGUARD RULES ---
`;

    // Create android/app directory if it doesn't exist
    if (!fs.existsSync(androidAppPath)) {
      fs.mkdirSync(androidAppPath, { recursive: true });
    }

    // Write the file if it doesn't exist or if its content is not the expected one
    if (!fs.existsSync(proguardRulesPath) || !fs.readFileSync(proguardRulesPath, 'utf8').includes(r8FixMarker)) {
      fs.writeFileSync(proguardRulesPath, stripeR8RulesContent);
      console.log('✅ Created stripe-r8-rules.pro with ProGuard keep rules');
    }

    // Modify app/build.gradle to include the new proguard file
    const releaseBlockRegex = /(buildTypes\s*\{\s*release\s*\{[^}]*)\}/;
    const match = appGradleContents.match(releaseBlockRegex);

    if (match && !appGradleContents.includes(stripeR8RulesFileName)) {
      // Check if proguardFiles already exists in the release block
      const existingProguardFilesRegex = /proguardFiles\s*\([^)]*\)/s;
      const existingMatch = match[1].match(existingProguardFilesRegex);

      if (existingMatch) {
        // Append to existing proguardFiles
        const newProguardFilesLine = existingMatch[0].replace(/\)/, `, '${stripeR8RulesFileName}')`);
        config.modResults.contents = appGradleContents.replace(
          releaseBlockRegex,
          match[1].replace(existingProguardFilesRegex, newProguardFilesLine) + '}'
        );
        console.log('✅ Added stripe-r8-rules.pro to existing proguardFiles');
      } else {
        // Add proguardFiles if not present
        const newProguardFilesBlock = `
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro', '${stripeR8RulesFileName}'
`;
        config.modResults.contents = appGradleContents.replace(
          releaseBlockRegex,
          `${match[1]}\n${newProguardFilesBlock}\n        }`
        );
        console.log('✅ Added proguardFiles with stripe-r8-rules.pro to release buildType');
      }
    } else if (!match) {
      // Fallback: if no release block, create one and add proguardFiles
      const androidBlockRegex = /(android\s*\{[^}]*)\}/;
      config.modResults.contents = appGradleContents.replace(
        androidBlockRegex,
        `$1\n    buildTypes {\n        release {\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro', '${stripeR8RulesFileName}'\n        }\n    }\n}`
      );
      console.log('✅ Created release buildType with stripe-r8-rules.pro');
    }

    return config;
  });

  return config;
}

module.exports = createRunOncePlugin(withStripeFixed, 'withStripeFixed', '1.0.0');
