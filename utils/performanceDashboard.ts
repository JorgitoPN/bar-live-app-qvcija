
/**
 * Performance Dashboard
 * Real-time performance monitoring and statistics
 */

import { performanceManager } from './performanceManager';
import { performanceMonitor } from './performanceMonitor';
import { memoryManager } from './memoryManager';
import { advancedCache } from './advancedCache';
import { socialCache } from './socialCache';

class PerformanceDashboard {
  /**
   * Get comprehensive performance statistics
   */
  async getStats(): Promise<{
    performance: any;
    memory: any;
    cache: any;
    monitor: any;
  }> {
    const [performanceStats, cacheStats, socialCacheStats, memoryStats] = await Promise.all([
      performanceManager.getStats(),
      advancedCache.getStats(),
      Promise.resolve(socialCache.getStats()),
      Promise.resolve(memoryManager.getStats()),
    ]);

    const monitorStats = {
      metrics: performanceMonitor.getMetrics().length,
      slowest: performanceMonitor.getSlowestOperations(5),
    };

    return {
      performance: performanceStats,
      memory: memoryStats,
      cache: {
        advanced: cacheStats,
        social: socialCacheStats,
      },
      monitor: monitorStats,
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    const stats = await this.getStats();

    let report = '📊 PERFORMANCE DASHBOARD\n';
    report += '='.repeat(60) + '\n\n';

    // Performance Manager
    report += '🚀 PERFORMANCE MANAGER\n';
    report += '-'.repeat(60) + '\n';
    report += `Cache: ${stats.performance.cache.advanced.memorySize} items in memory\n`;
    report += `Optimistic UI: ${stats.performance.optimisticUI.enabled ? 'Enabled' : 'Disabled'}\n`;
    report += `Background Sync: ${stats.performance.backgroundSync.enabled ? 'Enabled' : 'Disabled'}\n`;
    report += `Request Dedup: ${stats.performance.requestDedup.enabled ? 'Enabled' : 'Disabled'}\n\n`;

    // Memory Manager
    report += '💾 MEMORY MANAGER\n';
    report += '-'.repeat(60) + '\n';
    report += `Cache Size: ${stats.memory.cacheSize}/${stats.memory.maxSize}\n`;
    report += `Usage: ${((stats.memory.cacheSize / stats.memory.maxSize) * 100).toFixed(1)}%\n\n`;

    // Cache Stats
    report += '📦 CACHE STATISTICS\n';
    report += '-'.repeat(60) + '\n';
    report += `Advanced Cache: ${stats.cache.advanced.memorySize} items\n`;
    report += `Social Cache: ${stats.cache.social.posts} posts, ${stats.cache.social.stories} stories\n`;
    report += `Has Feed: ${stats.cache.social.hasFeed ? 'Yes' : 'No'}\n\n`;

    // Performance Monitor
    report += '⏱️ PERFORMANCE MONITOR\n';
    report += '-'.repeat(60) + '\n';
    report += `Total Metrics: ${stats.monitor.metrics}\n`;
    report += `Slowest Operations:\n`;
    stats.monitor.slowest.forEach((metric: any, index: number) => {
      report += `  ${index + 1}. ${metric.name}: ${metric.duration}ms\n`;
    });

    report += '\n' + '='.repeat(60) + '\n';

    return report;
  }

  /**
   * Log performance report to console
   */
  async logReport(): Promise<void> {
    const report = await this.generateReport();
    console.log(report);
  }

  /**
   * Get performance score (0-100)
   */
  async getPerformanceScore(): Promise<number> {
    const stats = await this.getStats();

    let score = 100;

    // Deduct points for memory usage
    const memoryUsage = (stats.memory.cacheSize / stats.memory.maxSize) * 100;
    if (memoryUsage > 80) score -= 20;
    else if (memoryUsage > 60) score -= 10;

    // Deduct points for slow operations
    const slowOps = stats.monitor.slowest.filter((m: any) => m.duration > 1000);
    score -= slowOps.length * 5;

    // Deduct points for cache misses
    if (!stats.cache.social.hasFeed) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get performance grade (A-F)
   */
  async getPerformanceGrade(): Promise<string> {
    const score = await this.getPerformanceScore();

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

export const performanceDashboard = new PerformanceDashboard();
