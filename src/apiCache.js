/**
 * Simple in-memory SWR (stale-while-revalidate) cache.
 * Keys are arbitrary strings; TTL defaults to 45s.
 * Data is kept even after going stale — callers show stale data
 * while the background refresh runs.
 */

const STALE_MS = 45_000; // 45 seconds

const _store = new Map(); // key → { data, ts }

export const apiCache = {
  /** Return cached data (even if stale), or undefined if never cached. */
  get(key) {
    const e = _store.get(key);
    return e ? e.data : undefined;
  },

  /** True if the entry is missing or older than STALE_MS. */
  isStale(key) {
    const e = _store.get(key);
    return !e || Date.now() - e.ts > STALE_MS;
  },

  /** Store a value (resets the timestamp). */
  set(key, data) {
    _store.set(key, { data, ts: Date.now() });
  },

  /** Delete all keys whose names start with `prefix`. */
  invalidate(prefix) {
    for (const k of _store.keys()) {
      if (k.startsWith(prefix)) _store.delete(k);
    }
  },

  /** Force-expire a key (keeps data for SWR but triggers re-fetch on next visit). */
  expire(key) {
    const e = _store.get(key);
    if (e) _store.set(key, { data: e.data, ts: 0 });
  },
};
