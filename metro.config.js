const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use turborepo to restore the cache when possible
config.cacheStores = [
    new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
  ];

// Ignore large files and temporary files that can cause performance issues
config.watchFolders = config.watchFolders || [];
config.resolver = {
  ...config.resolver,
  blockList: [
    // Ignore chat history and other large temporary files
    /chat_history\.json$/,
    /.*\.log$/,
    /.*\.tmp$/,
    /temp\/.*/,
    /cache\/.*/,
  ],
};

module.exports = config;
