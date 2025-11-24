
/**
 * Request Deduplicator
 * Prevents duplicate API calls for the same resource
 * Improves performance by reusing in-flight requests
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Execute a request with deduplication
   * If the same request is already in flight, return the existing promise
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      ttl?: number; // Time to live for cached result
      forceRefresh?: boolean; // Force new request even if one is pending
    } = {}
  ): Promise<T> {
    const { ttl = 0, forceRefresh = false } = options;

    // Check if request is already pending
    if (!forceRefresh && this.pendingRequests.has(key)) {
      const pending = this.pendingRequests.get(key)!;
      
      // Check if request hasn't timed out
      if (Date.now() - pending.timestamp < this.REQUEST_TIMEOUT) {
        console.log('[RequestDedup] ⚡ Reusing in-flight request:', key);
        return pending.promise;
      } else {
        // Request timed out, remove it
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    console.log('[RequestDedup] 🚀 Creating new request:', key);
    
    const promise = requestFn()
      .then(result => {
        // Keep result cached for TTL duration
        if (ttl > 0) {
          setTimeout(() => {
            this.pendingRequests.delete(key);
          }, ttl);
        } else {
          this.pendingRequests.delete(key);
        }
        return result;
      })
      .catch(error => {
        // Remove failed request immediately
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear a specific request from cache
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
    console.log('[RequestDedup] 🗑️ Cleared request:', key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
    console.log('[RequestDedup] 🗑️ All requests cleared');
  }

  /**
   * Get statistics
   */
  getStats(): {
    pendingCount: number;
    oldestRequest: number | null;
  } {
    let oldestTimestamp: number | null = null;

    this.pendingRequests.forEach(req => {
      if (oldestTimestamp === null || req.timestamp < oldestTimestamp) {
        oldestTimestamp = req.timestamp;
      }
    });

    return {
      pendingCount: this.pendingRequests.size,
      oldestRequest: oldestTimestamp,
    };
  }

  /**
   * Clean up timed out requests
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.pendingRequests.forEach((req, key) => {
      if (now - req.timestamp > this.REQUEST_TIMEOUT) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.pendingRequests.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log('[RequestDedup] 🧹 Cleaned up', keysToDelete.length, 'timed out requests');
    }
  }
}

// Export singleton instance
export const requestDeduplicator = new RequestDeduplicator();

// Auto cleanup every minute
setInterval(() => {
  requestDeduplicator.cleanup();
}, 60000);
