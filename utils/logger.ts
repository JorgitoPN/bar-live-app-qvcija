
/**
 * Conditional Logger
 * Only logs critical errors to prevent console spam
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
    // Only log errors in development or when explicitly enabled
    if (this.enabled || isDevelopment) {
      console.error(...args);
    }
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
