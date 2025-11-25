
/**
 * Connection Pool Manager
 * Optimize Supabase connections for maximum performance
 */

import { supabase } from './supabase';

class ConnectionPool {
  private activeConnections: number = 0;
  private maxConnections: number = 10;
  private connectionQueue: Array<() => void> = [];
  private isProcessing: boolean = false;

  /**
   * Execute query with connection pooling
   */
  async execute<T>(
    queryFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    // If we have available connections, execute immediately
    if (this.activeConnections < this.maxConnections) {
      return this.executeQuery(queryFn);
    }

    // Otherwise, queue the query
    return new Promise((resolve, reject) => {
      const queueItem = async () => {
        try {
          const result = await this.executeQuery(queryFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.connectionQueue.unshift(queueItem);
      } else {
        this.connectionQueue.push(queueItem);
      }

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Execute query and track connection
   */
  private async executeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
    this.activeConnections++;

    try {
      const result = await queryFn();
      return result;
    } finally {
      this.activeConnections--;
      this.processQueue();
    }
  }

  /**
   * Process queued queries
   */
  private processQueue(): void {
    if (this.isProcessing || this.connectionQueue.length === 0) {
      return;
    }

    if (this.activeConnections >= this.maxConnections) {
      return;
    }

    this.isProcessing = true;

    const nextQuery = this.connectionQueue.shift();
    if (nextQuery) {
      nextQuery();
    }

    this.isProcessing = false;

    // Process next item if available
    if (this.connectionQueue.length > 0 && this.activeConnections < this.maxConnections) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Batch multiple queries
   */
  async batchExecute<T>(
    queries: Array<() => Promise<T>>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T[]> {
    return Promise.all(
      queries.map(query => this.execute(query, priority))
    );
  }

  /**
   * Get connection stats
   */
  getStats(): {
    active: number;
    max: number;
    queued: number;
    utilization: number;
  } {
    return {
      active: this.activeConnections,
      max: this.maxConnections,
      queued: this.connectionQueue.length,
      utilization: (this.activeConnections / this.maxConnections) * 100,
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.connectionQueue = [];
  }
}

export const connectionPool = new ConnectionPool();
