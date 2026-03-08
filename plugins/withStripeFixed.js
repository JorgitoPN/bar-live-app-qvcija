
const { withProjectBuildGradle } = require('@expo/config-plugins');
module.exports = (config) => {
return withProjectBuildGradle(config, (config) => {
config.modResults.contents = config.modResults.contents.replace(
/allprojects\s*{[\s\S]*?^}/m,
`allprojects { repositories { exclusiveContent { forRepository { mavenCentral() } filter { includeGroup "com.stripe" } } google() mavenCentral() } configurations.all { resolutionStrategy { eachDependency { details -> if (details.requested.group == 'com.stripe') { if (details.requested.name == 'stripe-android' || details.requested.name == 'financial-connections') { details.useVersion '20.51.0' } } } capabilitiesResolution.withCapability('com.google.guava:listenablefuture') { select('com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava') } } } }`
);
return config;
});
};
