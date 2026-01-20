
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for ws package missing './limiter' module
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === './limiter' && context.originModulePath?.includes('ws/lib/permessage-deflate.js')) {
    // Return a mock module for the limiter
    return {
      type: 'empty',
    };
  }
  
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
