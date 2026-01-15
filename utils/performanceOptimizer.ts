
/**
 * ✅ PERFORMANCE OPTIMIZER v1.0 - INSTANT TOUCH RESPONSE
 * 
 * Utilities to ensure instant feedback on all user interactions
 */

import { InteractionManager } from 'react-native';

/**
 * Execute a function after interactions are complete
 * This ensures UI remains responsive during heavy operations
 */
export const runAfterInteractions = (callback: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
};

/**
 * Debounce function to prevent multiple rapid calls
 * Use this for search inputs, not for button presses
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * Throttle function to limit execution rate
 * Use this for scroll events, not for button presses
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Optimize TouchableOpacity props for instant feedback
 */
export const getOptimizedTouchableProps = () => ({
  activeOpacity: 0.6, // ✅ Instant visual feedback
  delayPressIn: 0, // ✅ No delay on press
  delayPressOut: 0, // ✅ No delay on release
  delayLongPress: 500, // Standard long press delay
});

/**
 * Log performance metrics
 */
export const logPerformance = (label: string, startTime: number) => {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  if (duration > 100) {
    console.warn(`[Performance] ⚠️ ${label} took ${duration}ms (should be < 100ms)`);
  } else {
    console.log(`[Performance] ✅ ${label} took ${duration}ms`);
  }
};

/**
 * Measure function execution time
 */
export const measurePerformance = async <T>(
  label: string,
  func: () => Promise<T> | T
): Promise<T> => {
  const startTime = Date.now();
  const result = await func();
  logPerformance(label, startTime);
  return result;
};
