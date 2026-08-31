import crypto from "crypto";

type Bucket = { count: number; resetAt: number };

// Best-effort per-instance protection. The database-backed phone limits remain
// authoritative, while this adds a fast shield against one client hammering
// public auth endpoints. A distributed limiter can replace this in deployment.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function keyFor(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const real = req.headers.get("x-real-ip");
  const ip = (forwarded?.split(",")[0]?.trim() || real?.trim() || "unknown").slice(0, 128);
  const secret = process.env.DATA_HASH_SECRET || "development-only-rate-limit-secret";
  return crypto.createHmac("sha256", secret).update(`ip:${ip}`).digest("hex");
}

export function consumeIpRateLimit(req: Request, name: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${name}:${keyFor(req)}`;
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(k);
        if (buckets.size < MAX_BUCKETS) break;
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) };
  }
  if (existing.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { allowed: true, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
}
