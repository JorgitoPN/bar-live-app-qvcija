
import { useRef, useCallback } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

const scrollPositions = new Map<string, ScrollPosition>();

export function useScrollPosition(key: string) {
  const scrollViewRef = useRef<any>(null);

  const saveScrollPosition = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    scrollPositions.set(key, {
      x: contentOffset.x,
      y: contentOffset.y,
    });
  }, [key]);

  const restoreScrollPosition = useCallback(() => {
    const position = scrollPositions.get(key);
    if (position && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: position.x,
          y: position.y,
          animated: false,
        });
      }, 50); // Strategic 50ms delay
    }
  }, [key]);

  const clearScrollPosition = useCallback(() => {
    scrollPositions.delete(key);
  }, [key]);

  return {
    scrollViewRef,
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
  };
}
