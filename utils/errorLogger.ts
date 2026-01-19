
// Global error logging for runtime errors
// Simplified version that won't block app startup

// Declare __DEV__ global (React Native global for development mode detection)
declare const __DEV__: boolean;

import { Platform } from "react-native";

// Simple debouncing to prevent duplicate logs
const recentLogs: { [key: string]: boolean } = {};
const clearLogAfterDelay = (logKey: string) => {
  setTimeout(() => delete recentLogs[logKey], 100);
};

// Messages to mute (noisy warnings that don't help debugging)
const MUTED_MESSAGES = [
  'each child in a list should have a unique "key" prop',
  'Each child in a list should have a unique "key" prop',
];

// Check if a message should be muted
const shouldMuteMessage = (message: string): boolean => {
  return MUTED_MESSAGES.some(muted => message.includes(muted));
};

// Get a friendly platform name
const getPlatformName = (): string => {
  switch (Platform.OS) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    default:
      return Platform.OS;
  }
};

// Function to get caller information from stack trace
const getCallerInfo = (): string => {
  try {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');

    // Skip the first few lines (Error, getCallerInfo, stringifyArgs, console override, setupErrorLogging internals)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];

      // Skip internal errorLogger calls and node_modules
      if (line.includes('errorLogger') || line.includes('node_modules')) {
        continue;
      }

      // Try multiple patterns to extract source location
      // Pattern 1: Standard format "at Component (file.tsx:10:5)"
      let match = line.match(/at\s+\S+\s+\((?:.*\/)?([^/\s:)]+\.[jt]sx?):(\d+):(\d+)\)/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }

      // Pattern 2: Anonymous function "at file.tsx:10:5"
      match = line.match(/at\s+(?:.*\/)?([^/\s:)]+\.[jt]sx?):(\d+):(\d+)/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }

      // Pattern 3: Hermes/React Native bundle format
      match = line.match(/(?:.*\/)?([^/\s:)]+\.[jt]sx?):(\d+):\d+/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }

      // Pattern 4: Look for app/ or components/ paths specifically
      if (line.includes('app/') || line.includes('components/') || line.includes('screens/') || line.includes('hooks/') || line.includes('utils/')) {
        match = line.match(/([^/\s:)]+\.[jt]sx?):(\d+)/);
        if (match) {
          return `${match[1]}:${match[2]}`;
        }
      }
    }
  } catch (e) {
    // Silently fail
  }

  return '';
};

// Helper to safely stringify arguments
const stringifyArgs = (args: any[]): string => {
  return args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');
};

// Simplified logging that just enhances console output with source info
export const setupErrorLogging = () => {
  // Don't initialize in production builds
  if (!__DEV__) {
    return;
  }

  try {
    // Store original console methods BEFORE any modifications
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    // Log initialization info using original console (not intercepted)
    originalConsoleLog('[Natively] Error logging initialized for', getPlatformName());

    // Override console.log to add source info
    console.log = (...args: any[]) => {
      const source = getCallerInfo();
      if (source) {
        originalConsoleLog.apply(console, [`[${source}]`, ...args]);
      } else {
        originalConsoleLog.apply(console, args);
      }
    };

    // Override console.warn to add source info
    console.warn = (...args: any[]) => {
      const message = stringifyArgs(args);
      if (shouldMuteMessage(message)) return;

      const source = getCallerInfo();
      if (source) {
        originalConsoleWarn.apply(console, [`[${source}]`, ...args]);
      } else {
        originalConsoleWarn.apply(console, args);
      }
    };

    // Override console.error to add source info
    console.error = (...args: any[]) => {
      const message = stringifyArgs(args);
      if (shouldMuteMessage(message)) return;

      const source = getCallerInfo();
      if (source) {
        originalConsoleError.apply(console, [`[${source}]`, ...args]);
      } else {
        originalConsoleError.apply(console, args);
      }
    };

    // Capture unhandled errors in web environment
    if (typeof window !== 'undefined') {
      // Override window.onerror to catch JavaScript errors
      window.onerror = (message, source, lineno, colno, error) => {
        const sourceFile = source ? source.split('/').pop() : 'unknown';
        originalConsoleError(`[${sourceFile}:${lineno}:${colno}] RUNTIME ERROR:`, message);
        return false; // Don't prevent default error handling
      };

      // Capture unhandled promise rejections (web only)
      if (Platform.OS === 'web') {
        window.addEventListener('unhandledrejection', (event) => {
          originalConsoleError('[Promise] UNHANDLED REJECTION:', event.reason);
        });
      }
    }
  } catch (error) {
    // If setup fails, silently continue - don't block app startup
    console.error('[Natively] Failed to setup error logging:', error);
  }
};

// Auto-initialize logging when this module is imported
// Only run in development mode
if (__DEV__) {
  setupErrorLogging();
}
