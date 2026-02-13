
/**
 * Performance Monitor Utility v338.0
 * Helps identify performance bottlenecks and slow operations
 * 
 * ✅ NEW v338.0: Navigation performance tracking
 * - Track screen transition times
 * - Identify slow navigations
 * - Optimize navigation flow
 */

import React from 'react';
import { Platform, InteractionManager } from 'react-native';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private maxMetrics: number = 100;
  private enabled: boolean = __DEV__; // Only enable in development

  /**
   * Start timing an operation
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    this.timers.set(name, Date.now());
    console.log(`⏱️ [Performance] Started: ${name}`, metadata || '');
  }

  /**
   * End timing an operation and log the result
   */
  end(name: string, metadata?: Record<string, any>): number {
    if (!this.enabled) return 0;
    
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`⚠️ [Performance] No start time found for: ${name}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    // Add to metrics array
    this.metrics.push(metric);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log with color coding based on duration
    const emoji = duration < 100 ? '✅' : duration < 500 ? '⚠️' : '🔴';
    console.log(
      `${emoji} [Performance] ${name}: ${duration}ms`,
      metadata || ''
    );

    // Warn if operation is slow
    if (duration > 1000) {
      console.warn(
        `🐌 [Performance] SLOW OPERATION: ${name} took ${duration}ms`,
        metadata || ''
      );
    }

    return duration;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await operation();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    this.start(name, metadata);
    try {
      const result = operation();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get average duration for a metric
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No performance metrics collected';
    }

    const slowest = this.getSlowestOperations(5);
    const uniqueOperations = new Set(this.metrics.map(m => m.name));

    let report = '📊 Performance Report\n';
    report += '='.repeat(50) + '\n\n';
    report += `Total operations tracked: ${this.metrics.length}\n`;
    report += `Unique operations: ${uniqueOperations.size}\n\n`;
    report += 'Slowest Operations:\n';
    report += '-'.repeat(50) + '\n';

    slowest.forEach((metric, index) => {
      report += `${index + 1}. ${metric.name}: ${metric.duration}ms\n`;
      if (metric.metadata) {
        report += `   Metadata: ${JSON.stringify(metric.metadata)}\n`;
      }
    });

    report += '\nAverage Durations:\n';
    report += '-'.repeat(50) + '\n';

    uniqueOperations.forEach(name => {
      const avg = this.getAverageDuration(name);
      report += `${name}: ${avg.toFixed(2)}ms\n`;
    });

    return report;
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    console.log(this.generateReport());
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * ✅ NEW v338.0: Navigation Performance Optimizer
 * Ensures instant navigation by deferring heavy operations
 */
export class NavigationOptimizer {
  private static instance: NavigationOptimizer;
  private navigationStartTime: number = 0;
  private enabled: boolean = Platform.OS === 'android'; // Only optimize on Android

  static getInstance(): NavigationOptimizer {
    if (!NavigationOptimizer.instance) {
      NavigationOptimizer.instance = new NavigationOptimizer();
    }
    return NavigationOptimizer.instance;
  }

  /**
   * Call this before navigation to mark the start
   */
  startNavigation(screenName: string): void {
    if (!this.enabled) return;
    
    this.navigationStartTime = Date.now();
    console.log(`🚀 [Navigation v338.0] Starting navigation to: ${screenName}`);
  }

  /**
   * Call this after screen renders to measure navigation time
   */
  endNavigation(screenName: string): void {
    if (!this.enabled || this.navigationStartTime === 0) return;
    
    const duration = Date.now() - this.navigationStartTime;
    const emoji = duration < 100 ? '✅' : duration < 300 ? '⚠️' : '🔴';
    
    console.log(
      `${emoji} [Navigation v338.0] ${screenName} loaded in ${duration}ms`
    );
    
    if (duration > 500) {
      console.warn(
        `🐌 [Navigation v338.0] SLOW NAVIGATION: ${screenName} took ${duration}ms`
      );
    }
    
    this.navigationStartTime = 0;
  }

  /**
   * Defer heavy operations until after navigation completes
   * This ensures instant screen transitions
   */
  deferUntilIdle(operation: () => void | Promise<void>): void {
    if (!this.enabled) {
      // On iOS, execute immediately
      operation();
      return;
    }

    // On Android, defer until interactions complete
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        operation();
      }, 0);
    });
  }

  /**
   * Defer data loading until screen is visible
   * Returns immediately to avoid blocking navigation
   */
  deferDataLoading(loadFunction: () => Promise<void>): void {
    if (!this.enabled) {
      // On iOS, load immediately
      loadFunction();
      return;
    }

    // On Android, defer until after screen renders
    setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        loadFunction();
      });
    }, 0);
  }
}

export const navigationOptimizer = NavigationOptimizer.getInstance();

/**
 * ✅ NEW v338.0: Hook for optimizing screen performance
 * Use this in screens to ensure instant loading
 */
export function useScreenPerformance(screenName: string) {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    navigationOptimizer.startNavigation(screenName);
    
    // Mark screen as ready immediately
    setIsReady(true);
    
    // End navigation tracking after a short delay
    const timer = setTimeout(() => {
      navigationOptimizer.endNavigation(screenName);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [screenName]);

  /**
   * Defer heavy operations until after screen renders
   */
  const deferOperation = React.useCallback((operation: () => void | Promise<void>) => {
    navigationOptimizer.deferUntilIdle(operation);
  }, []);

  /**
   * Defer data loading until screen is visible
   */
  const deferDataLoading = React.useCallback((loadFunction: () => Promise<void>) => {
    navigationOptimizer.deferDataLoading(loadFunction);
  }, []);

  return {
    isReady,
    deferOperation,
    deferDataLoading,
  };
}

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Hook for measuring React component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());

  React.useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (renderCount.current > 1) {
      console.log(
        `🔄 [Render] ${componentName} rendered ${renderCount.current} times. Time since last render: ${timeSinceLastRender}ms`
      );
    }
  });

  return {
    renderCount: renderCount.current,
  };
}
