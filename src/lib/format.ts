/** Waktu relatif dalam Bahasa Indonesia, mis. "5 menit lalu". */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '-';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'baru saja';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMs(ms: number | null | undefined): string {
  return ms == null ? '-' : `${ms} ms`;
}
