import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Sliding Window In-Memory Rate Limiter Middleware
 * Protects against Brute-Force, Credential Stuffing & DoS Attacks
 */
export const createRateLimiter = (options: {
  windowMs: number; // e.g. 15 minutes = 15 * 60 * 1000
  maxRequests: number; // max hits per window
  message?: string;
}) => {
  const store: RateLimitStore = {};

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', options.maxRequests - 1);
      return next();
    }

    store[ip].count += 1;
    const remaining = Math.max(0, options.maxRequests - store[ip].count);
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (store[ip].count > options.maxRequests) {
      res.status(429).json({
        success: false,
        statusCode: 429,
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfterSeconds: Math.ceil((store[ip].resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
};

// Common pre-configured limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30, // 30 auth requests per 15 mins
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120, // 120 requests per minute
  message: 'API rate limit exceeded. Please throttle requests.',
});

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20, // 20 AI copilot requests per minute
  message: 'AI Copilot usage quota reached for this minute. Please wait a moment.',
});
