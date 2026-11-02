// Pembatas percobaan login (in-memory, per instance server).
const MAX_FAILS = 5;
const WINDOW_MS = 60 * 1000;

interface Bucket {
  fails: number;
  resetAt: number;
}

const g = globalThis as unknown as { __loginBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (g.__loginBuckets ??= new Map());

/** Mengembalikan sisa detik tunggu jika diblokir, atau 0 jika boleh mencoba. */
export function checkLimit(key: string): number {
  const b = buckets.get(key);
  if (!b) return 0;
  if (b.resetAt <= Date.now()) {
    buckets.delete(key);
    return 0;
  }
  return b.fails >= MAX_FAILS ? Math.ceil((b.resetAt - Date.now()) / 1000) : 0;
}

export function registerFailure(key: string): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { fails: 1, resetAt: now + WINDOW_MS });
  else b.fails++;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}
