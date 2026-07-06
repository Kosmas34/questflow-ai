// Lightweight in-memory rate limiter (sliding window).
//
// Scope & honesty note: this protects each running server instance.
// On a single Vercel/Node deployment it is effective protection against
// abuse and AI-credit burning. If you later scale to many serverless
// instances and need *global* limits, swap `checkLimit` internals for
// Upstash Redis / Vercel KV — the call sites won't change.

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Periodic cleanup so the Map doesn't grow forever.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60 * 60 * 1000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Sliding-window check. Returns true if the call is ALLOWED.
 * @param key    unique bucket, e.g. "chat:ip:1.2.3.4"
 * @param limit  max events per window
 * @param windowMs window length in ms
 */
export function checkLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  cleanup(now);

  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    store.set(key, entry);
    return false;
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return true;
}

/** Extracts the client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// ---- Limits for the guest endpoints (tune freely) ----
export const LIMITS = {
  // /api/guest/chat
  chatPerIp: { limit: 20, windowMs: 5 * 60 * 1000 }, // 20 msgs / 5 min / IP
  chatPerSession: { limit: 40, windowMs: 60 * 60 * 1000 }, // 40 msgs / hour / session
  chatPerProperty: { limit: 300, windowMs: 60 * 60 * 1000 }, // 300 msgs / hour / property
  // /api/guest/session
  sessionPerIp: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 new sessions / hour / IP
  sessionPerProperty: { limit: 200, windowMs: 60 * 60 * 1000 },
} as const;

/** Friendly, localized "slow down" message for guests. */
export const RATE_LIMIT_MESSAGE: Record<"el" | "en", string> = {
  el: "Λαμβάνουμε πολλά μηνύματα αυτή τη στιγμή. Περιμένετε λίγα λεπτά και δοκιμάστε ξανά. 🙏",
  en: "We're receiving a lot of messages right now. Please wait a few minutes and try again. 🙏",
};
