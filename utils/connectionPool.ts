
// ✅ FIXED: Changed Array<T> to T[]
class ConnectionPool {
  private activeConnections: number = 0;
  private maxConnections: number = 10;
  private connectionQueue: (() => void)[] = [];
  private isProcessing: boolean = false;

  /**
   * Execute a query with connection pooling
   */
  async execute<T>(
    query: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    // If we have available connections, execute immediately
    if (this.activeConnections < this.maxConnections) {
      return this.executeQuery(query);
    }

    // Otherwise, queue the query
    return new Promise((resolve, reject) => {
      const queuedQuery = async () => {
        try {
          const result = await this.executeQuery(query);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.connectionQueue.unshift(queuedQuery);
      } else {
        this.connectionQueue.push(queuedQuery);
      }

      // Start processing queue
      this.processQueue();
    });
  }

  /**
   * Execute a query and manage connection count
   */
  private async executeQuery<T>(query: () => Promise<T>): Promise<T> {
    this.activeConnections++;
    console.log('[ConnectionPool] Active connections:', this.activeConnections);

    try {
      const result = await query();
      return result;
    } finally {
      this.activeConnections--;
      console.log('[ConnectionPool] Active connections:', this.activeConnections);
      
      // Process next query in queue
      this.processQueue();
    }
  }

  /**
   * Process the connection queue
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
  }

  /**
   * Batch multiple queries
   */
  async batchExecute<T>(
    queries: (() => Promise<T>)[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T[]> {
    return Promise.all(
      queries.map(query => this.execute(query, priority))
    );
  }

  /**
   * Get pool status
   */
  getStatus(): { active: number; queued: number; available: number } {
    return {
      active: this.activeConnections,
      queued: this.connectionQueue.length,
      available: this.maxConnections - this.activeConnections,
    };
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.connectionQueue = [];
    console.log('[ConnectionPool] Queue cleared');
  }
}

export const connectionPool = new ConnectionPool();
