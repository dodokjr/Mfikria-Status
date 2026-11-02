'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PasswordToggle } from './PasswordToggle';

interface Props {
  profile: { login: string; name: string; email: string };
  autoApprove: boolean;
}

export function RegisterPasswordForm({ profile, autoApprove }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Konfirmasi password tidak sama');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; active?: boolean };
      if (!res.ok) {
        setError(json.error ?? 'Pendaftaran gagal');
        if (res.status === 401) setTimeout(() => router.replace('/register?error=expired'), 1500);
        return;
      }
      if (json.active) {
        router.replace('/dashboard');
        router.refresh();
      } else {
        setPendingApproval(true);
      }
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  const input =
    'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30';

  if (pendingApproval) {
    return (
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-xl text-emerald-300">✓</div>
        <h1 className="text-lg font-semibold">Pendaftaran berhasil</h1>
        <p className="mt-2 text-sm text-slate-400">
          Akun <span className="text-slate-200">@{profile.login}</span> sudah tercatat di Google Spreadsheet dan menunggu persetujuan admin. Anda bisa
          masuk setelah akun diaktifkan.
        </p>
        <Link href="/login" className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500">
          Ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Buat password</h1>
        <p className="mt-1 text-sm text-slate-400">Langkah terakhir pendaftaran</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://github.com/${encodeURIComponent(profile.login)}.png?size=80`}
            alt=""
            width={40}
            height={40}
            referrerPolicy="no-referrer"
            className="h-10 w-10 rounded-full ring-1 ring-slate-700"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="truncate text-xs text-slate-500">
              @{profile.login} · {profile.email}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
            Password baru
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${input} pr-16`}
            />
            <PasswordToggle targets="password,confirm" />
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-300">
            Ulangi password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
        </div>

        <ul className="space-y-1 text-xs text-slate-500">
          <li>• Buat password baru. Jangan pakai password GitHub Anda.</li>
          <li>• Minimal 10 karakter, kombinasi 3 dari: huruf kecil, besar, angka, simbol.</li>
          <li>• Tidak boleh memuat username, nama, atau email GitHub Anda.</li>
          <li>• Disimpan sebagai hash bcrypt; password asli tidak pernah disimpan.</li>
        </ul>

        {!autoApprove && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Akun baru perlu disetujui admin sebelum bisa dipakai masuk.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Menyimpan…' : 'Selesaikan pendaftaran'}
        </button>
      </form>
    </div>
  );
}