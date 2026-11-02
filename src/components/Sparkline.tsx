export interface Point {
  t: string;
  v: number | null; // latensi ms; null = gagal
}

export function Sparkline({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return <p className="text-xs text-slate-500">Riwayat latensi muncul setelah beberapa kali refresh</p>;
  }
  const max = Math.max(1, ...points.map((p) => p.v ?? 0));
  return (
    <div className="flex h-8 items-end gap-0.5" role="img" aria-label="Riwayat latensi">
      {points.map((p) => (
        <div
          key={p.t}
          title={p.v === null ? 'gagal' : `${p.v} ms`}
          className={`w-1.5 rounded-sm ${p.v === null ? 'bg-red-500/80' : 'bg-emerald-400/70'}`}
          style={{ height: p.v === null ? '100%' : `${Math.max(12, (p.v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}
