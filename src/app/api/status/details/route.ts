import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { config } from '@/lib/config';
import type { DeployDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const MAX_LINES = 150;
const MAX_LINE_LEN = 400;
const ANSI_RE = /\u001b\[[0-9;]*m/g;
const SECRET_RE = /((?:token|secret|password|passwd|api[_-]?key|authorization|bearer)\s*[=:]\s*)\S+/gi;

const sanitize = (s: string) => s.replace(ANSI_RE, '').replace(SECRET_RE, '$1[disembunyikan]').trimEnd().slice(0, MAX_LINE_LEN);

/** Mengembalikan Response bila sukses, null bila gagal (token salah / tidak punya akses / tidak ada). */
async function api(url: string, token: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

interface VercelEvent {
  type?: string;
  created?: number;
  text?: string;
  payload?: { text?: string; date?: number };
}

async function vercelDetails(deployId: string): Promise<DeployDetails | null> {
  const teams = config.vercelTeams.length ? config.vercelTeams : [null];
  for (const token of config.vercelTokens) {
    for (const team of teams) {
      const qs = new URLSearchParams();
      if (team) qs.set('teamId', team);

      const infoRes = await api(`https://api.vercel.com/v13/deployments/${deployId}?${qs}`, token);
      if (!infoRes) continue;
      const info = (await infoRes.json()) as {
        errorMessage?: string | null;
        buildingAt?: number;
        ready?: number;
        regions?: string[];
      };

      qs.set('limit', String(MAX_LINES));
      qs.set('direction', 'backward'); // ambil log terbaru (akhir build), lalu dibalik
      const evRes = await api(`https://api.vercel.com/v3/deployments/${deployId}/events?${qs}`, token);
      let lines: string[] = [];
      if (evRes) {
        const body = (await evRes.json()) as VercelEvent[] | { events?: VercelEvent[] };
        const events = Array.isArray(body) ? body : (body.events ?? []);
        lines = events
          .map((e) => ({ t: e.created ?? e.payload?.date, text: e.payload?.text ?? e.text }))
          .filter((e): e is { t: number | undefined; text: string } => typeof e.text === 'string' && e.text.trim() !== '')
          .reverse()
          .map((e) => `${e.t ? new Date(e.t).toISOString().slice(11, 19) : '--:--:--'}  ${sanitize(e.text)}`);
      }

      return {
        source: 'vercel',
        lines,
        truncated: lines.length >= MAX_LINES,
        errorMessage: info.errorMessage ?? null,
        buildSec: info.ready && info.buildingAt && info.ready > info.buildingAt ? Math.round((info.ready - info.buildingAt) / 1000) : null,
        regions: info.regions ?? [],
        ...(lines.length === 0 ? { note: 'Tidak ada event log yang dikembalikan untuk deployment ini.' } : {}),
      };
    }
  }
  return null;
}

async function netlifyDetails(deployId: string): Promise<DeployDetails | null> {
  for (const token of config.netlifyTokens) {
    const infoRes = await api(`https://api.netlify.com/api/v1/deploys/${deployId}`, token);
    if (!infoRes) continue;
    const info = (await infoRes.json()) as { name?: string; error_message?: string | null; deploy_time?: number | null };

    let lines: string[] = [];
    let note: string | undefined;
    const logRes = await api(`https://api.netlify.com/api/v1/deploys/${deployId}/log`, token);
    if (logRes) {
      const raw = await logRes.text();
      try {
        const parsed = JSON.parse(raw) as unknown;
        lines = Array.isArray(parsed)
          ? parsed.map((l) => (typeof l === 'string' ? l : String((l as { message?: unknown })?.message ?? '')))
          : raw.split('\n');
      } catch {
        lines = raw.split('\n');
      }
      lines = lines.filter((l) => l.trim() !== '').map(sanitize);
    } else {
      note = 'Log build tidak tersedia lewat API untuk deployment ini. Buka di dashboard Netlify.';
    }

    const truncated = lines.length > MAX_LINES;
    return {
      source: 'netlify',
      lines: lines.slice(-MAX_LINES),
      truncated,
      errorMessage: info.error_message ?? null,
      buildSec: typeof info.deploy_time === 'number' ? info.deploy_time : null,
      regions: [],
      ...(note ? { note } : {}),
      ...(info.name ? { adminUrl: `https://app.netlify.com/sites/${encodeURIComponent(info.name)}/deploys/${deployId}` } : {}),
    };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  // Log build bisa memuat info sensitif, dan viewer hanya boleh melihat project miliknya: batasi ke admin.
  if (session.role !== 'admin') return NextResponse.json({ error: 'Hanya admin yang dapat melihat log' }, { status: 403 });

  const provider = req.nextUrl.searchParams.get('provider');
  const deploy = req.nextUrl.searchParams.get('deploy') ?? '';
  if ((provider !== 'vercel' && provider !== 'netlify') || !ID_RE.test(deploy)) {
    return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 });
  }

  const result = provider === 'vercel' ? await vercelDetails(deploy) : await netlifyDetails(deploy);
  if (!result) return NextResponse.json({ error: 'Deployment tidak ditemukan atau token tidak punya akses' }, { status: 404 });
  return NextResponse.json(result);
}