
/**
 * Conditional Logger
 * Only logs in development mode to prevent console spam in production/Expo Go
 */

const isDevelopment = __DEV__;
const ENABLE_LOGGING = false; // Set to true only when debugging

class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = isDevelopment && ENABLE_LOGGING;
  }

  log(...args: any[]) {
    if (this.enabled) {
      console.log(...args);
    }
  }

  info(...args: any[]) {
    if (this.enabled) {
      console.info(...args);
    }
  }

  warn(...args: any[]) {
    if (this.enabled) {
      console.warn(...args);
    }
  }

  error(...args: any[]) {
    // Always log errors
    console.error(...args);
  }

  debug(...args: any[]) {
    if (this.enabled) {
      console.debug(...args);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled && isDevelopment;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const logger = new Logger();
