import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { config } from '@/lib/config';
import type { NetlifyUsage, UsageCategory, UsageReport, UsageRow, VercelUsage } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;
const TTL_MS = 10 * 60_000;
const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const SLUG_RE = /^[A-Za-z0-9_.-]{1,64}$/;

// Nama layanan dicocokkan lewat pola, karena nama persisnya ditentukan Vercel.
const NETWORK_RE = /(data transfer|origin transfer|bandwidth|edge request)/i;
const CACHE_RE = /(data cache|isr|cache)/i;

const category = (service: string): UsageCategory => (NETWORK_RE.test(service) ? 'network' : CACHE_RE.test(service) ? 'cache' : 'other');

class UsageError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const g = globalThis as unknown as { __usageCache?: Map<string, { at: number; body: UsageReport }> };
const cache = (g.__usageCache ??= new Map());

interface Charge {
  ChargePeriodStart?: string;
  ServiceName?: string;
  ConsumedQuantity?: number;
  ConsumedUnit?: string;
  EffectiveCost?: number;
  BilledCost?: number;
  BillingCurrency?: string;
  Tags?: Record<string, string>;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

async function vercelUsage(team: string | null, projectId: string | null): Promise<VercelUsage> {
  const to = Math.floor(Date.now() / DAY) * DAY + DAY; // batas atas eksklusif: awal hari berikutnya (UTC)
  const from = to - 30 * DAY;
  const cut7 = to - 7 * DAY;
  let lastStatus = 0;

  for (const token of config.vercelTokens) {
    const q = new URLSearchParams({ from: new Date(from).toISOString(), to: new Date(to).toISOString() });
    if (team) q.set('teamId', team);
    let res: Response;
    try {
      res = await fetch(`https://api.vercel.com/v1/billing/charges?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      });
    } catch {
      continue;
    }
    if (!res.ok) {
      lastStatus = res.status;
      continue;
    }

    const rows = new Map<string, UsageRow>();
    let currency: string | null = null;
    for (const line of (await res.text()).split('\n')) {
      if (!line.trim()) continue;
      let c: Charge;
      try {
        c = JSON.parse(line) as Charge;
      } catch {
        continue;
      }
      if (projectId && c.Tags?.ProjectId !== projectId) continue;
      const t = c.ChargePeriodStart ? Date.parse(c.ChargePeriodStart) : NaN;
      if (Number.isNaN(t)) continue;

      const service = c.ServiceName || 'Lainnya';
      const unit = c.ConsumedUnit || '';
      const key = `${service}|${unit}`;
      const row = rows.get(key) ?? { service, category: category(service), unit, qty7: 0, qty30: 0, cost7: 0, cost30: 0 };
      const qty = num(c.ConsumedQuantity);
      const cost = num(c.EffectiveCost ?? c.BilledCost);
      row.qty30 += qty;
      row.cost30 += cost;
      if (t >= cut7) {
        row.qty7 += qty;
        row.cost7 += cost;
      }
      rows.set(key, row);
      currency ??= c.BillingCurrency ?? null;
    }

    const order: Record<UsageCategory, number> = { network: 0, cache: 1, other: 2 };
    return {
      provider: 'vercel',
      scope: projectId ? 'project' : 'team',
      currency,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      rows: [...rows.values()].sort((a, b) => order[a.category] - order[b.category] || b.qty30 - a.qty30),
    };
  }

  if (lastStatus === 403) {
    throw new UsageError('Token tidak punya akses billing untuk team ini (butuh role Owner/Billing/Member dan plan berbayar).', 403);
  }
  throw new UsageError(lastStatus ? `Vercel billing API ${lastStatus}` : 'Tidak dapat menghubungi Vercel billing API', 502);
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function netlifyUsage(account: string): Promise<NetlifyUsage> {
  let lastStatus = 0;
  for (const token of config.netlifyTokens) {
    try {
      const res = await fetch(`https://api.netlify.com/api/v1/accounts/${encodeURIComponent(account)}/bandwidth`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'status-dashboard' },
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      const j = (await res.json()) as Record<string, unknown>;
      return {
        provider: 'netlify',
        account,
        used: numOrNull(j.used),
        included: numOrNull(j.included),
        periodStart: str(j.period_start_date),
        periodEnd: str(j.period_end_date),
        updatedAt: str(j.last_updated_at),
      };
    } catch {
      continue;
    }
  }
  throw new UsageError(lastStatus ? `Netlify API ${lastStatus}` : 'Tidak dapat menghubungi Netlify API', lastStatus === 404 ? 404 : 502);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  // Data biaya & pemakaian bersifat sensitif: hanya admin.
  if (session.role !== 'admin') return NextResponse.json({ error: 'Hanya admin yang dapat melihat usage' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const provider = sp.get('provider');
  const team = sp.get('team') ?? 'personal';
  const project = sp.get('project') ?? '';
  const scope = sp.get('scope') === 'team' ? 'team' : 'project';

  if (provider !== 'vercel' && provider !== 'netlify') return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 });
  if (!SLUG_RE.test(team)) return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 });
  if (provider === 'vercel' && scope === 'project' && !ID_RE.test(project)) {
    return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 });
  }

  const key = `${provider}|${team}|${provider === 'vercel' && scope === 'project' ? project : '*'}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.body);

  try {
    const body =
      provider === 'vercel'
        ? await vercelUsage(team === 'personal' ? null : team, scope === 'project' ? project : null)
        : await netlifyUsage(team);
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof UsageError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[usage]', e);
    return NextResponse.json({ error: 'Gagal memuat usage' }, { status: 502 });
  }
}