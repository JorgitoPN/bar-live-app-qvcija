// Global error logging for runtime errors
// Simplified version to prevent initialization issues

import { Platform } from "react-native";

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Simple error tracking to prevent spam
const recentErrors: { [key: string]: boolean } = {};

// Helper to safely stringify arguments
const stringifyArgs = (args: any[]): string => {
  try {
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
  } catch (e) {
    return 'Error stringifying arguments';
  }
};

export const setupErrorLogging = () => {
  try {
    // Log initialization
    originalConsoleLog('[Natively] Setting up error logging...');
    originalConsoleLog('[Natively] Platform:', Platform.OS);

    // Override console.error to capture critical errors
    console.error = (...args: any[]) => {
      // Always call original first
      originalConsoleError.apply(console, args);

      // Track error to prevent spam
      const errorKey = stringifyArgs(args);
      if (!recentErrors[errorKey]) {
        recentErrors[errorKey] = true;
        setTimeout(() => delete recentErrors[errorKey], 1000);
      }
    };

    // Capture unhandled errors in web environment
    if (typeof window !== 'undefined') {
      window.onerror = (message, source, lineno, colno, error) => {
        const sourceFile = source ? source.split('/').pop() : 'unknown';
        originalConsoleError(`RUNTIME ERROR: ${message} at ${sourceFile}:${lineno}:${colno}`);
        return false;
      };

      // Capture unhandled promise rejections
      if (Platform.OS === 'web') {
        window.addEventListener('unhandledrejection', (event) => {
          originalConsoleError(`UNHANDLED PROMISE REJECTION:`, event.reason);
        });
      }
    }

    originalConsoleLog('[Natively] Error logging initialized successfully');
  } catch (error) {
    originalConsoleError('[Natively] Failed to setup error logging:', error);
  }
};

// Auto-initialize logging when this module is imported
setupErrorLogging();
