const rateLimit = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimit.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1 };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count };
}

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimit.forEach((entry, key) => {
      if (now > entry.resetTime) {
        rateLimit.delete(key);
      }
    });
  }, 60_000);
}

export const RATE_LIMITS = {
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  CHAT: { windowMs: 60 * 1000, maxRequests: 20 },
  PADDLE: { windowMs: 60 * 1000, maxRequests: 10 },
  GENERAL: { windowMs: 60 * 1000, maxRequests: 60 },
} as const;
