/**
 * Simple in-memory sliding-window rate limiter.
 * Works per-process — good for single-server / dev use.
 * For multi-server production, swap storage for Redis.
 */
const store = new Map<string, number[]>();

// Periodically clean up stale keys to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, timestamps] of store) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) {
      store.delete(key);
    } else {
      store.set(key, fresh);
    }
  }
}, 60_000);

/**
 * @param key       Unique identifier (IP, userId, etc.)
 * @param limit     Max requests allowed within the window
 * @param windowMs  Window duration in milliseconds
 * @returns true if the request is allowed, false if rate-limited
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    return false;
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

/** Extract client IP from a Request object (supports reverse-proxy headers). */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
