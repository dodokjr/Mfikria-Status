import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { applyScope, getStatusPayload } from '@/lib/status';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = user.role === 'admin';
  const sp = req.nextUrl.searchParams;
  // Hanya admin yang boleh melewati cache (melindungi rate limit API Vercel/Netlify) dan melihat semua project.
  const force = sp.get('refresh') === '1' && isAdmin;
  const wantAll = sp.get('scope') === 'all' && isAdmin;

  try {
    const payload = applyScope(await getStatusPayload(force), user.github, isAdmin, wantAll);
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[status]', e);
    return NextResponse.json({ error: 'Gagal mengambil status server' }, { status: 502 });
  }
}
