import { config } from './config';
import { collectNetlify } from './providers/netlify';
import { collectVercel } from './providers/vercel';
import type { HealthCheck, Provider, ProviderResult, StatusItem, StatusPayload, Summary } from './types';
import { cached, normName, ping } from './util';

export function summarize(items: StatusItem[]): Summary {
  const s: Summary = { total: items.length, operational: 0, building: 0, failed: 0, down: 0, canceled: 0, other: 0, overall: 'unknown' };
  for (const i of items) {
    switch (i.status) {
      case 'operational':
      case 'building':
      case 'failed':
      case 'down':
      case 'canceled':
        s[i.status]++;
        break;
      default:
        s.other++;
    }
  }
  s.overall = s.down || s.failed ? 'degraded' : s.total === 0 ? 'unknown' : 'operational';
  return s;
}

export function matchesApp(name: string, appName: string): boolean {
  const n = normName(name);
  const a = normName(appName);
  return a.length > 0 && n.includes(a);
}

const PROVIDERS: Record<Provider, { enabled: () => boolean; run: typeof collectVercel }> = {
  vercel: { enabled: () => config.vercelTokens.length > 0, run: collectVercel },
  netlify: { enabled: () => config.netlifyTokens.length > 0, run: collectNetlify },
};

async function getProvider(name: Provider, force: boolean): Promise<ProviderResult> {
  const def = PROVIDERS[name];
  if (!def.enabled()) return { configured: false, items: [], errors: [], fetchedAt: null };
  try {
    return await cached(`provider:${name}`, config.cacheTtlMs, force, async () => {
      const { items, errors } = await def.run();
      return { configured: true, items, errors, fetchedAt: new Date().toISOString() } satisfies ProviderResult;
    });
  } catch (e) {
    return { configured: true, items: [], errors: [e instanceof Error ? e.message : String(e)], fetchedAt: new Date().toISOString() };
  }
}

async function getHealth(force: boolean): Promise<HealthCheck | null> {
  const url = config.appHealthUrl;
  if (!url) return null;
  return cached(`health:${url}`, config.cacheTtlMs, force, async () => {
    const r = await ping(url, true);
    return { url, ...(r ?? { ok: false, statusCode: null, latencyMs: 0, error: 'tidak ada hasil' }) };
  });
}

/**
 * Sesuaikan payload dengan akun GitHub user: daftar project hanya berisi project Vercel/Netlify
 * yang repo GitHub-nya dimiliki username tersebut. Kartu aplikasi utama (APP_NAME) tetap tampil.
 * Admin ber-GitHub boleh melihat semua (`wantAll`). User tanpa GitHub (akun manual) melihat semua.
 */
export function applyScope(p: StatusPayload, github: string | undefined, isAdmin: boolean, wantAll: boolean): StatusPayload {
  const canToggle = isAdmin && Boolean(github);
  if (!github || (isAdmin && wantAll)) return { ...p, scope: { mode: 'all', github: github ?? null, canToggle } };

  const g = github.toLowerCase();
  const mine = p.others.items.filter((i) => i.repoOwner?.toLowerCase() === g);
  return {
    ...p,
    summary: summarize([...p.app.items, ...mine]),
    others: { summary: summarize(mine), items: mine },
    scope: { mode: 'mine', github, canToggle },
  };
}

export async function getStatusPayload(force = false): Promise<StatusPayload> {
  const [vercel, netlify, health] = await Promise.all([getProvider('vercel', force), getProvider('netlify', force), getHealth(force)]);
  const all = [...vercel.items, ...netlify.items];
  const appName = config.appName;
  const appItems = all.filter((i) => matchesApp(i.name, appName));
  const others = all.filter((i) => !matchesApp(i.name, appName));

  return {
    generatedAt: new Date().toISOString(),
    appName,
    scope: { mode: 'all', github: null, canToggle: false },
    summary: summarize(all),
    app: { found: appItems.length > 0, summary: summarize(appItems), items: appItems, health },
    others: { summary: summarize(others), items: others },
    providers: {
      vercel: { configured: vercel.configured, errors: vercel.errors, fetchedAt: vercel.fetchedAt },
      netlify: { configured: netlify.configured, errors: netlify.errors, fetchedAt: netlify.fetchedAt },
    },
  };
}
