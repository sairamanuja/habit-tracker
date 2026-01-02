import { LRUCache } from "lru-cache";

const cache = new LRUCache({ max: 10_000 });

function getIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function rateLimit(request, { keyPrefix, limit, windowMs }) {
  const ip = getIp(request);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();

  const hit = cache.get(key);
  if (!hit || now > hit.resetAt) {
    cache.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (hit.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: hit.resetAt - now };
  }

  hit.count += 1;
  cache.set(key, hit);
  return { ok: true, remaining: limit - hit.count };
}
