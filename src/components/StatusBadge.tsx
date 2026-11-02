import type { ItemStatus } from '@/lib/types';

// Kelas Tailwind ditulis lengkap (bukan dirangkai) agar terdeteksi saat build.
export const STATUS_META: Record<ItemStatus, { label: string; dot: string; pill: string; ring: string }> = {
  operational: {
    label: 'Operasional',
    dot: 'bg-emerald-400',
    pill: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    ring: 'border-emerald-500/30',
  },
  building: {
    label: 'Building',
    dot: 'bg-amber-400 animate-pulse',
    pill: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    ring: 'border-amber-500/30',
  },
  failed: {
    label: 'Deploy gagal',
    dot: 'bg-rose-400',
    pill: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
    ring: 'border-rose-500/40',
  },
  down: {
    label: 'Down',
    dot: 'bg-red-500 animate-pulse',
    pill: 'bg-red-500/10 text-red-300 ring-red-500/30',
    ring: 'border-red-500/50',
  },
  canceled: {
    label: 'Dibatalkan',
    dot: 'bg-slate-400',
    pill: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
    ring: 'border-slate-600',
  },
  unknown: {
    label: 'Tidak diketahui',
    dot: 'bg-slate-500',
    pill: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
    ring: 'border-slate-700',
  },
  'no-deployment': {
    label: 'Belum deploy',
    dot: 'bg-slate-500',
    pill: 'bg-slate-500/10 text-slate-400 ring-slate-500/30',
    ring: 'border-slate-700',
  },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${m.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
