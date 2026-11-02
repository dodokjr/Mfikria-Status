import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { STATUS_META, StatusBadge } from '@/components/StatusBadge';
import { isSignedIn } from '@/lib/viewer';
import type { ItemStatus } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Dokumentasi',
  description: 'Panduan pendaftaran, memakai dashboard, dan konfigurasi mfikria Status.',
};

export const dynamic = 'force-dynamic';

const TOC = [
  { id: 'pengenalan', label: 'Pengenalan' },
  { id: 'mulai-cepat', label: 'Mulai cepat: pendaftaran' },
  { id: 'password', label: 'Aturan password' },
  { id: 'dashboard', label: 'Memakai dashboard' },
  { id: 'status', label: 'Arti status' },
  { id: 'github', label: 'Project berdasarkan GitHub' },
  { id: 'peran', label: 'Peran dan persetujuan akun' },
  { id: 'admin', label: 'Panduan admin' },
  { id: 'keamanan', label: 'Keamanan' },
  { id: 'faq', label: 'Tanya jawab' },
];

const STATUS_DESC: Record<ItemStatus, string> = {
  operational: 'Deploy terakhir sukses dan URL merespons normal.',
  building: 'Deploy sedang dibangun atau mengantre.',
  failed: 'Deploy terakhir gagal.',
  down: 'URL tidak merespons (timeout atau HTTP 5xx). Dihitung walaupun deploy tampak sukses.',
  canceled: 'Deploy dibatalkan.',
  unknown: 'Status dari penyedia belum dikenali.',
  'no-deployment': 'Project belum pernah di-deploy.',
};

