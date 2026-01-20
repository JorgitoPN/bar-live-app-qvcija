
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for ws package missing './limiter' module
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle the missing limiter module in ws package
  if (moduleName === './limiter') {
    const originPath = context.originModulePath || '';
    if (originPath.includes('ws/lib/permessage-deflate.js') || originPath.includes('ws\\lib\\permessage-deflate.js')) {
      console.log('Mocking ws/limiter module');
      return {
        type: 'empty',
      };
    }
  }
  
  // Use the original resolver if available, otherwise use the default
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
