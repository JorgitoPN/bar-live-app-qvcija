
'use strict';

/**
 * Mock limiter module for ws package compatibility in React Native/Expo
 * 
 * The ws package requires a limiter module that doesn't exist in React Native environments.
 * This mock provides a no-op implementation that allows the ws package to load without errors.
 * 
 * The limiter is used for rate limiting WebSocket connections, which is not needed
 * in the Metro bundler's WebSocket server context.
 */

class Limiter {
  constructor(concurrency) {
    this.concurrency = concurrency || Infinity;
    this.jobs = [];
    this.pending = 0;
  }

  add(job) {
    // In React Native/Expo, we don't need actual rate limiting
    // Just execute the job immediately
    if (typeof job === 'function') {
      job();
    }
  }

  remove(job) {
    // No-op: nothing to remove in our simplified implementation
  }
}

module.exports = Limiter;
