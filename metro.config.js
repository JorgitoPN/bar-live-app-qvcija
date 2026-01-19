
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure resolver is properly configured
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'mjs', 'cjs'],
};

// Remove any custom cache configuration that might be causing issues
delete config.cacheStores;
delete config.cacheVersion;

module.exports = config;
