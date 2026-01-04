const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    const error: any = new Error('Too Many Requests');
    error.status = 429;
    error.retryAfter = retryAfterSeconds;
    throw error;
  }

  bucket.count += 1;
}
