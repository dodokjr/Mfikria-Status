'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatMs, timeAgo } from '@/lib/format';
import type { ItemStatus, Provider, SessionUser, StatusItem, StatusPayload } from '@/lib/types';
import { AppItemCard } from './AppItemCard';
import { Avatar } from './Avatar';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { ProfileCard } from './ProfileCard';
import { ProjectsTable } from './ProjectsTable';
import type { Point } from './Sparkline';
import { STATUS_META, StatusBadge } from './StatusBadge';
import { ThemeToggle } from './ThemeToggle';

const POLL_MS = 30_000;
const HISTORY_LEN = 24;

const RANK: Record<ItemStatus, number> = { down: 0, failed: 1, building: 2, unknown: 3, canceled: 4, 'no-deployment': 5, operational: 6 };

function normName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function DashboardClient({ user, appName }: { user: SessionUser; appName: string }) {
  const router = useRouter();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auto, setAuto] = useState(true);
  const [history, setHistory] = useState<Record<string, Point[]>>({});
  const [now, setNow] = useState(() => Date.now());
  const [showAll, setShowAll] = useState(false);

  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | Provider>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');

  const load = useCallback(
    async (force = false) => {
      setRefreshing(true);
      try {
        const qs = new URLSearchParams();
        if (force) qs.set('refresh', '1');
        if (showAll) qs.set('scope', 'all');
        const res = await fetch(`/api/status${qs.size ? `?${qs}` : ''}`, { cache: 'no-store' });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as StatusPayload;
        setData(json);
        setError(null);
        setNow(Date.now());

        // Simpan riwayat latensi hanya jika data provider benar-benar baru (bukan hasil cache yang sama).
        setHistory((prev) => {
          const next = { ...prev };
          const push = (key: string, t: string, v: number | null) => {
            const arr = next[key] ?? [];
            if (arr[arr.length - 1]?.t === t) return;
            next[key] = [...arr, { t, v }].slice(-HISTORY_LEN);
          };
          for (const it of json.app.items) {
            const t = json.providers[it.provider].fetchedAt ?? json.generatedAt;
            push(it.id, t, it.ping ? (it.ping.ok ? it.ping.latencyMs : null) : null);
          }
          if (json.app.health) push('health', json.generatedAt, json.app.health.ok ? json.app.health.latencyMs : null);
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat status');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, showAll],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [auto, load]);

  // Perbarui teks "x menit lalu" tanpa menunggu fetch berikutnya.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
    router.refresh();
  }

  const isApp = useCallback((i: StatusItem) => normName(i.name).includes(normName(appName)), [appName]);

  // Semua project (app utama + lainnya), dipakai panel detail & tabel.
  const allItems = useMemo(() => (data ? [...data.app.items, ...data.others.items] : []), [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems
      .filter((i) => (providerFilter === 'all' || i.provider === providerFilter) && (statusFilter === 'all' || i.status === statusFilter))
      .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.team ?? '').toLowerCase().includes(q))
      .sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name));
  }, [allItems, query, providerFilter, statusFilter]);

  const unconfigured = data && !data.providers.vercel.configured && !data.providers.netlify.configured;
  const providerErrors = data ? [...data.providers.vercel.errors, ...data.providers.netlify.errors] : [];
  const appOverall = data?.app.summary.overall;
  const issues = data ? data.summary.failed + data.summary.down : 0;

  const tiles = data
    ? [
        { label: 'Total project', value: data.summary.total, tone: 'text-slate-100' },
        { label: 'Operasional', value: data.summary.operational, tone: 'text-emerald-300' },
        { label: 'Building', value: data.summary.building, tone: 'text-amber-300' },
        { label: 'Bermasalah', value: issues, tone: issues > 0 ? 'text-rose-300' : 'text-slate-100' },
      ]
    : [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-bold">m</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">mfikria Status</p>
              <p className="text-xs text-slate-500">Dashboard admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={user.name} login={user.github} size={36} />
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-slate-500">{user.github ? `@${user.github}` : user.email}</p>
              </div>
            </div>
            <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium capitalize text-indigo-300">{user.role}</span>
            <ThemeToggle />
            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {/* Judul + kontrol */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Status {appName}</h1>
              {data && data.app.found && appOverall && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                    appOverall === 'operational'
                      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
                  }`}
                >
                  {appOverall === 'operational' ? 'Semua sistem normal' : 'Ada gangguan'}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {data ? `Diperbarui ${timeAgo(data.generatedAt, now)}` : 'Memuat status…'}
              {auto && ' · otomatis tiap 30 detik'}
              {data?.scope.mode === 'mine' && ` · project dari repo GitHub @${data.scope.github}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data?.scope.canToggle && (
              <div className="flex rounded-lg border border-slate-700 p-0.5 text-sm" role="group" aria-label="Cakupan project">
                {([false, true] as const).map((all) => (
                  <button
                    key={String(all)}
                    onClick={() => setShowAll(all)}
                    aria-pressed={showAll === all}
                    className={`rounded-md px-3 py-1.5 transition ${showAll === all ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {all ? 'Semua' : `Milik @${data.scope.github}`}
                  </button>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4 accent-indigo-500" />
              Auto-refresh
            </label>
            <button
              onClick={() => void load(true)}
              disabled={refreshing}
              title={user.role === 'admin' ? 'Ambil data terbaru (lewati cache)' : 'Muat ulang'}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {refreshing ? 'Memuat…' : 'Refresh'}
            </button>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            Gagal memuat status: {error}
          </div>
        )}

        {unconfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Belum ada token Vercel/Netlify. Isi <code className="rounded bg-slate-900 px-1">VERCEL_TOKEN</code> atau{' '}
            <code className="rounded bg-slate-900 px-1">NETLIFY_TOKEN</code> di environment server.
          </div>
        )}

        {providerErrors.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <p className="font-medium">Sebagian data provider gagal dimuat:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-200/80">
              {providerErrors.slice(0, 5).map((e, i) => (
                <li key={i} className="break-words">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Kartu utama mfikriaApp */}
        <section aria-label={`Status ${appName}`} className="grid gap-4 lg:grid-cols-2">
          {loading && !data && (
            <>
              <div className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
              <div className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
            </>
          )}

          {data?.app.items.map((it) => <AppItemCard key={it.id} item={it} history={history[it.id] ?? []} />)}

          {data && !data.app.found && !unconfigured && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 lg:col-span-2">
              <p className="font-medium">Project “{appName}” tidak ditemukan</p>
              <p className="mt-1 text-sm text-slate-400">
                Tidak ada project Vercel/Netlify yang namanya mengandung “{appName}”. Sesuaikan <code className="rounded bg-slate-900 px-1">APP_NAME</code> dengan
                nama project di dashboard Vercel/Netlify.
              </p>
            </div>
          )}

          {data?.app.health && (
            <article className={`rounded-2xl border bg-slate-900/70 p-5 ${data.app.health.ok ? 'border-emerald-500/30' : 'border-red-500/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Health check langsung</p>
                  <h3 className="mt-0.5 text-lg font-semibold">Server {appName}</h3>
                  <p className="truncate text-sm text-slate-400">{data.app.health.url}</p>
                </div>
                <StatusBadge status={data.app.health.ok ? 'operational' : 'down'} />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">HTTP</dt>
                  <dd className="mt-0.5 font-medium">{data.app.health.statusCode ?? data.app.health.error ?? 'gagal'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Latensi</dt>
                  <dd className="mt-0.5 font-medium">{formatMs(data.app.health.latencyMs)}</dd>
                </div>
              </dl>
            </article>
          )}
        </section>

        {/* Ringkasan */}
        {data && (
          <section aria-label="Ringkasan semua project" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs text-slate-500">{t.label}</p>
                <p className={`mt-1 text-3xl font-semibold tabular-nums ${t.tone}`}>{t.value}</p>
              </div>
            ))}
          </section>
        )}

        {/* Detail project, log build, riwayat 7 hari & usage */}
        {data && allItems.length > 0 && (
          <ItemDetailsPanel items={allItems} now={now} canViewLogs={user.role === 'admin'} defaultId={data.app.items[0]?.id} />
        )}

        {/* Tabel semua project */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 p-4">
            <h2 className="mr-auto text-base font-semibold">Semua project</h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama…"
              aria-label="Cari project"
              className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none placeholder:text-slate-600 focus:border-indigo-500 sm:w-52"
            />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value as 'all' | Provider)}
              aria-label="Filter provider"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="all">Semua provider</option>
              <option value="vercel">Vercel</option>
              <option value="netlify">Netlify</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ItemStatus)}
              aria-label="Filter status"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="all">Semua status</option>
              {(Object.keys(STATUS_META) as ItemStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
          {loading && !data ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Memuat…</p>
          ) : (
            <ProjectsTable
              items={rows}
              appName={appName}
              isApp={isApp}
              emptyHint={data?.scope.mode === 'mine' ? `Belum ada project Vercel/Netlify dengan repo GitHub milik @${data.scope.github}.` : undefined}
            />
          )}
        </section>

        {/* Profil GitHub & repository (hanya untuk akun yang terhubung ke GitHub) */}
        <ProfileCard user={user} now={now} />

        <footer className="pb-6 text-center text-xs text-slate-600">Data dari API Vercel &amp; Netlify · cache {data ? 'aktif' : '—'}</footer>
      </main>
    </div>
  );
}