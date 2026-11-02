import { formatMs, timeAgo } from '@/lib/format';
import type { StatusItem } from '@/lib/types';
import { Sparkline, type Point } from './Sparkline';
import { STATUS_META, StatusBadge } from './StatusBadge';

const PROVIDER_LABEL = { vercel: 'Vercel', netlify: 'Netlify' } as const;

export function AppItemCard({ item, history }: { item: StatusItem; history: Point[] }) {
  const meta = STATUS_META[item.status];
  return (
    <article className={`rounded-2xl border bg-slate-900/70 p-5 ${meta.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{PROVIDER_LABEL[item.provider]}</p>
          <h3 className="mt-0.5 truncate text-lg font-semibold">{item.name}</h3>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-indigo-300 hover:underline">
            {item.url.replace(/^https?:\/\//, '')} ↗
          </a>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">HTTP</dt>
          <dd className="mt-0.5 font-medium">{item.ping ? (item.ping.statusCode ?? item.ping.error ?? 'gagal') : '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Latensi</dt>
          <dd className="mt-0.5 font-medium">{formatMs(item.ping?.latencyMs)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Deploy terakhir</dt>
          <dd className="mt-0.5 font-medium">{timeAgo(item.deploy.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Branch</dt>
          <dd className="mt-0.5 truncate font-medium">{item.deploy.branch ?? '-'}</dd>
        </div>
      </dl>

      {item.deploy.commit && (
        <p className="mt-4 truncate rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-400" title={item.deploy.commit}>
          {item.deploy.commit}
        </p>
      )}
      {item.deploy.error && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{item.deploy.error}</p>}

      <div className="mt-4">
        <Sparkline points={history} />
      </div>
    </article>
  );
}
