
/**
 * Mock module for ws package's limiter
 * This is needed because Metro bundler can't resolve the limiter module
 * that ws package tries to import, but it's not actually needed in React Native
 */

'use strict';

// Export an empty object to satisfy the import
module.exports = {};
