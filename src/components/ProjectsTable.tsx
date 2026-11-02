import { formatMs, timeAgo } from '@/lib/format';
import type { StatusItem } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function ProjectsTable({
  items,
  appName,
  isApp,
  emptyHint,
}: {
  items: StatusItem[];
  appName: string;
  isApp: (i: StatusItem) => boolean;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">{emptyHint ?? 'Tidak ada project yang cocok dengan filter.'}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 font-medium">Project</th>
            <th className="px-3 py-3 font-medium">Provider</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Latensi</th>
            <th className="px-3 py-3 font-medium">Deploy terakhir</th>
            <th className="px-5 py-3 text-right font-medium">Buka</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {items.map((i) => (
            <tr key={i.id} className="transition hover:bg-slate-800/30">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{i.name}</span>
                  {isApp(i) && (
                    <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300" title={appName}>
                      APP
                    </span>
                  )}
                </div>
                {(i.repoOwner || i.team) && <p className="text-xs text-slate-500">{i.repoOwner ? `github/${i.repoOwner}` : i.team}</p>}
              </td>
              <td className="px-3 py-3 capitalize text-slate-300">{i.provider}</td>
              <td className="px-3 py-3">
                <StatusBadge status={i.status} />
              </td>
              <td className="px-3 py-3 text-slate-300">{formatMs(i.ping?.latencyMs)}</td>
              <td className="px-3 py-3 text-slate-300">
                {timeAgo(i.deploy.createdAt)}
                {i.deploy.branch && <span className="ml-1 text-xs text-slate-500">· {i.deploy.branch}</span>}
              </td>
              <td className="px-5 py-3 text-right">
                <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline" aria-label={`Buka ${i.name}`}>
                  ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
