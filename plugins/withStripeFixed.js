
const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes("STRIPE JITPACK FIX")) {
      return config;
    }

    config.modResults.contents += `
// --- STRIPE JITPACK FIX ---
allprojects {
    repositories.all { repo ->
        if (repo instanceof MavenArtifactRepository && repo.url.toString().contains("jitpack")) {
            repo.content {
                excludeGroup("com.stripe")
            }
        }
    }
}
// --- END STRIPE JITPACK FIX ---
`;
    return config;
  });
};
