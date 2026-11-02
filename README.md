# mfikria Status Dashboard

Dashboard admin (Next.js 15 + TypeScript + Tailwind CSS 4) untuk memantau status server **mfikriaApp** dan project Vercel/Netlify. Registrasi lewat **GitHub**, akun dan password (hash bcrypt) disimpan di **Google Spreadsheet**.

## Fitur

- Halaman publik sebelum registrasi: pengenalan di `/` dan dokumentasi lengkap di `/docs` (panduan pengguna + admin, arti status, FAQ)
- Mode **terang dan gelap** di semua halaman: mengikuti pengaturan sistem pada kunjungan pertama, bisa diganti dengan tombol matahari/bulan, pilihan diingat di browser, tanpa kilatan saat halaman dimuat
- Kartu status mfikriaApp: status deploy, HTTP, latensi, deploy terakhir, branch, commit, grafik latensi mini; opsional health check langsung (`APP_HEALTH_URL`)
- Registrasi dengan GitHub (OAuth), lalu user membuat password baru khusus dashboard
- Password disimpan sebagai hash bcrypt (cost 12, bersalt, satu arah). Password asli tidak pernah disimpan atau dicatat
- Tabel project mengikuti nama GitHub: user hanya melihat project Vercel/Netlify yang repo GitHub-nya milik username-nya. Admin bisa beralih ke "Semua"
- Login email + password, sesi cookie HttpOnly 8 jam, pembatas percobaan login
- Mencabut akses: ubah kolom `aktif` di spreadsheet menjadi `FALSE`

## Alur registrasi

1. User buka `/register`, klik **Daftar dengan GitHub**, dan menyetujui OAuth (scope `read:user user:email`).
2. Server mengambil id, username, nama, dan email terverifikasi GitHub. Token GitHub langsung dibuang, tidak disimpan.
3. User membuat **password baru** di `/register/password` (batas waktu 15 menit).
4. Server meng-hash password dengan bcrypt, lalu menambahkan satu baris ke Google Spreadsheet.
5. Jika akun langsung aktif, user otomatis masuk ke dashboard. Jika tidak, user menunggu admin mengubah kolom `aktif` menjadi `TRUE`.

Aturan password: minimal 10 karakter, minimal 3 dari 4 jenis karakter (huruf kecil, besar, angka, simbol), tidak boleh memuat username/nama/email GitHub, dan bukan password umum.

> Password GitHub tidak pernah terlihat oleh aplikasi (OAuth), jadi "berbeda dari password GitHub" tidak bisa dibandingkan langsung. Yang ditegakkan: user diminta membuat password baru dan password yang memuat identitas GitHub-nya ditolak.

Persetujuan akun baru:
- `GITHUB_ALLOWED_USERS` diisi: hanya username di daftar itu yang bisa daftar, dan akunnya langsung aktif.
- Kosong dan `REGISTRATION_AUTO_APPROVE=true`: siapa pun langsung aktif (tidak disarankan untuk dashboard internal).
- Kosong dan `REGISTRATION_AUTO_APPROVE=false` (default): akun dibuat nonaktif, admin menyetujui di spreadsheet.

## 1. Siapkan Google Spreadsheet

1. Buat spreadsheet baru, ganti nama tab menjadi **users**, isi header di baris 1:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| email | password_hash | nama | role | aktif | github_login | github_id | terdaftar_pada |

   Baris registrasi ditambahkan otomatis oleh aplikasi. Role default `viewer`. Untuk menjadikan seseorang admin, ubah kolom `role` menjadi `admin`.
