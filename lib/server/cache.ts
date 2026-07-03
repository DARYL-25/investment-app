// In-memory TTL cache with in-flight request deduplication.
// Survives across requests within a server process; for multi-instance
// production deployments swap the Map for Redis via the same interface.

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

const MAX_ENTRIES = 5000;

function sweep() {
  if (store.size < MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt < now) store.delete(k);
  }
  // still over budget: drop oldest-expiring entries
  if (store.size >= MAX_ENTRIES) {
    const entries = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (let i = 0; i < entries.length / 4; i++) store.delete(entries[i][0]);
  }
}

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  sweep();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Memoize an async producer under `key` for `ttlMs`. Concurrent callers
 * share a single in-flight promise. Errors are not cached.
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    try {
      const value = await fn();
      if (value !== undefined) cacheSet(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/** Stale-while-error: like `cached`, but on failure returns last known value if present (even expired). */
const lastKnown = new Map<string, unknown>();

export async function cachedSafe<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    const v = await cached(key, ttlMs, fn);
    lastKnown.set(key, v);
    return v;
  } catch (err) {
    const fallback = lastKnown.get(key);
    if (fallback !== undefined) return fallback as T;
    console.error(`[cache] producer failed for ${key}:`, err instanceof Error ? err.message : err);
    return undefined;
  }
}
