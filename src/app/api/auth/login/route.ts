import { NextResponse, type NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { checkLimit, clearFailures, registerFailure } from '@/lib/rateLimit';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/session';
import { SheetsConfigError } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

const fail = (error: string, status: number, headers?: HeadersInit) => NextResponse.json({ error }, { status, headers });

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  // JSON-only: form lintas-situs tidak bisa mengirim content-type ini tanpa preflight CORS.
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return fail('Content-Type harus application/json', 415);
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail('Body tidak valid', 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 200 || password.length > 200) {
    return fail('Email dan password wajib diisi', 400);
  }

  const key = `${clientIp(req)}|${email}`;
  const wait = checkLimit(key);
  if (wait > 0) {
    const msg =
      wait < 60
        ? `Terlalu banyak percobaan. Coba lagi dalam ${wait} detik.`
        : `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(wait / 60)} menit.`;
    return fail(msg, 429, { 'Retry-After': String(wait) });
  }

  try {
    const user = await authenticate(email, password);
    if (!user) {
      registerFailure(key);
      return fail('Email atau password salah, atau akun tidak aktif', 401);
    }
    clearFailures(key);

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, await signSession(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    console.error('[login]', e);
    if (e instanceof SheetsConfigError || (e instanceof Error && e.message.includes('AUTH_SECRET'))) {
      return fail('Server belum dikonfigurasi (Google Sheets / AUTH_SECRET). Hubungi admin.', 500);
    }
    return fail('Tidak dapat membaca data pengguna dari Google Spreadsheet. Coba lagi nanti.', 502);
  }
}