2. Akun admin pertama: daftar dulu lewat GitHub, lalu ubah `role` menjadi `admin` dan `aktif` menjadi `TRUE` di spreadsheet. Atau isi baris manual dengan hash dari `npm run hash -- "passwordmu"`.
3. Di [Google Cloud Console](https://console.cloud.google.com): aktifkan **Google Sheets API**, buat **Service Account**, buat key **JSON**.
4. Di spreadsheet, klik **Share** dan beri akses **Editor** (bukan Viewer, karena aplikasi menulis baris registrasi) ke email service account.
5. Salin `client_email` dan `private_key` ke env. ID spreadsheet ada di URL: `docs.google.com/spreadsheets/d/<ID>/edit`.

## 2. Buat GitHub OAuth App

[github.com/settings/developers](https://github.com/settings/developers) > **New OAuth App**:
- Homepage URL: `APP_URL`
- Authorization callback URL: `APP_URL/api/auth/github/callback`

Salin Client ID dan buat Client secret, isi ke `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET`. Untuk pengembangan lokal pakai `APP_URL=http://localhost:3000` dan callback localhost.

## 3. Konfigurasi dan jalankan

```bash
cp .env.example .env.local   # isi nilainya
npm install
npm run dev                  # http://localhost:3000
# produksi
npm run build && npm start
```

Variabel penting: `AUTH_SECRET` (min. 32 karakter, `openssl rand -base64 48`), `APP_URL`, `GOOGLE_*`, `GITHUB_CLIENT_ID/SECRET`, `VERCEL_TOKEN` dan/atau `NETLIFY_TOKEN`, `APP_NAME`. Daftar lengkap di `.env.example`.

## Project per nama GitHub

- **Vercel:** dari `link.org` pada project yang terhubung ke repo GitHub.
- **Netlify:** dari `build_settings.repo_url` / `repo_path` site.
- Project tanpa repo GitHub (deploy manual/CLI) tidak punya pemilik yang bisa dicocokkan, jadi hanya tampil di mode "Semua" (admin).
- Project di repo milik **organisasi** GitHub tidak cocok dengan username pribadi. Untuk itu admin memakai mode "Semua".
- Kartu mfikriaApp (`APP_NAME`) selalu tampil untuk semua user yang login.
- Pembatasan dilakukan di server (`/api/status`), bukan hanya di tampilan.

## Deploy ke Vercel

Import repo ke Vercel, isi semua variabel dari `.env.example` di Project Settings > Environment Variables, lalu deploy. Untuk `GOOGLE_PRIVATE_KEY`, tempel isi `private_key` apa adanya (boleh dengan `\n` literal).

## Struktur

```
src/
  middleware.ts                      tolak request tanpa sesi (dashboard & /api/status)
  app/
    page.tsx                         pengenalan (landing) publik
    docs/                            dokumentasi publik
    login/  register/  register/password/   halaman publik
    globals.css                      tema terang/gelap (data-theme di <html>)
    dashboard/                         dashboard admin
    api/auth/{login,logout,register}/  autentikasi
    api/auth/github/{,callback}/       OAuth GitHub
    api/status/                        JSON status (butuh login, di-scope per GitHub)
  lib/
    github.ts, registration.ts, password.ts   registrasi + validasi + bcrypt
    sheets.ts, sheetRows.ts            baca/tulis user di Google Sheets (service account)
    auth.ts, session.ts                verifikasi bcrypt + sesi JWT (jose)
    providers/{vercel,netlify}.ts, status.ts   pengumpul status, cache, scope
```

## Tema terang/gelap

Gelap adalah bawaan: seluruh komponen ditulis memakai palet `slate` Tailwind. Mode terang diterapkan di `globals.css` dengan membalik skala `slate` dan menggelapkan warna aksen (`indigo/emerald/amber/rose/red` 200-300) lewat atribut `data-theme="light"` pada `<html>`. Jadi komponen baru cukup memakai kelas yang sama dan otomatis ikut kedua tema. Untuk warna yang tidak boleh berubah (mis. tombol GitHub) pakai nilai eksplisit seperti `bg-[#24292f]`.

## Catatan keamanan

- OAuth memakai `state` acak di cookie HttpOnly (anti-CSRF). Token registrasi sementara berlaku 15 menit dan hanya diterbitkan setelah GitHub memverifikasi identitas.
- Nilai ditulis ke Sheets dengan mode `RAW`, jadi tidak dieksekusi sebagai formula spreadsheet.
- Batasi siapa yang boleh membuka/mengedit spreadsheet. Isinya (hash bcrypt, email) sensitif.
- Pembatas login/registrasi bersifat in-memory per instance. Di serverless (Vercel) batas ini tidak dibagi antar instance; untuk perlindungan lebih kuat pakai penyimpanan bersama seperti Upstash Redis.
- Jika Google Sheets sedang tidak bisa dibaca, user yang sudah login tetap bisa memakai dashboard sampai sesinya habis, tetapi login dan registrasi baru gagal.
- Rotasi `AUTH_SECRET` akan mengeluarkan semua user.
# Mfikria-Status