const ENV_ROWS: { name: string; note: string; required?: boolean }[] = [
  { name: 'AUTH_SECRET', note: 'Rahasia penanda sesi, minimal 32 karakter (openssl rand -base64 48)', required: true },
  { name: 'APP_URL', note: 'URL publik aplikasi, dipakai untuk callback OAuth GitHub', required: true },
  { name: 'GOOGLE_SHEET_ID', note: 'ID spreadsheet dari URL', required: true },
  { name: 'GOOGLE_SHEET_RANGE', note: 'Bawaan users!A2:H' },
  { name: 'GOOGLE_SERVICE_ACCOUNT_EMAIL', note: 'client_email dari key JSON service account', required: true },
  { name: 'GOOGLE_PRIVATE_KEY', note: 'private_key dari key JSON (\\n literal diperbolehkan)', required: true },
  { name: 'GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET', note: 'Dari GitHub OAuth App', required: true },
  { name: 'GITHUB_ALLOWED_USERS', note: 'Username GitHub yang diundang, dipisah koma. Jika diisi, hanya mereka yang bisa daftar dan langsung aktif' },
  { name: 'REGISTRATION_AUTO_APPROVE', note: 'true = akun baru langsung aktif (jika GITHUB_ALLOWED_USERS kosong). Bawaan false' },
  { name: 'APP_NAME', note: 'Kata kunci nama project untuk kartu utama. Bawaan mfikriaApp' },
  { name: 'APP_HEALTH_URL', note: 'URL health check langsung ke server (opsional)' },
  { name: 'VERCEL_TOKEN / VERCEL_TEAM_IDS', note: 'Token Vercel (boleh banyak) dan Team ID (kosong = akun personal)' },
  { name: 'NETLIFY_TOKEN', note: 'Token Netlify (boleh banyak)' },
  { name: 'CACHE_TTL', note: 'Detik cache data status. Bawaan 60' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-slate-800 pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-slate-300 [&_a]:text-indigo-300 [&_a:hover]:underline [&_li]:leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-100">{children}</code>;
}

function Callout({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const cls = tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200';
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export default async function DocsPage() {
  const signedIn = await isSignedIn();

  return (
    <div className="min-h-screen">
      <SiteHeader signedIn={signedIn} active="docs" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Daftar isi */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Daftar isi" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Daftar isi</p>
            <ul className="space-y-1 text-sm">
              {TOC.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="block rounded-md px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 space-y-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dokumentasi</h1>
            <p className="mt-2 text-slate-400">Panduan untuk pengguna dan admin mfikria Status.</p>
          </div>

          <Section id="pengenalan" title="Pengenalan">
            <p>
              mfikria Status adalah dashboard untuk memantau status server <strong>mfikriaApp</strong> dan project di <strong>Vercel</strong> maupun{' '}
              <strong>Netlify</strong>. Dashboard menampilkan status deploy terakhir, hasil cek HTTP langsung, latensi, serta commit dan branch terakhir.
            </p>
            <ul>
              <li>Daftar dan verifikasi identitas lewat <strong>GitHub</strong>.</li>
              <li>Anda membuat <strong>password baru</strong> khusus dashboard. Password disimpan terenkripsi (hash bcrypt).</li>
              <li>Data pengguna tercatat di <strong>Google Spreadsheet</strong> yang dikelola admin.</li>
              <li>Tampilan tersedia dalam mode <strong>terang dan gelap</strong>. Gunakan tombol matahari/bulan di bagian atas halaman.</li>
            </ul>
          </Section>

          <Section id="mulai-cepat" title="Mulai cepat: pendaftaran">
            <ol>
              <li>
                Buka <Link href="/register">halaman daftar</Link> lalu klik <strong>Daftar dengan GitHub</strong>.
              </li>
              <li>
                Di GitHub, setujui akses. Aplikasi hanya membaca <strong>username, nama, dan email terverifikasi</strong>. Password GitHub Anda tidak pernah dibagikan.
              </li>
              <li>
                Anda kembali ke aplikasi untuk <strong>membuat password baru</strong>. Anda punya 15 menit untuk menyelesaikan langkah ini.
              </li>
              <li>
                Setelah disimpan, akun Anda dicatat di Google Spreadsheet. Jika username Anda sudah diundang admin, Anda langsung masuk ke dashboard. Jika belum,
                tunggu admin mengaktifkan akun.
              </li>
              <li>
                Selanjutnya, <Link href="/login">masuk</Link> dengan <strong>email GitHub terverifikasi</strong> dan password baru tadi.
              </li>
            </ol>
            <Callout>Email untuk login adalah email utama terverifikasi di akun GitHub Anda, bukan username GitHub.</Callout>
          </Section>

          <Section id="password" title="Aturan password">
            <p>Password dashboard harus berbeda dari password GitHub Anda dan memenuhi aturan berikut:</p>
            <ul>
              <li>Minimal 10 karakter (maksimal 72 byte).</li>
              <li>Minimal 3 dari 4 jenis karakter: huruf kecil, huruf besar, angka, simbol.</li>
              <li>Tidak boleh memuat username, nama, atau bagian email GitHub Anda.</li>
              <li>Tidak boleh berupa password umum atau satu karakter yang diulang.</li>
            </ul>
            <Callout>
              Aplikasi tidak pernah melihat password GitHub Anda (OAuth memang menyembunyikannya), jadi perbedaannya tidak bisa dicek otomatis. Pastikan Anda
              memang memilih password yang baru.
            </Callout>
          </Section>

          <Section id="dashboard" title="Memakai dashboard">
            <ul>
              <li>
                <strong>Kartu mfikriaApp</strong>: status, kode HTTP, latensi, deploy terakhir, branch, commit, dan grafik latensi. Jika admin mengisi health
                check, ada kartu tambahan untuk cek langsung ke server.
              </li>
              <li>
                <strong>Ringkasan</strong>: jumlah project total, operasional, building, dan bermasalah.
              </li>
              <li>
                <strong>Tabel project</strong>: cari berdasarkan nama, filter berdasarkan provider dan status. Project bermasalah diurutkan paling atas.
              </li>
              <li>
                <strong>Auto-refresh</strong> setiap 30 detik. Data di server di-cache (bawaan 60 detik) agar tidak membebani API Vercel dan Netlify. Tombol Refresh
                oleh admin mengambil data terbaru langsung.
              </li>
            </ul>
          </Section>

          <Section id="status" title="Arti status">
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Artinya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(Object.keys(STATUS_META) as ItemStatus[]).map((s) => (
                    <tr key={s}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={s} />
                      </td>
                      <td className="px-4 py-3 text-slate-300">{STATUS_DESC[s]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-400">
              Project dengan perlindungan akses (HTTP 401/403) tetap dianggap hidup karena situsnya merespons.
            </p>
          </Section>

          <Section id="github" title="Project berdasarkan GitHub">
            <p>
              Daftar project mengikuti akun GitHub Anda: Anda hanya melihat project Vercel/Netlify yang <strong>repo GitHub-nya dimiliki username Anda</strong>.
              Kartu mfikriaApp selalu tampil untuk semua pengguna.
            </p>
            <ul>
              <li>Pencocokan memakai pemilik repo yang terhubung ke project (huruf besar/kecil diabaikan).</li>
              <li>Project di repo milik <strong>organisasi</strong> GitHub, atau yang di-deploy manual tanpa repo, tidak cocok dengan username pribadi.</li>
              <li>Admin memiliki tombol untuk beralih antara “Milik saya” dan “Semua” project.</li>
            </ul>
          </Section>

          <Section id="peran" title="Peran dan persetujuan akun">
            <ul>
              <li>
                <strong>viewer</strong>: peran bawaan. Melihat status project miliknya dan mfikriaApp.
              </li>
              <li>
                <strong>admin</strong>: melihat semua project, mengambil data terbaru (lewati cache), dan mengelola akun lewat spreadsheet.
              </li>
            </ul>
            <p>Cara akun baru diaktifkan bergantung pada konfigurasi admin:</p>
            <ul>
              <li>Username masuk daftar undangan (<Code>GITHUB_ALLOWED_USERS</Code>): hanya mereka yang bisa daftar, dan akun langsung aktif.</li>
              <li>
                Tanpa daftar undangan dan <Code>REGISTRATION_AUTO_APPROVE=false</Code> (bawaan): akun dibuat nonaktif sampai admin mengubah kolom <Code>aktif</Code>{' '}
                menjadi <Code>TRUE</Code>.
              </li>
            </ul>
          </Section>

          <Section id="admin" title="Panduan admin">
            <h3 className="text-lg font-semibold text-slate-100">1. Spreadsheet pengguna</h3>
            <p>
              Buat spreadsheet dengan tab <Code>users</Code> dan header di baris 1. Baris pendaftaran ditambahkan otomatis oleh aplikasi.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kolom</th>
                    <th className="px-4 py-3 font-medium">Isi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {[
                    ['A email', 'Email GitHub terverifikasi (huruf kecil), dipakai untuk login'],
                    ['B password_hash', 'Hash bcrypt, dibuat otomatis. Jangan diisi password asli'],
                    ['C nama', 'Nama dari profil GitHub'],
                    ['D role', 'viewer atau admin'],
                    ['E aktif', 'TRUE agar bisa masuk. Selain itu dianggap nonaktif'],
                    ['F github_login', 'Username GitHub, dipakai untuk menyaring project'],
                    ['G github_id', 'ID numerik GitHub, mencegah pendaftaran ganda'],
                    ['H terdaftar_pada', 'Waktu pendaftaran (UTC)'],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{k}</td>
                      <td className="px-4 py-3 text-slate-300">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul>
              <li>
                Bagikan spreadsheet ke email <strong>service account</strong> Google sebagai <strong>Editor</strong> (aplikasi menulis baris registrasi).
              </li>
              <li>
                Setujui akun: ubah <Code>aktif</Code> menjadi <Code>TRUE</Code>. Cabut akses: ubah menjadi <Code>FALSE</Code>. Berlaku dalam hitungan detik, termasuk
                untuk sesi yang sedang berjalan.
              </li>
              <li>
                Jadikan admin: ubah <Code>role</Code> menjadi <Code>admin</Code>. Admin pertama: daftar lewat GitHub, lalu ubah dua kolom itu di spreadsheet.
              </li>
            </ul>

            <h3 className="pt-2 text-lg font-semibold text-slate-100">2. GitHub OAuth App</h3>
            <p>
              Buat di GitHub &gt; Settings &gt; Developer settings &gt; OAuth Apps. Isi <strong>Authorization callback URL</strong> dengan{' '}
              <Code>{'{APP_URL}'}/api/auth/github/callback</Code>, lalu salin Client ID dan Client secret.
            </p>

            <h3 className="pt-2 text-lg font-semibold text-slate-100">3. Variabel environment</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Variabel</th>
                    <th className="px-4 py-3 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {ENV_ROWS.map((r) => (
                    <tr key={r.name}>
                      <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs">
                        {r.name}
                        {r.required && <span className="ml-1.5 rounded bg-rose-500/15 px-1 py-0.5 text-[10px] font-semibold text-rose-300">wajib</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-400">
              Pencocokan kartu utama: project Vercel/Netlify yang namanya <em>mengandung</em> <Code>APP_NAME</Code> (huruf besar/kecil dan tanda hubung diabaikan).
            </p>
          </Section>

          <Section id="keamanan" title="Keamanan">
            <ul>
              <li>Password di-hash dengan bcrypt (cost 12, bersalt, satu arah). Password asli tidak pernah disimpan atau dicatat.</li>
              <li>Pendaftaran memakai OAuth dengan <Code>state</Code> acak di cookie HttpOnly sebagai perlindungan CSRF. Token GitHub langsung dibuang setelah profil dibaca.</li>
              <li>Sesi memakai cookie HttpOnly yang berlaku 8 jam. Login dibatasi 5 kali gagal per 15 menit per IP dan email.</li>
              <li>Data ditulis ke spreadsheet dalam mode mentah sehingga tidak dieksekusi sebagai formula.</li>
              <li>Pembatasan project per akun GitHub dilakukan di server, bukan hanya di tampilan.</li>
            </ul>
            <Callout tone="warn">Batasi siapa yang boleh membuka atau mengedit spreadsheet. Isinya (email dan hash password) bersifat sensitif.</Callout>
          </Section>

          <Section id="faq" title="Tanya jawab">
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-slate-100">Saya sudah daftar tapi tidak bisa masuk.</h3>
                <p className="mt-1">Kemungkinan akun belum diaktifkan. Minta admin mengubah kolom <Code>aktif</Code> menjadi <Code>TRUE</Code>. Pastikan juga Anda login dengan email GitHub terverifikasi, bukan username.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Project saya tidak muncul di tabel.</h3>
                <p className="mt-1">Periksa apakah repo project dimiliki username GitHub Anda (bukan organisasi), terhubung ke Vercel/Netlify, dan token admin punya akses ke project itu. Admin bisa melihat semua project lewat tombol “Semua”.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Apakah password GitHub saya bisa dilihat aplikasi?</h3>
                <p className="mt-1">Tidak. Login GitHub berjalan di situs GitHub. Aplikasi hanya menerima username, nama, dan email terverifikasi.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Saya lupa password dashboard.</h3>
                <p className="mt-1">
                  Belum ada fitur reset mandiri. Minta admin membuat hash baru dengan <Code>npm run hash -- &quot;passwordBaru&quot;</Code> dan mengganti nilai di
                  kolom <Code>password_hash</Code>, lalu segera ganti ke password pilihan Anda sendiri.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Muncul “Sesi pendaftaran habis”.</h3>
                <p className="mt-1">Langkah membuat password dibatasi 15 menit. Mulai lagi dari <Link href="/register">halaman daftar</Link>.</p>
              </div>
            </div>
          </Section>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
            <p className="font-medium">Siap mencoba?</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {signedIn ? (
                <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
                  Buka dashboard
                </Link>
              ) : (
                <>
                  <a href="/register" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
                    Daftar dengan GitHub
                  </a>
                  <Link href="/login" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800">
                    Masuk
                  </Link>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
