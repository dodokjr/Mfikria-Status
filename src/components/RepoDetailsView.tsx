'use client';

import { useEffect, useMemo, useState } from 'react';
import { timeAgo } from '@/lib/format';
import type { RepoDetails } from '@/lib/types';

const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-400', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];
const OTHER_COLOR = 'bg-slate-500';
const MAX_LANGS = 6;

function formatKb(kb: number): string {
  if (kb < 1024) return `${nf.format(kb)} KB`;
  const mb = kb / 1024;
  return mb < 1024 ? `${nf.format(mb)} MB` : `${nf.format(mb / 1024)} GB`;
}

const dateFmt = (s: string | null) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

export function RepoDetailsView({ name, now, onClose }: { name: string; now: number; onClose: () => void }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: RepoDetails | null }>({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    fetch(`/api/profile/repo?${new URLSearchParams({ name })}`, { cache: 'no-store' })
      .then(async (res) => {
        const j = (await res.json().catch(() => null)) as (RepoDetails & { error?: string }) | null;
        if (!res.ok || !j) throw new Error(j?.error ?? `HTTP ${res.status}`);
        if (!cancelled) setState({ loading: false, error: null, data: j });
      })
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: e instanceof Error ? e.message : 'Gagal memuat detail', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [name, attempt]);

  const d = state.data;

  const langs = useMemo(() => {
    if (!d) return [];
    const total = d.languages.reduce((n, l) => n + l.bytes, 0);
    if (total === 0) return [];
    const top = d.languages.slice(0, MAX_LANGS).map((l, i) => ({ name: l.name, pct: (l.bytes / total) * 100, color: COLORS[i % COLORS.length]! }));
    const rest = d.languages.slice(MAX_LANGS).reduce((n, l) => n + l.bytes, 0);
    if (rest > 0) top.push({ name: 'Lainnya', pct: (rest / total) * 100, color: OTHER_COLOR });
    return top;
  }, [d]);

  const facts: [string, string][] = d
    ? [
        ['Branch default', d.defaultBranch],
        ['Lisensi', d.license ?? '-'],
        ['Ukuran', formatKb(d.sizeKb)],
        ['Stars', nf.format(d.stars)],
        ['Forks', nf.format(d.forks)],
        ['Watchers', nf.format(d.watchers)],
        ['Issue & PR terbuka', nf.format(d.openIssues)],
        ['Dibuat', dateFmt(d.createdAt)],
        ['Push terakhir', d.pushedAt ? timeAgo(d.pushedAt, now) : '-'],
        ['Diperbarui', d.updatedAt ? timeAgo(d.updatedAt, now) : '-'],
      ]
    : [];

  return (
    <div className="space-y-4 rounded-xl border border-indigo-500/30 bg-slate-950/60 p-5" aria-label={`Detail repository ${name}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="mr-auto min-w-0 truncate text-base font-semibold">{d?.fullName ?? name}</h3>
        {d && (
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800">
            Buka di GitHub
          </a>
        )}
        <button onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800">
          Tutup
        </button>
      </div>

      {state.loading && (
        <div className="space-y-2" aria-busy="true">
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-800/60" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-800/60" />
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

      {d && (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {d.fork && d.parent && (
                <span className="text-xs text-slate-400">
                  Fork dari{' '}
                  <a href={d.parent.url} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">
                    {d.parent.name}
                  </a>
                </span>
              )}
              {d.archived && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">arsip</span>}
            </div>
            <p className="text-sm text-slate-300">{d.description ?? 'Tanpa deskripsi'}</p>
            {d.homepage && (
              <a href={d.homepage} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full truncate text-sm text-indigo-300 hover:underline">
                {d.homepage}
              </a>
            )}
            {d.topics.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Topik">
                {d.topics.map((t) => (
                  <li key={t} className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-0.5 truncate font-medium" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Bahasa</h4>
            {langs.length === 0 ? (
              <p className="text-xs text-slate-500">Tidak ada data bahasa.</p>
            ) : (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800" role="img" aria-label="Komposisi bahasa">
                  {langs.map((l) => (
                    <div key={l.name} className={l.color} style={{ width: `${l.pct}%` }} title={`${l.name}: ${nf.format(l.pct)}%`} />
                  ))}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  {langs.map((l) => (
                    <li key={l.name} className="flex items-center gap-1.5">
                      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${l.color}`} />
                      {l.name} <span className="tabular-nums text-slate-500">{nf.format(l.pct)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {d.release && (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Rilis terbaru</h4>
              <a href={d.release.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-300 hover:underline">
                {d.release.name || d.release.tag}
              </a>
              <span className="ml-2 text-xs text-slate-500">
                {d.release.tag}
                {d.release.publishedAt ? ` · ${timeAgo(d.release.publishedAt, now)}` : ''}
              </span>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold">Commit terakhir</h4>
            {d.commits.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada commit.</p>
            ) : (
              <ul className="divide-y divide-slate-800 text-sm">
                {d.commits.map((c) => (
                  <li key={c.sha} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-indigo-300 hover:underline">
                      {c.sha}
                    </a>
                    <span className="min-w-0 flex-1 truncate" title={c.message}>
                      {c.message || '(tanpa pesan)'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {c.author ? `${c.author} · ` : ''}
                      {c.date ? timeAgo(c.date, now) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}