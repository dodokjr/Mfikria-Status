'use client';

import { useEffect, useState } from 'react';
import type { NetlifyUsage, StatusItem, UsageCategory, UsageReport, UsageRow, VercelUsage } from '@/lib/types';

const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

function formatBytes(n: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${nf.format(v)} ${units[i]}`;
}

const qty = (n: number, unit: string) => (n === 0 ? '-' : `${nf.format(n)}${unit ? ` ${unit}` : ''}`);

const SECTIONS: { id: UsageCategory; title: string; empty: string }[] = [
  { id: 'network', title: 'Networking', empty: 'Tidak ada pemakaian networking tercatat.' },
  { id: 'cache', title: 'Data cache', empty: 'Tidak ada pemakaian data cache tercatat.' },
];

function Table({ rows, currency }: { rows: UsageRow[]; currency: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Layanan</th>
            <th className="px-3 py-1.5 text-right font-medium">7 hari</th>
            <th className="px-3 py-1.5 text-right font-medium">30 hari</th>
            <th className="py-1.5 pl-3 text-right font-medium">Biaya 30 hari</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((r) => (
            <tr key={`${r.service}|${r.unit}`}>
              <td className="py-2 pr-3">{r.service}</td>
              <td className="px-3 py-2 text-right tabular-nums">{qty(r.qty7, r.unit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{qty(r.qty30, r.unit)}</td>
              <td className="py-2 pl-3 text-right tabular-nums text-slate-400">
                {r.cost30 === 0 ? '-' : `${nf.format(r.cost30)}${currency ? ` ${currency}` : ''}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VercelView({ data }: { data: VercelUsage }) {
  const other = data.rows.filter((r) => r.category === 'other');
  return (
    <div className="space-y-5">
      {SECTIONS.map((s) => {
        const rows = data.rows.filter((r) => r.category === s.id);
        return (
          <div key={s.id}>
            <h4 className="mb-1 text-sm font-semibold">{s.title}</h4>
            {rows.length ? <Table rows={rows} currency={data.currency} /> : <p className="text-xs text-slate-500">{s.empty}</p>}
          </div>
        );
      })}
      {other.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Layanan lain ({other.length})</summary>
          <div className="mt-2">
            <Table rows={other} currency={data.currency} />
          </div>
        </details>
      )}
      <p className="text-xs text-slate-500">
        Sumber: Vercel billing charges API, per hari dalam UTC (30 hari sampai akhir hari ini). Layanan dikelompokkan lewat namanya; kalau ada yang salah kelompok,
        ubah pola <code className="rounded bg-slate-900 px-1">NETWORK_RE</code> / <code className="rounded bg-slate-900 px-1">CACHE_RE</code> di route usage.
      </p>
    </div>
  );
}

function NetlifyView({ data }: { data: NetlifyUsage }) {
  const pct = data.used != null && data.included ? Math.min(100, (data.used / data.included) * 100) : null;
  const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Bandwidth terpakai</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{data.used != null ? formatBytes(data.used) : '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Kuota periode</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{data.included != null ? formatBytes(data.included) : '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Mulai periode</dt>
          <dd className="mt-0.5 font-medium">{date(data.periodStart)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Berakhir</dt>
          <dd className="mt-0.5 font-medium">{date(data.periodEnd)}</dd>
        </div>
      </dl>
      {pct != null && (
        <div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{nf.format(pct)}% dari kuota periode ini</p>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Netlify hanya menyediakan total bandwidth <b>akun</b> untuk periode tagihan berjalan lewat endpoint yang tidak terdokumentasi. Rincian 7/30 hari, per site,
        dan data cache tidak tersedia lewat API.
      </p>
    </div>
  );
}

export function UsageView({ item, canView }: { item: StatusItem; canView: boolean }) {
  const [scope, setScope] = useState<'project' | 'team'>('project');
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: UsageReport | null }>({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);

  const missingAccount = item.provider === 'netlify' && !item.team;

  useEffect(() => {
    if (!canView || missingAccount) return;
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    const qs = new URLSearchParams({
      provider: item.provider,
      team: item.team ?? 'personal',
      project: item.id.slice(item.provider.length + 1),
      scope,
    });
    fetch(`/api/status/usage?${qs}`, { cache: 'no-store' })
      .then(async (res) => {
        const j = (await res.json().catch(() => null)) as (UsageReport & { error?: string }) | null;
        if (!res.ok || !j) throw new Error(j?.error ?? `HTTP ${res.status}`);
        if (!cancelled) setState({ loading: false, error: null, data: j });
      })
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: e instanceof Error ? e.message : 'Gagal memuat usage', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [item.provider, item.team, item.id, scope, attempt, canView, missingAccount]);

  if (!canView) return <p className="text-sm text-slate-500">Usage hanya dapat dilihat oleh admin.</p>;
  if (missingAccount) return <p className="text-sm text-slate-500">Slug akun Netlify untuk site ini tidak diketahui, jadi usage tidak dapat dimuat.</p>;

  return (
    <div className="space-y-4">
      {item.provider === 'vercel' && (
        <div className="flex rounded-lg border border-slate-700 p-0.5 text-sm" role="group" aria-label="Cakupan usage" style={{ width: 'fit-content' }}>
          {(['project', 'team'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className={`rounded-md px-3 py-1.5 transition ${scope === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {s === 'project' ? 'Project ini' : 'Seluruh team'}
            </button>
          ))}
        </div>
      )}

      {state.loading && (
        <div className="space-y-2" aria-busy="true">
          <div className="h-6 w-1/3 animate-pulse rounded bg-slate-800/60" />
          <div className="h-20 animate-pulse rounded-lg bg-slate-800/60" />
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

      {state.data?.provider === 'vercel' && <VercelView data={state.data} />}
      {state.data?.provider === 'netlify' && <NetlifyView data={state.data} />}
    </div>
  );
}