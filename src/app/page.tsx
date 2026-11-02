import Link from 'next/link';
import { GithubIcon } from '@/components/GithubIcon';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { isSignedIn } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    title: 'Status Vercel & Netlify',
    body: 'Satu tampilan untuk status deploy terakhir dan cek HTTP langsung ke setiap project Vercel dan site Netlify.',
    icon: 'M3 12h4l3 8 4-16 3 8h4',
  },
  {
    title: 'Kartu khusus mfikriaApp',
    body: 'Status, kode HTTP, latensi, commit, branch, dan grafik latensi mini untuk server utama Anda, plus health check opsional.',
    icon: 'M4 6h16M4 12h16M4 18h10',
  },
  {
    title: 'Daftar dengan GitHub',
    body: 'Verifikasi identitas lewat GitHub OAuth. Password GitHub tidak pernah dibagikan ke aplikasi ini.',
    icon: 'M12 2a10 10 0 00-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.46-1.1-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.9.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 015 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z',
  },
  {
    title: 'Project sesuai akun GitHub',
    body: 'Anda hanya melihat project yang repo GitHub-nya milik username Anda. Admin bisa beralih ke tampilan semua project.',
    icon: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0',
  },
  {
    title: 'Password terenkripsi',
    body: 'Anda membuat password baru khusus dashboard. Disimpan sebagai hash bcrypt satu arah, password asli tidak pernah disimpan.',
    icon: 'M6 10V8a6 6 0 1112 0v2M5 10h14v11H5z',
  },
  {
    title: 'Akun di Google Spreadsheet',
    body: 'Daftar pengguna tercatat di spreadsheet yang Anda kelola. Cabut akses cukup dengan mengubah satu kolom.',
    icon: 'M4 4h16v16H4zM4 10h16M10 4v16',
  },
];

const STEPS = [
  { title: 'Daftar dengan GitHub', body: 'Klik “Daftar dengan GitHub” dan setujui akses baca profil dan email.' },
  { title: 'Buat password baru', body: 'Pilih password khusus dashboard. Jangan memakai password GitHub Anda.' },
  { title: 'Menunggu persetujuan', body: 'Akun baru dicatat di spreadsheet. Admin mengaktifkannya, kecuali username Anda sudah diundang.' },
  { title: 'Pantau dashboard', body: 'Masuk dengan email dan password, lalu lihat status project Anda dan mfikriaApp.' },
];

const SECURITY = [
  'Hash bcrypt (cost 12) dengan salt, satu arah',
  'Cookie sesi HttpOnly, berlaku 8 jam',
  'OAuth dengan state acak (anti-CSRF)',
  'Pembatas percobaan login',
  'Akses dicabut seketika dari spreadsheet',
  'Data project dibatasi di sisi server',
];

export default async function HomePage() {
  const signedIn = await isSignedIn();

  return (
    <div className="min-h-screen">
      <SiteHeader signedIn={signedIn} active="home" />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-48 left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-medium text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Dashboard status untuk Vercel &amp; Netlify
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Pantau status server <span className="text-indigo-300">mfikriaApp</span> dalam satu tempat
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-400">
                Lihat apakah project Anda berjalan normal, sedang build, atau bermasalah, lengkap dengan latensi dan deploy terakhir. Cukup daftar dengan
                GitHub.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {signedIn ? (
                  <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
                    Buka dashboard
                  </Link>
                ) : (
                  <a
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#24292f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#32383f]"
                  >
                    <GithubIcon />
                    Daftar dengan GitHub
                  </a>
                )}
                <Link href="/docs" className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
                  Baca dokumentasi
                </Link>
              </div>
              {!signedIn && (
                <p className="mt-4 text-sm text-slate-500">
                  Sudah punya akun?{' '}
                  <Link href="/login" className="text-indigo-300 hover:underline">
                    Masuk
                  </Link>
                </p>
              )}
            </div>

            {/* Contoh tampilan (statis, bukan data nyata) */}
            <div aria-label="Contoh tampilan dashboard" className="relative">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Status mfikriaApp</p>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                    Semua sistem normal
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Vercel</p>
                      <p className="font-semibold">mfikriaapp</p>
                      <p className="text-sm text-indigo-300">mfikriaapp.com ↗</p>
                    </div>
                    <StatusBadge status="operational" />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">HTTP</dt>
                      <dd className="font-medium">200</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Latensi</dt>
                      <dd className="font-medium">124 ms</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Deploy</dt>
                      <dd className="font-medium">2 jam lalu</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex h-8 items-end gap-0.5" aria-hidden="true">
                    {[40, 55, 35, 60, 45, 70, 50, 42, 58, 38, 52, 47, 65, 40, 48, 36].map((h, i) => (
                      <div key={i} className="w-1.5 rounded-sm bg-emerald-400/70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    { n: 'blog-pribadi', p: 'Netlify', s: 'operational' as const },
                    { n: 'landing-promo', p: 'Vercel', s: 'building' as const },
                    { n: 'api-lama', p: 'Vercel', s: 'failed' as const },
                  ].map((r) => (
                    <div key={r.n} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2">
                      <div>
                        <p className="font-medium">{r.n}</p>
                        <p className="text-xs text-slate-500">{r.p}</p>
                      </div>
                      <StatusBadge status={r.s} />
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">Contoh tampilan, bukan data nyata</p>
            </div>
          </div>
        </section>

        {/* Fitur */}
        <section id="fitur" className="scroll-mt-20 border-t border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">Apa yang Anda dapatkan</h2>
            <p className="mt-2 max-w-2xl text-slate-400">Dibuat untuk memantau server pribadi atau tim kecil tanpa harus membuka dashboard Vercel dan Netlify satu per satu.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-400">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="scroll-mt-20 border-t border-slate-800 bg-slate-900/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">Cara kerja</h2>
            <p className="mt-2 max-w-2xl text-slate-400">Empat langkah dari pendaftaran sampai memantau status.</p>
            <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">{i + 1}</span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-400">{s.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-slate-500">
              Detail lengkap ada di{' '}
              <Link href="/docs#mulai-cepat" className="text-indigo-300 hover:underline">
                dokumentasi
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Keamanan */}
        <section className="border-t border-slate-800">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Aman sejak awal</h2>
              <p className="mt-2 text-slate-400">
                Password Anda di-hash sebelum disimpan sehingga tidak bisa dibaca kembali, bahkan oleh admin. Akses ke data project dibatasi di server, bukan hanya
                disembunyikan di tampilan.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SECURITY.map((t) => (
                <li key={t} className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
                  <span className="mt-0.5 text-emerald-300" aria-hidden="true">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        {!signedIn && (
          <section className="border-t border-slate-800">
            <div className="mx-auto max-w-6xl px-4 py-16 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Siap memantau server Anda?</h2>
              <p className="mx-auto mt-2 max-w-xl text-slate-400">Pendaftaran hanya butuh akun GitHub dan satu password baru.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#24292f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#32383f]"
                >
                  <GithubIcon />
                  Daftar dengan GitHub
                </a>
                <Link href="/docs" className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
                  Lihat dokumentasi
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
