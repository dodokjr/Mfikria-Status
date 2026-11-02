import { NextResponse, type NextRequest } from 'next/server';
import { GITHUB_STATE_COOKIE, appOrigin, authorizeUrl, githubConfigured } from '@/lib/github';
import { isProd } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Mulai OAuth GitHub: buat `state` acak (anti-CSRF), simpan di cookie, lalu arahkan ke GitHub.
export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  if (!githubConfigured()) return NextResponse.redirect(new URL('/register?error=github_not_configured', origin));

  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  const res = NextResponse.redirect(authorizeUrl(req.nextUrl.origin, state));
  res.cookies.set(GITHUB_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/api/auth/github',
    maxAge: 600,
  });
  return res;
}
