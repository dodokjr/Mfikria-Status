'use client';

import { useEffect, useMemo, useState } from 'react';
import { timeAgo } from '@/lib/format';
import type { ProfilePayload, SessionUser } from '@/lib/types';
import { Avatar } from './Avatar';
import { RepoDetailsView } from './RepoDetailsView';

const PREVIEW = 6;
const nf = new Intl.NumberFormat('id-ID');

export function ProfileCard({ user, now }: { user: SessionUser; now: number }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: ProfilePayload | null }>({
    loading: true,
    error: null,
    data: null,
  });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [hideForks, setHideForks] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  const hasGithub = !!user.github;

  useEffect(() => {
    if (!hasGithub) return;
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    fetch('/api/profile', { cache: 'no-store' })
      .then(async (res) => {
        const j = (await res.json().catch(() => null)) as (ProfilePayload & { error?: string }) | null;
        if (!res.ok || !j) throw new Error(j?.error ?? `HTTP ${res.status}`);
        if (!cancelled) setState({ loading: false, error: null, data: j });
      })
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: e instanceof Error ? e.message : 'Gagal memuat profil', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [hasGithub, attempt]);

  const repos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (state.data?.repos ?? [])
      .filter((r) => !hideForks || !r.fork)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q) || (r.language ?? '').toLowerCase().includes(q));
  }, [state.data, query, hideForks]);

  if (!hasGithub) return null;

  const visible = expanded ? repos : repos.slice(0, PREVIEW);
  const p = state.data?.profile;

  return (
    <section aria-label="Profil GitHub" className="rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-800 p-5">
        <Avatar name={p?.name ?? user.name} login={user.github} src={p?.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{p?.name ?? user.name}</h2>
          <a
            href={p?.url ?? `https://github.com/${user.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-300 hover:underline"
          >
            @{user.github}
          </a>
          {p?.bio && <p className="mt-1 text-sm text-slate-400">{p.bio}</p>}
        </div>
        {p && (
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Repo publik</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{nf.format(p.publicRepos)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Followers</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{nf.format(p.followers)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Following</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{nf.format(p.following)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="space-y-4 p-5">
        {state.loading && (
          <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/60" />
            ))}
          </div>
        )}

        {state.error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <span className="mr-auto break-words">{state.error}</span>
            <button onClick={() => setAttempt((n) => n + 1)} className="rounded-lg border border-rose-400/40 px-3 py-1 text-xs transition hover:bg-rose-500/10">
              Coba lagi
            </button>
          </div>
        )}

        {state.data && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="mr-auto text-sm font-semibold">
                Repository{' '}
                <span className="font-normal text-slate-500">
                  ({repos.length}
                  {repos.length !== state.data.repos.length ? ` dari ${state.data.repos.length}` : ''})
                </span>
              </h3>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari repo…"
                aria-label="Cari repository"
                className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none placeholder:text-slate-600 focus:border-indigo-500 sm:w-52"
              />
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input type="checkbox" checked={hideForks} onChange={(e) => setHideForks(e.target.checked)} className="h-4 w-4 accent-indigo-500" />
                Sembunyikan fork
              </label>
            </div>

            {selectedRepo && <RepoDetailsView key={selectedRepo} name={selectedRepo} now={now} onClose={() => setSelectedRepo(null)} />}

            {visible.length === 0 ? (
              <p className="text-sm text-slate-500">{state.data.repos.length === 0 ? 'Belum ada repository publik.' : 'Tidak ada repository yang cocok.'}</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {visible.map((r) => {
                  const active = selectedRepo === r.name;
                  return (
                    <li
                      key={r.name}
                      className={`min-w-0 rounded-xl border bg-slate-950/50 p-4 ${active ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-slate-800'}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-semibold text-indigo-300 hover:underline">
                          {r.name}
                        </a>
                        {r.fork && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">fork</span>}
                        {r.archived && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">arsip</span>}
                        <button
                          onClick={() => setSelectedRepo(active ? null : r.name)}
                          aria-pressed={active}
                          className={`ml-auto rounded-lg px-2.5 py-1 text-xs transition ${
                            active ? 'bg-indigo-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {active ? 'Sedang dilihat' : 'Detail'}
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs text-slate-400">{r.description ?? 'Tanpa deskripsi'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {r.language && <span>{r.language}</span>}
                        <span title="Stars">★ {nf.format(r.stars)}</span>
                        <span title="Forks">⑂ {nf.format(r.forks)}</span>
                        {r.pushedAt && <span className="ml-auto">{timeAgo(r.pushedAt, now)}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {repos.length > PREVIEW && (
              <button onClick={() => setExpanded((v) => !v)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800">
                {expanded ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${repos.length})`}
              </button>
            )}

            <p className="text-xs text-slate-500">
              Hanya repository publik, diurutkan dari push terbaru.
              {state.data.truncated && ' Akun ini punya lebih dari 100 repo; hanya 100 terbaru yang ditampilkan.'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}