import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthTopBar } from '@/components/AuthTopBar';
import { GithubIcon } from '@/components/GithubIcon';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  github_not_configured: 'Registrasi GitHub belum dikonfigurasi di server. Hubungi admin.',
  github_denied: 'Otorisasi GitHub dibatalkan.',
  state: 'Sesi otorisasi tidak valid atau kedaluwarsa. Coba lagi.',
  not_allowed: 'Akun GitHub ini tidak diizinkan untuk mendaftar.',
  expired: 'Sesi pendaftaran habis. Mulai lagi dari GitHub.',
  failed: 'Pendaftaran dengan GitHub gagal. Coba lagi nanti.',
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect('/dashboard');
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS.failed) : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AuthTopBar />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold shadow-lg shadow-indigo-900/40">
            m
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Daftar akun</h1>
          <p className="mt-1 text-sm text-slate-400">Verifikasi dengan GitHub, lalu buat password baru</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
          {message && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {message}
            </p>
          )}

          {/* Link biasa (bukan next/link) agar browser melakukan navigasi penuh ke route handler OAuth */}
          <a
            href="/api/auth/github"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#24292f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#32383f]"
          >
            <GithubIcon />
            Daftar dengan GitHub
          </a>

          <ul className="space-y-1.5 text-xs text-slate-500">
            <li>• Kami hanya membaca username, nama, dan email terverifikasi GitHub Anda.</li>
            <li>• Password GitHub tidak pernah dibagikan ke aplikasi ini.</li>
            <li>• Anda akan membuat password baru khusus dashboard, disimpan terenkripsi (hash bcrypt).</li>
          </ul>
          <p className="text-xs text-slate-500">
            Belum yakin? Baca{' '}
            <Link href="/docs#mulai-cepat" className="text-indigo-300 hover:underline">
              panduan pendaftaran
            </Link>
            .
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-indigo-300 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
