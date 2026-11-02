import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, isProd } from '@/lib/http';
import { validatePassword } from '@/lib/password';
import { checkLimit, registerFailure } from '@/lib/rateLimit';
import { RegistrationError, createAccount } from '@/lib/registration';
import { PENDING_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifyPending } from '@/lib/session';
import { SheetsConfigError } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

const fail = (error: string, status: number, headers?: HeadersInit) => NextResponse.json({ error }, { status, headers });

// Langkah 2 registrasi: user (yang sudah lolos OAuth GitHub) membuat password baru.
export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return fail('Content-Type harus application/json', 415);
  }

  const pending = await verifyPending(req.cookies.get(PENDING_COOKIE)?.value);
  if (!pending) return fail('Sesi pendaftaran habis. Mulai lagi dari GitHub.', 401);

  // Batasi percobaan per IP agar endpoint ini tidak bisa dipakai untuk membanjiri spreadsheet.
  const key = `register|${clientIp(req)}`;
  const wait = checkLimit(key);
  if (wait > 0) return fail('Terlalu banyak percobaan. Coba lagi nanti.', 429, { 'Retry-After': String(wait) });

  let body: { password?: unknown; confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail('Body tidak valid', 400);
  }
  const password = typeof body.password === 'string' ? body.password : '';
  const confirm = typeof body.confirm === 'string' ? body.confirm : '';

  if (password !== confirm) return fail('Konfirmasi password tidak sama', 400);
  const problem = validatePassword(password, { login: pending.login, email: pending.email, name: pending.name });
  if (problem) return fail(problem, 400);

  try {
    const { active, user } = await createAccount(pending, password);
    registerFailure(key); // hitung hanya pendaftaran yang berhasil (batas 5 per 15 menit per IP)

    const res = NextResponse.json({ ok: true, active });
    res.cookies.set(PENDING_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 });
    if (active) {
      res.cookies.set(SESSION_COOKIE, await signSession(user), {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        path: '/',
        maxAge: SESSION_MAX_AGE,
      });
    }
    return res;
  } catch (e) {
    if (e instanceof RegistrationError) return fail('Akun GitHub ini sudah terdaftar. Silakan masuk.', 409);
    console.error('[register]', e);
    if (e instanceof SheetsConfigError || (e instanceof Error && e.message.includes('AUTH_SECRET'))) {
      return fail('Server belum dikonfigurasi (Google Sheets / AUTH_SECRET). Hubungi admin.', 500);
    }
    return fail('Gagal menyimpan akun ke Google Spreadsheet. Pastikan sheet dibagikan sebagai Editor ke service account.', 502);
  }
}
