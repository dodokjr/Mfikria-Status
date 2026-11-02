import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import type { RepoCommit, RepoDetails, RepoRelease } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TTL_MS = 10 * 60_000;
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

const g = globalThis as unknown as { __repoCache?: Map<string, { at: number; body: RepoDetails }> };
const cache = (g.__repoCache ??= new Map());

class GhError extends Error {
  constructor(public status: number) {
    super(`GitHub ${status}`);
  }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'status-dashboard',
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Request wajib: error dilempar. */
async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers(), signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  if (!res.ok) throw new GhError(res.status);
  return (await res.json()) as T;
}

/** Request tambahan: kegagalan (repo kosong, tidak ada rilis, dsb.) menghasilkan null. */
async function ghOptional<T>(path: string): Promise<T | null> {
  try {
    return await gh<T>(path);
  } catch {
    return null;
  }
}

interface RawRepo {
  name: string;
  full_name: string;
  html_url: string;
  description?: string | null;
  homepage?: string | null;
  topics?: string[];
  license?: { spdx_id?: string | null; name?: string | null } | null;
  default_branch?: string;
  size?: number;
  stargazers_count?: number;
  forks_count?: number;
  subscribers_count?: number;
  open_issues_count?: number;
  fork?: boolean;
  parent?: { full_name?: string; html_url?: string } | null;
  archived?: boolean;
  created_at?: string | null;
  pushed_at?: string | null;
  updated_at?: string | null;
}

interface RawCommit {
  sha: string;
  html_url: string;
  commit?: { message?: string; author?: { name?: string; date?: string } };
  author?: { login?: string } | null;
}

interface RawRelease {
  tag_name: string;
  name?: string | null;
  html_url: string;
  published_at?: string | null;
}

const safeUrl = (u: string | null | undefined): string | null => (u && /^https?:\/\//i.test(u) ? u : null);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  // Pemilik repo diambil dari sesi, jadi user hanya bisa melihat repo miliknya sendiri.
  const login = session.github ?? '';
  if (!login || !LOGIN_RE.test(login)) return NextResponse.json({ error: 'Akun ini tidak terhubung ke GitHub' }, { status: 404 });

  const name = req.nextUrl.searchParams.get('name') ?? '';
  if (!REPO_RE.test(name) || name === '.' || name === '..') return NextResponse.json({ error: 'Nama repository tidak valid' }, { status: 400 });

  const key = `${login}/${name}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.body);

  const base = `/repos/${encodeURIComponent(login)}/${encodeURIComponent(name)}`;
  try {
    const [r, langs, commits, rel] = await Promise.all([
      gh<RawRepo>(base),
      ghOptional<Record<string, number>>(`${base}/languages`),
      ghOptional<RawCommit[]>(`${base}/commits?per_page=5`),
      ghOptional<RawRelease>(`${base}/releases/latest`),
    ]);

    const release: RepoRelease | null = rel
      ? { tag: rel.tag_name, name: rel.name ?? null, url: rel.html_url, publishedAt: rel.published_at ?? null }
      : null;

    const recent: RepoCommit[] = (Array.isArray(commits) ? commits : []).map((c) => ({
      sha: c.sha.slice(0, 7),
      message: (c.commit?.message ?? '').split('\n')[0]!.slice(0, 200),
      author: c.author?.login ?? c.commit?.author?.name ?? null,
      date: c.commit?.author?.date ?? null,
      url: c.html_url,
    }));

    const body: RepoDetails = {
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description ? r.description.slice(0, 500) : null,
      homepage: safeUrl(r.homepage),
      topics: (r.topics ?? []).slice(0, 20),
      license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : (r.license?.name ?? null),
      defaultBranch: r.default_branch ?? 'main',
      sizeKb: r.size ?? 0,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      watchers: r.subscribers_count ?? 0,
      openIssues: r.open_issues_count ?? 0,
      fork: !!r.fork,
      parent: r.parent?.full_name && r.parent.html_url ? { name: r.parent.full_name, url: r.parent.html_url } : null,
      archived: !!r.archived,
      createdAt: r.created_at ?? null,
      pushedAt: r.pushed_at ?? null,
      updatedAt: r.updated_at ?? null,
      languages: Object.entries(langs ?? {})
        .map(([n, bytes]) => ({ name: n, bytes }))
        .sort((a, b) => b.bytes - a.bytes),
      commits: recent,
      release,
    };

    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof GhError) {
      if (e.status === 404) return NextResponse.json({ error: 'Repository tidak ditemukan (atau bukan publik)' }, { status: 404 });
      if (e.status === 403 || e.status === 429) {
        return NextResponse.json(
          { error: 'Batas request GitHub tercapai. Coba lagi nanti, atau isi GITHUB_TOKEN di environment server.' },
          { status: 429 },
        );
      }
    }
    console.error('[profile/repo]', e);
    return NextResponse.json({ error: 'Gagal memuat detail repository' }, { status: 502 });
  }
}