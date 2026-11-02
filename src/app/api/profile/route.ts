import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import type { GitHubProfile, GitHubRepo, ProfilePayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TTL_MS = 10 * 60_000;
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const g = globalThis as unknown as { __profileCache?: Map<string, { at: number; body: ProfilePayload }> };
const cache = (g.__profileCache ??= new Map());

class GhError extends Error {
  constructor(public status: number) {
    super(`GitHub ${status}`);
  }
}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'status-dashboard',
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  if (!res.ok) throw new GhError(res.status);
  return (await res.json()) as T;
}

interface RawUser {
  login: string;
  name?: string | null;
  avatar_url: string;
  html_url: string;
  bio?: string | null;
  public_repos?: number;
  followers?: number;
  following?: number;
}

interface RawRepo {
  name: string;
  html_url: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  fork?: boolean;
  archived?: boolean;
  pushed_at?: string | null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  // Login diambil dari sesi (bukan dari parameter), jadi user hanya bisa melihat profilnya sendiri.
  const login = session.github ?? '';
  if (!login || !LOGIN_RE.test(login)) {
    return NextResponse.json({ error: 'Akun ini tidak terhubung ke GitHub' }, { status: 404 });
  }

  const key = login.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.body);

  try {
    const [u, raw] = await Promise.all([
      gh<RawUser>(`/users/${encodeURIComponent(login)}`),
      gh<RawRepo[]>(`/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&direction=desc&per_page=100`),
    ]);

    const profile: GitHubProfile = {
      login: u.login,
      name: u.name ?? null,
      avatarUrl: u.avatar_url,
      url: u.html_url,
      bio: u.bio ?? null,
      publicRepos: u.public_repos ?? raw.length,
      followers: u.followers ?? 0,
      following: u.following ?? 0,
    };
    const repos: GitHubRepo[] = raw.map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description ? r.description.slice(0, 200) : null,
      language: r.language ?? null,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      fork: !!r.fork,
      archived: !!r.archived,
      pushedAt: r.pushed_at ?? null,
    }));

    const body: ProfilePayload = { profile, repos, truncated: profile.publicRepos > repos.length };
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof GhError) {
      if (e.status === 404) return NextResponse.json({ error: 'Akun GitHub tidak ditemukan' }, { status: 404 });
      if (e.status === 403 || e.status === 429) {
        return NextResponse.json(
          { error: 'Batas request GitHub tercapai. Coba lagi nanti, atau isi GITHUB_TOKEN di environment server.' },
          { status: 429 },
        );
      }
    }
    console.error('[profile]', e);
    return NextResponse.json({ error: 'Gagal memuat profil GitHub' }, { status: 502 });
  }
}