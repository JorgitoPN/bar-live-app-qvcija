
/**
 * Performance Monitor Utility
 * Helps identify performance bottlenecks and slow operations
 */

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

// Import React for the hook
import React from 'react';
