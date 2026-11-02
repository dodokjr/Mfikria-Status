import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { config } from '@/lib/config';
import type { DeployStatus, HistoryEvent, ItemHistory } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DAYS = 7;
const MAX_PAGES = 5;
const MAX_EVENTS = 500;
const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const TEAM_RE = /^[A-Za-z0-9_-]{1,64}$/;

const VERCEL_STATE: Record<string, DeployStatus> = {
  READY: 'operational',
  BUILDING: 'building',
  INITIALIZING: 'building',
  QUEUED: 'building',
  ERROR: 'failed',
  CANCELED: 'canceled',
};

const NETLIFY_STATE: Record<string, DeployStatus> = {
  ready: 'operational',
  building: 'building',
  enqueued: 'building',
  new: 'building',
  uploading: 'building',
  uploaded: 'building',
  preparing: 'building',
  processing: 'building',
  error: 'failed',
};

async function api<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

interface VercelListItem {
  state?: string;
  readyState?: string;
  created?: number;
  createdAt?: number;
}
interface VercelList {
  deployments?: VercelListItem[];
  pagination?: { next?: number | null };
}

async function vercelHistory(projectId: string, team: string, since: number): Promise<HistoryEvent[] | null> {
  const teamId = team && team !== 'personal' ? team : null;
  for (const token of config.vercelTokens) {
    const events: HistoryEvent[] = [];
    let reached = false;
    let until: number | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const q = new URLSearchParams({ projectId, since: String(since), limit: '100', target: 'production' });
      if (teamId) q.set('teamId', teamId);
      if (until) q.set('until', String(until));
      const body: VercelList | null = await api<VercelList>(`https://api.vercel.com/v6/deployments?${q}`, token);
      if (!body) break;
      reached = true;
      for (const d of body.deployments ?? []) {
        const t = d.created ?? d.createdAt;
        if (typeof t !== 'number') continue;
        events.push({ t, status: VERCEL_STATE[d.state ?? d.readyState ?? ''] ?? 'unknown' });
      }
      until = body.pagination?.next ?? null;
      if (!until) break;
    }
    if (reached) return events;
  }
  return null;
}

interface NetlifyListItem {
  state?: string;
  created_at?: string;
}

async function netlifyHistory(siteId: string, since: number): Promise<HistoryEvent[] | null> {
  for (const token of config.netlifyTokens) {
    const events: HistoryEvent[] = [];
    let reached = false;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = await api<NetlifyListItem[]>(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=100&page=${page}`, token);
      if (!body) break;
      reached = true;
      let oldest = Infinity;
      for (const d of body) {
        const t = d.created_at ? Date.parse(d.created_at) : NaN;
        if (Number.isNaN(t)) continue;
        oldest = Math.min(oldest, t);
        if (t >= since) events.push({ t, status: NETLIFY_STATE[d.state ?? ''] ?? 'unknown' });
      }
      if (body.length < 100 || oldest < since) break;
    }
    if (reached) return events;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const provider = sp.get('provider');
  const project = sp.get('project') ?? '';
  const team = sp.get('team') ?? 'personal';
  if ((provider !== 'vercel' && provider !== 'netlify') || !ID_RE.test(project) || !TEAM_RE.test(team)) {
    return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 });
  }

  const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  const events = provider === 'vercel' ? await vercelHistory(project, team, since) : await netlifyHistory(project, since);
  if (!events) return NextResponse.json({ error: 'Riwayat tidak dapat dimuat (project tidak ditemukan atau token tidak punya akses)' }, { status: 404 });

  events.sort((a, b) => a.t - b.t);
  const truncated = events.length > MAX_EVENTS;
  const out: ItemHistory = { source: provider, since, events: events.slice(-MAX_EVENTS), truncated };
  return NextResponse.json(out);
}