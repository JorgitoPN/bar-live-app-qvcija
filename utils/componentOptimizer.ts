
/**
 * Component Optimizer
 * Utilities for optimizing React component performance
 */

import React from 'react';

/**
 * Deep comparison for React.memo
 */
export function deepCompare<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keys?: Array<keyof T>
): boolean {
  const keysToCompare = keys || (Object.keys(prevProps) as Array<keyof T>);

  for (const key of keysToCompare) {
    if (prevProps[key] !== nextProps[key]) {
      // Special handling for arrays
      if (Array.isArray(prevProps[key]) && Array.isArray(nextProps[key])) {
        const prevArray = prevProps[key] as any[];
        const nextArray = nextProps[key] as any[];
        
        if (prevArray.length !== nextArray.length) {
          return false;
        }
        
        // Compare array items
        for (let i = 0; i < prevArray.length; i++) {
          if (prevArray[i] !== nextArray[i]) {
            return false;
          }
        }
        
        continue;
      }

      // Special handling for objects
      if (
        typeof prevProps[key] === 'object' &&
        typeof nextProps[key] === 'object' &&
        prevProps[key] !== null &&
        nextProps[key] !== null
      ) {
        const prevObj = prevProps[key] as Record<string, any>;
        const nextObj = nextProps[key] as Record<string, any>;
        
        const prevKeys = Object.keys(prevObj);
        const nextKeys = Object.keys(nextObj);
        
        if (prevKeys.length !== nextKeys.length) {
          return false;
        }
        
        for (const objKey of prevKeys) {
          if (prevObj[objKey] !== nextObj[objKey]) {
            return false;
          }
        }
        
        continue;
      }

      return false;
    }
  }

  return true;
}

/**
 * Shallow comparison for React.memo
 */
export function shallowCompare<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T
): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Create optimized memo component
 */
export function createOptimizedMemo<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  compareKeys?: Array<keyof P>
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, (prevProps, nextProps) => {
    return deepCompare(prevProps, nextProps, compareKeys);
  });
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function for frequent operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    
    return lastResult;
  };
}

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }) as T;
}
