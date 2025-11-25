
import { supabase } from './supabase';

interface Connection {
  id: string;
  inUse: boolean;
  lastUsed: number;
}

class ConnectionPool {
  private connections: Connection[] = [];
  // ✅ FIXED: Changed Array<T> to T[]
  private connectionQueue: (() => void)[] = [];
  private readonly MAX_CONNECTIONS = 10;
  private readonly CONNECTION_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.MAX_CONNECTIONS; i++) {
      this.connections.push({
        id: `conn_${i}`,
        inUse: false,
        lastUsed: Date.now(),
      });
    }
  }

  async execute<T>(
    query: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const connection = await this.acquireConnection(priority);
    
    try {
      const result = await query();
      return result;
    } finally {
      this.releaseConnection(connection);
    }
  }

  private async acquireConnection(priority: 'high' | 'medium' | 'low'): Promise<Connection> {
    const availableConnection = this.connections.find(conn => !conn.inUse);
    
    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = Date.now();
      return availableConnection;
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const callback = () => {
        const conn = this.connections.find(c => !c.inUse);
        if (conn) {
          conn.inUse = true;
          conn.lastUsed = Date.now();
          resolve(conn);
        }
      };

      if (priority === 'high') {
        this.connectionQueue.unshift(callback);
      } else {
        this.connectionQueue.push(callback);
      }
    });
  }

  private releaseConnection(connection: Connection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();

    // Process next queued request
    const nextCallback = this.connectionQueue.shift();
    if (nextCallback) {
      nextCallback();
    }
  }

  // ✅ FIXED: Changed Array<T> to T[]
  async batchExecute<T>(
    queries: (() => Promise<T>)[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T[]> {
    return Promise.all(
      queries.map(query => this.execute(query, priority))
    );
  }

  getStats(): {
    total: number;
    inUse: number;
    available: number;
    queueSize: number;
  } {
    return {
      total: this.connections.length,
      inUse: this.connections.filter(c => c.inUse).length,
      available: this.connections.filter(c => !c.inUse).length,
      queueSize: this.connectionQueue.length,
    };
  }

  cleanup(): void {
    const now = Date.now();
    this.connections.forEach(conn => {
      if (!conn.inUse && now - conn.lastUsed > this.CONNECTION_TIMEOUT) {
        conn.lastUsed = now;
      }
    });
  }
}

export const connectionPool = new ConnectionPool();
