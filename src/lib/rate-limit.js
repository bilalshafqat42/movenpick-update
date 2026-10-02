import "server-only";

/*
 * In-memory fixed-window rate limiting for the public form endpoints.
 *
 * WHY IN-MEMORY IS CORRECT HERE, having previously been wrong.
 *
 * The original limiter was Postgres-backed, and the reason was sound: on
 * Vercel the routes ran as serverless functions, where each request can
 * land on a cold instance with no memory of earlier ones and concurrent
 * requests run in separate processes sharing nothing. A Map there would
 * have looked like protection while stopping essentially nothing.
 *
 * Two things changed. This app no longer has a database at all, so a
 * database-backed limiter is not an option. And it now runs as a single
 * long-lived Node process on Render, where a Map genuinely is shared
 * across every request.
 *
 * THE ASSUMPTION THIS RESTS ON: exactly one instance. render.yaml pins
 * numInstances to 1, and that pin is load-bearing for this file as well as
 * for cache coherence. With two instances each keeps its own counters, so
 * the effective limit silently doubles. That is a soft failure rather than
 * a breach, but if the service is ever scaled out, this needs replacing
 * with a shared store rather than being left to drift.
 *
 * Counters are also lost on restart and deploy, which is acceptable: the
 * goal is stopping scripted floods and abuse, not precise quota
 * accounting.
 */
const buckets = new Map();

/*
 * Bounds memory. The Map is keyed by visitor IP, so without pruning a
 * scripted flood from rotating addresses would grow it without limit until
 * the process died — turning the abuse protection into the thing that
 * takes the site down.
 *
 * Pruning runs opportunistically on write rather than on a timer, so there
 * is no interval to leak across hot reloads in development.
 */
const MAX_TRACKED_BUCKETS = 10_000;

function pruneExpired(now) {
  for (const [key, entry] of buckets) {
    if (entry.expiresAt <= now) {
      buckets.delete(key);
    }
  }

  /*
   * If everything is somehow still live, drop the oldest half rather than
   * growing past the cap. Insertion order is preserved by Map, so the
   * oldest entries come first. Evicting a live counter can only ever let
   * a request through that would otherwise have been blocked, which is the
   * right direction to fail for a contact form.
   */
  if (buckets.size > MAX_TRACKED_BUCKETS) {
    const excess = buckets.size - Math.floor(MAX_TRACKED_BUCKETS / 2);
    let removed = 0;

    for (const key of buckets.keys()) {
      buckets.delete(key);

      if (++removed >= excess) {
        break;
      }
    }
  }
}

/*
 * Fixed windows rather than a sliding log, matching the previous
 * behaviour. The trade-off is that a burst straddling a window boundary
 * can briefly allow up to twice the limit, which is irrelevant at these
 * thresholds.
 */
export function checkRateLimit(bucket, { limit, windowMs }) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs;

  const existing = buckets.get(bucket);

  const count =
    existing && existing.windowStart === windowStart ? existing.count + 1 : 1;

  buckets.set(bucket, { windowStart, expiresAt, count });

  if (buckets.size > MAX_TRACKED_BUCKETS) {
    pruneExpired(now);
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.ceil((expiresAt - now) / 1000),
  };
}

/*
 * Best-effort client IP. Takes a Headers object so it works from a Route
 * Handler (`request.headers`) or a Server Action (`await headers()`).
 *
 * Render sets x-forwarded-for; the left-most entry is the original client.
 * Requests without one fall back to a shared bucket, which is
 * intentionally conservative — anyone able to strip the header lands in
 * the same bucket as every other header-less caller rather than getting an
 * unlimited private one.
 */
export function getClientIp(requestHeaders) {
  const forwarded = requestHeaders.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return requestHeaders.get("x-real-ip") ?? "unknown";
}

export const RATE_LIMITS = {
  /*
   * Public form spam: 8 submissions per 10 minutes per IP. Comfortably
   * above a real person filling in the form (including retries and
   * correcting a validation error), far below a scripted flood.
   */
  publicForm: { limit: 8, windowMs: 10 * 60 * 1000 },
};

/*
 * Exposed for tests only, so a spec can start from a known state instead
 * of inheriting counters from whatever ran before it.
 */
export function __resetRateLimits() {
  buckets.clear();
}
