
/**
 * Render Optimizer Utility v342.0 - INSTANT UI RENDERING
 * ✅ NEW: Aggressive render optimization for Android
 * 
 * FEATURES:
 * - Memoization helpers for expensive components
 * - Render batching for list items
 * - Lazy component loading
 * - Virtual scrolling optimization
 */

import React from 'react';
import { Platform } from 'react-native';

/**
 * ✅ Memoize component with custom comparison
 */
export function memoizeComponent<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, propsAreEqual);
}

/**
 * ✅ Shallow comparison for props
 */
export function shallowEqual(objA: any, objB: any): boolean {
  if (objA === objB) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // ✅ v342.0: FIX - Use Object.prototype.hasOwnProperty.call instead of direct access
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key) ||
        objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
}

/**
 * ✅ Batch render updates
 */
export function useBatchedRender<T>(
  items: T[],
  batchSize: number = Platform.OS === 'android' ? 5 : 10
): T[] {
  const [displayedItems, setDisplayedItems] = React.useState<T[]>([]);
  const [currentBatch, setCurrentBatch] = React.useState(0);

  React.useEffect(() => {
    setDisplayedItems([]);
    setCurrentBatch(0);
  }, [items]);

  React.useEffect(() => {
    if (currentBatch * batchSize >= items.length) {
      return;
    }

    const timer = requestAnimationFrame(() => {
      const nextBatch = items.slice(0, (currentBatch + 1) * batchSize);
      setDisplayedItems(nextBatch);
      setCurrentBatch(prev => prev + 1);
    });

    return () => cancelAnimationFrame(timer);
  }, [items, currentBatch, batchSize]);

  return displayedItems;
}

/**
 * ✅ Lazy load component
 */
export function useLazyComponent<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  delay: number = 0
): T | null {
  const [Component, setComponent] = React.useState<T | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      factory().then(module => {
        setComponent(() => module.default);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [factory, delay]);

  return Component;
}

/**
 * ✅ Optimize FlatList rendering
 */
export const flatListOptimizationProps = Platform.OS === 'android' ? {
  initialNumToRender: 5,
  maxToRenderPerBatch: 5,
  windowSize: 3,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 100,
  getItemLayout: (data: any, index: number) => ({
    length: 200, // Approximate item height
    offset: 200 * index,
    index,
  }),
} : {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 5,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 50,
};

/**
 * ✅ Debounce hook for expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * ✅ Throttle hook for frequent updates
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// ✅ LINT FIX: Export renderOptimizer object for performanceManager
export const renderOptimizer = {
  clear: () => {
    // Placeholder for clearing render optimizer state
    console.log('[RenderOptimizer] Cleared');
  },
};
