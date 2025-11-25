
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
      if (Array.isArray(prevProps[key]) && Array.isArray(nextProps[key])) {
        const prevArray = prevProps[key] as any[];
        const nextArray = nextProps[key] as any[];
        
        if (prevArray.length !== nextArray.length) {
          return false;
        }
        
        for (let i = 0; i < prevArray.length; i++) {
          if (prevArray[i] !== nextArray[i]) {
            return false;
          }
        }
        
        continue;
      }

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

// ✅ FIXED: Changed Array<T> to T[]
export function createOptimizedMemo<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  compareKeys?: (keyof P)[]
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, (prevProps, nextProps) => {
    return deepCompare(prevProps, nextProps, compareKeys);
  });
}

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

export function createShallowMemo<P extends Record<string, any>>(
  Component: React.ComponentType<P>
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, shallowCompare);
}

export function arrayCompare<T>(prevArray: T[], nextArray: T[]): boolean {
  if (prevArray.length !== nextArray.length) {
    return false;
  }

  for (let i = 0; i < prevArray.length; i++) {
    if (prevArray[i] !== nextArray[i]) {
      return false;
    }
  }

  return true;
}

export function createArrayMemo<P extends { items: any[] }>(
  Component: React.ComponentType<P>
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, (prevProps, nextProps) => {
    return arrayCompare(prevProps.items, nextProps.items);
  });
}
