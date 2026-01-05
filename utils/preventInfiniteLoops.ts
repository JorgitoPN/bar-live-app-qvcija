
import { useRef, useEffect, DependencyList, useCallback, useState } from 'react';

/**
 * Hook to prevent infinite loops by tracking render count
 */
export function useRenderCount(componentName: string, maxRenders: number = 50) {
  const renderCount = useRef(0);
  const resetTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    renderCount.current += 1;

    if (renderCount.current > maxRenders) {
      console.error(
        `⚠️ ${componentName}: Exceeded ${maxRenders} renders. Possible infinite loop detected!`
      );
    }

    // Reset counter after 1 second of no renders
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => {
      renderCount.current = 0;
    }, 1000);

    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  });
}

/**
 * Safe useEffect that prevents infinite loops
 */
export function useSafeEffect(
  effect: () => void | (() => void),
  deps: DependencyList,
  componentName: string
) {
  const executionCount = useRef(0);
  const lastExecutionTime = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime.current;

    // Reset counter if enough time has passed
    if (timeSinceLastExecution > 1000) {
      executionCount.current = 0;
    }

    executionCount.current += 1;

    if (executionCount.current > 10) {
      console.error(
        `⚠️ ${componentName}: useEffect executed ${executionCount.current} times in ${timeSinceLastExecution}ms. Possible infinite loop!`
      );
      return;
    }

    lastExecutionTime.current = now;
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Debounced state setter to prevent rapid updates
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSetValue = useCallback((newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, debouncedSetValue];
}

/**
 * Prevents concurrent execution of async functions
 */
export function useAsyncLock() {
  const lockRef = useRef(false);

  const withLock = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    if (lockRef.current) {
      console.warn('⚠️ Function already executing, skipping...');
      return null;
    }

    lockRef.current = true;
    try {
      return await fn();
    } finally {
      lockRef.current = false;
    }
  }, []);

  return withLock;
}
