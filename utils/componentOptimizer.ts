
import React from 'react';

// ✅ FIXED: Changed Array<T> to T[]
export function deepCompare<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keys?: (keyof T)[]
): boolean {
  const keysToCompare = keys || (Object.keys(prevProps) as (keyof T)[]);

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
        prevProps[key] !== null &&
        typeof nextProps[key] === 'object' &&
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
 * Create optimized memo component
 */
export function createOptimizedMemo<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  compareKeys?: (keyof P)[]
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, (prevProps, nextProps) => {
    return deepCompare(prevProps, nextProps, compareKeys);
  });
}

/**
 * Shallow compare for simple props
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
 * Create shallow memo component
 */
export function createShallowMemo<P extends Record<string, any>>(
  Component: React.ComponentType<P>
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, shallowCompare);
}

/**
 * Optimize list rendering
 */
export function optimizeListItem<T>(
  item: T,
  index: number,
  getKey: (item: T, index: number) => string
): { key: string; item: T; index: number } {
  return {
    key: getKey(item, index),
    item,
    index,
  };
}

/**
 * Batch updates to reduce re-renders
 */
export function batchUpdates(updates: (() => void)[]): void {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}
