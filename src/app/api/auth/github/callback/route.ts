import { NextResponse, type NextRequest } from 'next/server';
import { GITHUB_STATE_COOKIE, appOrigin, fetchGithubIdentity, isAllowedLogin } from '@/lib/github';
import { isProd } from '@/lib/http';
import { PENDING_COOKIE, PENDING_MAX_AGE, signPending } from '@/lib/session';
import { loadUsers } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);

  // Semua jalur keluar menghapus cookie state agar tidak bisa dipakai ulang.
  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    res.cookies.set(GITHUB_STATE_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/api/auth/github', maxAge: 0 });
    return res;
  };

  const sp = req.nextUrl.searchParams;
  if (sp.get('error')) return go('/register?error=github_denied');

  const code = sp.get('code');
  const state = sp.get('state');
  const saved = req.cookies.get(GITHUB_STATE_COOKIE)?.value;
  if (!code || !state || !saved || state !== saved) return go('/register?error=state');

  try {
    const profile = await fetchGithubIdentity(code, req.nextUrl.origin);
    if (!isAllowedLogin(profile.login)) return go('/register?error=not_allowed');

    const users = await loadUsers(true);
    if (users.some((u) => u.githubId === profile.githubId || u.email === profile.email)) return go('/login?notice=exists');

    const res = go('/register/password');
    res.cookies.set(PENDING_COOKIE, await signPending(profile), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: PENDING_MAX_AGE,
    });
    return res;
  } catch (e) {
    console.error('[github-callback]', e);
    return go('/register?error=failed');
  }
}
