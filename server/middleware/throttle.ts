// server/middleware/throttle.ts
/**
 * Simple in-memory rate limiting middleware for chat requests
 * 
 * Rate Limiting Logic:
 * - Tracks requests per user/session over a rolling time window
 * - Default: 10 requests per 60 seconds per session
 * - Uses sessionId from request body, falls back to IP address
 * - Automatically cleans up old entries to prevent memory leaks
 * 
 * Usage:
 * - Apply to chat endpoints before processing
 * - Returns 429 status with friendly message when limit exceeded
 * - Logs throttling events for monitoring
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message: string;
}

class InMemoryRateLimit {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private config: RateLimitConfig = {
      maxRequests: 10, // requests per window
      windowMs: 60 * 1000, // 60 seconds
      message: "I'm getting too many requests right now. Please try again in a moment!"
    }
  ) {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request should be allowed
   * @param identifier - unique identifier (sessionId or IP)
   * @returns object with allowed status and remaining requests
   */
  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now >= entry.resetTime) {
      // First request or window expired - create new entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
        lastRequest: now
      };
      this.store.set(identifier, newEntry);
      
      console.log(`[THROTTLE] New session started: ${identifier} (1/${this.config.maxRequests})`);
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Update existing entry
    entry.count++;
    entry.lastRequest = now;
    this.store.set(identifier, entry);

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    if (!allowed) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000);
      console.log(`[THROTTLE] Rate limit exceeded for ${identifier}: ${entry.count}/${this.config.maxRequests} (resets in ${resetIn}s)`);
    } else {
      console.log(`[THROTTLE] Request allowed for ${identifier}: ${entry.count}/${this.config.maxRequests}`);
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get current usage for a session (for monitoring)
   */
  getUsage(identifier: string): { current: number; limit: number; resetTime: number } | null {
    const entry = this.store.get(identifier);
    if (!entry || Date.now() >= entry.resetTime) {
      return null;
    }
    
    return {
      current: entry.count,
      limit: this.config.maxRequests,
      resetTime: entry.resetTime
    };
  }

  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [identifier, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(identifier);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[THROTTLE] Cleaned up ${cleaned} expired entries. Active sessions: ${this.store.size}`);
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): { activeSessions: number; totalRequests: number } {
    let totalRequests = 0;
    for (const entry of this.store.values()) {
      totalRequests += entry.count;
    }
    
    return {
      activeSessions: this.store.size,
      totalRequests
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Create global instance
const rateLimiter = new InMemoryRateLimit();

/**
 * Express middleware for rate limiting chat requests
 */
export function chatRateLimit(req: any, res: any, next: any): void {
  try {
    // Get identifier from sessionId in body or fall back to IP
    const sessionId = req.body?.sessionId;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const identifier = sessionId || ip;

    const result = rateLimiter.checkLimit(identifier);

    if (!result.allowed) {
      const resetIn = Math.ceil((result.resetTime - Date.now()) / 1000);
      
      return res.status(429).json({
        error: "I'm getting too many requests right now. Please try again in a moment!",
        success: false,
        rateLimit: {
          limit: 10,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: resetIn
        }
      });
    }

    // Add rate limit info to response headers for debugging
    res.set({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString()
    });

    next();
  } catch (error) {
    console.error('[THROTTLE] Error in rate limiting:', error);
    // On error, allow request to proceed (fail open)
    next();
  }
}

// Export rate limiter instance for monitoring
export { rateLimiter };

// Graceful shutdown
process.on('SIGTERM', () => {
  rateLimiter.destroy();
});

process.on('SIGINT', () => {
  rateLimiter.destroy();
});
