
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Fix for ws package missing ./limiter module
// Create a mock limiter.js file if it doesn't exist
const limiterPath = path.join(__dirname, 'node_modules', 'ws', 'lib', 'limiter.js');
if (!fs.existsSync(limiterPath)) {
  const limiterDir = path.dirname(limiterPath);
  if (!fs.existsSync(limiterDir)) {
    fs.mkdirSync(limiterDir, { recursive: true });
  }
  // Create a mock limiter module that exports an empty object
  fs.writeFileSync(limiterPath, `'use strict';

// Mock limiter module for Metro bundler compatibility
module.exports = {};
`);
}

// Fix for ws package missing ./lib/stream module
// Create a mock stream.js file if it doesn't exist
const streamPath = path.join(__dirname, 'node_modules', 'ws', 'lib', 'stream.js');
if (!fs.existsSync(streamPath)) {
  const streamDir = path.dirname(streamPath);
  if (!fs.existsSync(streamDir)) {
    fs.mkdirSync(streamDir, { recursive: true });
  }
  // Create a mock stream module that exports an empty object
  fs.writeFileSync(streamPath, `'use strict';

// Mock stream module for Metro bundler compatibility
module.exports = {};
`);
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check if the module being requested is './limiter' from within the 'ws' package
  if (moduleName === './limiter' && context.originModulePath && context.originModulePath.includes('ws')) {
    // Return the mock limiter module
    return {
      filePath: limiterPath,
      type: 'sourceFile',
    };
  }
  
  // Check if the module being requested is './lib/stream' from within the 'ws' package
  if (moduleName === './lib/stream' && context.originModulePath && context.originModulePath.includes('ws')) {
    // Return the mock stream module
    return {
      filePath: streamPath,
      type: 'sourceFile',
    };
  }
  
  // For all other modules, use the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

// Use turborepo to restore the cache when possible
config.cacheStores = [
    new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
  ];

// Custom server middleware to receive console.log messages from the app
const LOG_FILE_PATH = path.join(__dirname, '.natively', 'app_console.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {

    // DEBUG: log all metro bundle requests
    if (req.url.includes('index.bundle') || req.url.includes('.bundle')) {
      console.log('[METRO] Request:', req.method, req.url);
    }

    // Extract pathname without query params for matching
    const pathname = req.url.split('?')[0];

    // Handle log receiving endpoint
    if (pathname === '/natively-logs' && req.method === 'POST') {
      console.log('[NATIVELY-LOGS] Received POST request');
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const logData = JSON.parse(body);
          const timestamp = logData.timestamp || new Date().toISOString();
          const level = (logData.level || 'log').toUpperCase();
          const message = logData.message || '';
          const source = logData.source || '';
          const platform = logData.platform || '';

          const platformInfo = platform ? `[${platform}] ` : '';
          const sourceInfo = source ? `[${source}] ` : '';
          const logLine = `[${timestamp}] ${platformInfo}[${level}] ${sourceInfo}${message}\n`;

          console.log('[NATIVELY-LOGS] Writing log:', logLine.trim());

          // Rotate log file if too large
          try {
            if (fs.existsSync(LOG_FILE_PATH) && fs.statSync(LOG_FILE_PATH).size > MAX_LOG_SIZE) {
              const content = fs.readFileSync(LOG_FILE_PATH, 'utf8');
              const lines = content.split('\n');
              fs.writeFileSync(LOG_FILE_PATH, lines.slice(lines.length / 2).join('\n'));
            }
          } catch (e) {
            // Ignore rotation errors
          }

          fs.appendFileSync(LOG_FILE_PATH, logLine);

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end('{"status":"ok"}');
        } catch (e) {
          console.error('[NATIVELY-LOGS] Error processing log:', e.message);
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // Handle CORS preflight for log endpoint
    if (pathname === '/natively-logs' && req.method === 'OPTIONS') {
      console.log('[NATIVELY-LOGS] Received OPTIONS preflight request');
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return;
    }

    // Pass through to default Metro middleware
    return middleware(req, res, next);
  };
};

module.exports = config;
