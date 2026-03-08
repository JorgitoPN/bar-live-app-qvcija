
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    // Evitamos duplicar el código si el plugin se ejecuta varias veces
    if (config.modResults.contents.includes("STRIPE JITPACK FIX")) {
      return config;
    }

    config.modResults.contents += `

// --- STRIPE JITPACK FIX ---
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
    return config;
  });
};
