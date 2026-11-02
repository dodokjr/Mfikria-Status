'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMs, timeAgo } from '@/lib/format';
import type { DeployDetails, HistoryEvent, ItemHistory, StatusItem } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { UsageView } from './UsageView';

const ISSUE_RE = /\b(error|failed|fatal|exception|warn(?:ing)?)\b/i;
const DAY_MS = 24 * 60 * 60 * 1000;

interface LogState {
  loading: boolean;
  error: string | null;
  data: DeployDetails | null;
}
const EMPTY: LogState = { loading: false, error: null, data: null };

interface HistState {
  loading: boolean;
  error: string | null;
  data: ItemHistory | null;
}
const EMPTY_HIST: HistState = { loading: false, error: null, data: null };

type Tab = 'detail' | 'history' | 'usage';
type DayTone = 'ok' | 'partial' | 'failed' | 'none';

interface Day {
  key: string;
  label: string;
  ok: number;
  failed: number;
  canceled: number;
  tone: DayTone;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Kelompokkan event per hari (zona waktu browser), 7 hari terakhir termasuk hari ini. */
function buildDays(events: HistoryEvent[], now: number): Day[] {
  const days: Day[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    days.push({
      key: dayKey(d),
      label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      ok: 0,
      failed: 0,
      canceled: 0,
      tone: 'none',
    });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const e of events) {
    const day = byKey.get(dayKey(new Date(e.t)));
    if (!day) continue;
    if (e.status === 'operational') day.ok++;
    else if (e.status === 'failed') day.failed++;
    else if (e.status === 'canceled') day.canceled++;
  }
  for (const d of days) d.tone = d.failed > 0 ? (d.ok > 0 ? 'partial' : 'failed') : d.ok > 0 ? 'ok' : 'none';
  return days;
}

const TONE_CLASS: Record<DayTone, string> = {
  ok: 'bg-emerald-500',
  partial: 'bg-amber-400',
  failed: 'bg-rose-500',
  none: 'bg-slate-700',
};
const TONE_LABEL: Record<DayTone, string> = {
  ok: 'Semua deploy sukses',
  partial: 'Ada deploy gagal, lalu berhasil',
  failed: 'Deploy gagal',
  none: 'Tidak ada deploy',
};

export function ItemDetailsPanel({
  items,
  now,
  canViewLogs,
  defaultId,
}: {
  items: StatusItem[];
  now: number;
  canViewLogs: boolean;
  defaultId?: string;
}) {
  const [selected, setSelected] = useState(defaultId ?? items[0]?.id ?? '');
  const item = items.find((i) => i.id === selected) ?? items[0];
  const [tab, setTab] = useState<Tab>('detail');
  const [logs, setLogs] = useState<LogState>(EMPTY);
  const [hist, setHist] = useState<HistState>(EMPTY_HIST);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [copied, setCopied] = useState(false);
  const reqId = useRef(0);
  const histReq = useRef(0);
  const logRef = useRef<HTMLPreElement>(null);

  // Ganti project: kosongkan log & riwayat dan batalkan hasil request lama.
  useEffect(() => {
    reqId.current++;
    histReq.current++;
    setLogs(EMPTY);
    setHist(EMPTY_HIST);
    setOnlyIssues(false);
  }, [item?.id]);

  // Riwayat dimuat saat tab dibuka (sekali per project).
  useEffect(() => {
    if (tab !== 'history' || !item || hist.data || hist.loading || hist.error) return;
    const mine = ++histReq.current;
    setHist({ loading: true, error: null, data: null });
    const qs = new URLSearchParams({
      provider: item.provider,
      project: item.id.slice(item.provider.length + 1),
      team: item.team ?? 'personal',
    });
    fetch(`/api/status/history?${qs}`, { cache: 'no-store' })
      .then(async (res) => {
        const j = (await res.json().catch(() => null)) as (ItemHistory & { error?: string }) | null;
        if (!res.ok || !j) throw new Error(j?.error ?? `HTTP ${res.status}`);
        if (mine === histReq.current) setHist({ loading: false, error: null, data: j });
      })
      .catch((e) => {
        if (mine === histReq.current) setHist({ loading: false, error: e instanceof Error ? e.message : 'Gagal memuat riwayat', data: null });
      });
  }, [tab, item, hist.data, hist.loading, hist.error]);

  const lines = useMemo(() => {
    const all = logs.data?.lines ?? [];
    return onlyIssues ? all.filter((l) => ISSUE_RE.test(l)) : all;
  }, [logs.data, onlyIssues]);

  const days = useMemo(() => (hist.data ? buildDays(hist.data.events, now) : []), [hist.data, now]);
  const totals = useMemo(() => {
    const ok = days.reduce((n, d) => n + d.ok, 0);
    const failed = days.reduce((n, d) => n + d.failed, 0);
    const canceled = days.reduce((n, d) => n + d.canceled, 0);
    const finished = ok + failed;
    return { ok, failed, canceled, rate: finished > 0 ? Math.round((ok / finished) * 100) : null };
  }, [days]);

  // Log terbaru ada di bawah.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  if (!item) return null;

  async function loadLogs() {
    if (!item?.deployId) return;
    const mine = ++reqId.current;
    setLogs({ loading: true, error: null, data: null });
    try {
      const qs = new URLSearchParams({ provider: item.provider, deploy: item.deployId });
      const res = await fetch(`/api/status/details?${qs}`, { cache: 'no-store' });
      const j = (await res.json().catch(() => null)) as (DeployDetails & { error?: string }) | null;
      if (!res.ok || !j) throw new Error(j?.error ?? `HTTP ${res.status}`);
      if (mine === reqId.current) setLogs({ loading: false, error: null, data: j });
    } catch (e) {
      if (mine === reqId.current) setLogs({ loading: false, error: e instanceof Error ? e.message : 'Gagal memuat log', data: null });
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  const r = item.resources;
  const buildSec = logs.data?.buildSec ?? r?.buildSec ?? null;
  const regions = r?.regions?.length ? r.regions : (logs.data?.regions ?? []);
  const errorMessage = logs.data?.errorMessage ?? item.deploy.error ?? null;

  const facts: [string, string][] = [
    ['Provider', item.provider === 'vercel' ? 'Vercel' : 'Netlify'],
    ['Team / akun', item.team ?? '-'],
    ['Framework', item.framework ?? '-'],
    ['Branch', item.deploy.branch ?? '-'],
    ['Deploy terakhir', item.deploy.createdAt ? timeAgo(item.deploy.createdAt, now) : '-'],
    ['Lama build', buildSec != null ? `${buildSec} detik` : '-'],
    ['Memori function', r?.memory ?? '-'],
    ['Timeout function', r?.timeoutSec ? `${r.timeoutSec} detik` : '-'],
    ['Region', regions.length ? regions.join(', ') : '-'],
    ['HTTP', item.ping ? String(item.ping.statusCode ?? item.ping.error ?? 'gagal') : '-'],
    ['Latensi', item.ping ? formatMs(item.ping.latencyMs) : '-'],
    ['Deploy ID', item.deployId ?? '-'],
  ];

  const tabs: [Tab, string][] = [
    ['detail', 'Detail & log'],
    ['history', '7 hari terakhir'],
    ['usage', 'Usage'],
  ];

  return (
    <section aria-label="Detail project" className="rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 p-4">
        <h2 className="mr-auto text-base font-semibold">Detail project</h2>
        <select
          value={item.id}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Pilih project"
          className="max-w-[16rem] rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.provider})
            </option>
          ))}
        </select>
      </div>

      <div role="tablist" aria-label="Tampilan detail" className="flex gap-1 border-b border-slate-800 px-4 pt-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm transition ${
              tab === id ? 'border-indigo-500 font-semibold text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <StatusBadge status={item.status} />
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-indigo-300 hover:underline">
            {item.url}
          </a>
        </div>

        {tab === 'detail' && (
          <>
            {item.deploy.commit && <p className="text-sm text-slate-400">Commit: {item.deploy.commit}</p>}

            {errorMessage && (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <p className="text-xs font-medium uppercase tracking-wide text-rose-300/70">Pesan error deployment</p>
                <p className="mt-1 break-words">{errorMessage}</p>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="mt-0.5 truncate font-medium" title={v}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-slate-500">
              Memori dan timeout adalah konfigurasi function, bukan pemakaian aktual. API Vercel/Netlify tidak menyediakan data pemakaian memori.
            </p>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="mr-auto text-sm font-semibold">Log build</h4>
                {logs.data && (
                  <>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                      <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} className="h-4 w-4 accent-indigo-500" />
                      Hanya error/warning
                    </label>
                    <button onClick={copy} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800">
                      {copied ? 'Tersalin' : 'Salin'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => void loadLogs()}
                  disabled={!canViewLogs || !item.deployId || logs.loading}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {logs.loading ? 'Memuat…' : logs.data ? 'Muat ulang log' : 'Muat log'}
                </button>
              </div>

              {!canViewLogs && <p className="mt-2 text-xs text-slate-500">Log hanya dapat dilihat oleh admin.</p>}
              {canViewLogs && !item.deployId && <p className="mt-2 text-xs text-slate-500">Project ini belum punya deployment.</p>}
              {logs.error && (
                <p role="alert" className="mt-2 text-xs text-rose-300">
                  {logs.error}
                </p>
              )}
              {logs.data?.note && <p className="mt-2 text-xs text-amber-200">{logs.data.note}</p>}
              {logs.data?.adminUrl && (
                <a href={logs.data.adminUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-indigo-300 hover:underline">
                  Buka di dashboard Netlify
                </a>
              )}

              {logs.data && lines.length > 0 && (
                <>
                  <pre
                    ref={logRef}
                    className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300"
                  >
                    {lines.join('\n')}
                  </pre>
                  {logs.data.truncated && <p className="mt-1 text-xs text-slate-500">Menampilkan {lines.length} baris terakhir.</p>}
                </>
              )}
              {logs.data && lines.length === 0 && !logs.data.note && (
                <p className="mt-2 text-xs text-slate-500">{onlyIssues ? 'Tidak ada baris error/warning.' : 'Log kosong.'}</p>
              )}
            </div>
          </>
        )}

        {tab === 'history' && (
          <div>
            {hist.loading && (
              <div className="grid grid-cols-7 gap-2" aria-busy="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-800/60" />
                ))}
              </div>
            )}

            {hist.error && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <span className="mr-auto break-words">{hist.error}</span>
                <button
                  onClick={() => setHist(EMPTY_HIST)}
                  className="rounded-lg border border-rose-400/40 px-3 py-1 text-xs transition hover:bg-rose-500/10"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {hist.data && (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-slate-500">Persentase sukses</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums">{totals.rate != null ? `${totals.rate}%` : '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Deploy sukses</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-300">{totals.ok}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Deploy gagal</dt>
                    <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${totals.failed > 0 ? 'text-rose-300' : ''}`}>{totals.failed}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Dibatalkan</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums">{totals.canceled}</dd>
                  </div>
                </dl>

                <ol className="grid grid-cols-7 gap-2" aria-label="Riwayat deployment per hari">
                  {days.map((d) => (
                    <li key={d.key} className="min-w-0 text-center">
                      <div
                        className={`h-16 rounded-lg ${TONE_CLASS[d.tone]} ${d.tone === 'none' ? 'opacity-50' : ''}`}
                        title={`${d.label}: ${TONE_LABEL[d.tone]}`}
                        role="img"
                        aria-label={`${d.label}: ${TONE_LABEL[d.tone]}`}
                      />
                      <p className="mt-1.5 truncate text-xs text-slate-400">{d.label}</p>
                      <p className="text-[11px] tabular-nums text-slate-500">
                        {d.ok + d.failed + d.canceled === 0 ? '-' : `${d.ok} ✓ · ${d.failed} ✗`}
                      </p>
                    </li>
                  ))}
                </ol>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {(['ok', 'partial', 'failed', 'none'] as const).map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${TONE_CLASS[t]}`} />
                      {TONE_LABEL[t]}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-slate-500">
                  Berdasarkan riwayat deployment {item.provider === 'vercel' ? 'production ' : ''}7 hari terakhir (waktu setempat). Ini bukan data uptime, karena
                  hasil ping tidak disimpan.
                  {hist.data.truncated && ' Hanya 500 deployment terbaru yang dihitung.'}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'usage' && <UsageView key={item.id} item={item} canView={canViewLogs} />}
      </div>
    </section>
  );
}