import { config } from './config';
import type { PingResult } from './types';

export async function pmap<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${new URL(url).host} ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Cek HTTP ke sebuah URL. `force` mengabaikan PING=false (dipakai untuk APP_HEALTH_URL). */
export async function ping(url: string, force = false): Promise<PingResult | null> {
  if ((!config.ping && !force) || !url) return null;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(config.pingTimeoutMs),
      headers: { 'User-Agent': 'mfikria-status/1.0' },
      cache: 'no-store',
    });
    await res.body?.cancel().catch(() => {});
    // <500 dianggap hidup (401/403 = situs ada tapi diproteksi)
    return { ok: res.status < 500, statusCode: res.status, latencyMs: Date.now() - started };
  } catch (e) {
    const error = e instanceof Error ? (e.name === 'TimeoutError' ? 'timeout' : e.message) : 'error';
    return { ok: false, statusCode: null, latencyMs: Date.now() - started, error };
  }
}

/** Normalisasi nama untuk pencocokan: huruf kecil, tanpa simbol/spasi. */
export function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

type Entry<T> = { at: number; data?: T; inflight?: Promise<T> };
const g = globalThis as unknown as { __statusCache?: Map<string, Entry<unknown>> };
const store: Map<string, Entry<unknown>> = (g.__statusCache ??= new Map());

/** Cache in-memory dengan TTL dan deduplikasi request yang sedang berjalan. */
export async function cached<T>(key: string, ttlMs: number, force: boolean, fn: () => Promise<T>): Promise<T> {
  const e = store.get(key) as Entry<T> | undefined;
  if (e?.data !== undefined && !force && Date.now() - e.at < ttlMs) return e.data;
  if (e?.inflight) return e.inflight;
  const inflight = fn()
    .then((data) => {
      store.set(key, { at: Date.now(), data });
      return data;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });
  store.set(key, { at: e?.at ?? 0, data: e?.data, inflight });
  return inflight;
}
