'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PasswordToggle } from './PasswordToggle';

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Login gagal');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold shadow-lg shadow-indigo-900/40">
          m
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">mfikria Status</h1>
        <p className="mt-1 text-sm text-slate-400">Masuk untuk melihat status server</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-3 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <PasswordToggle targets="password" />
          </div>
        </div>

        {notice && !error && (
          <p className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">{notice}</p>
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
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Belum punya akun?{' '}
        <Link href="/register" className="text-indigo-300 hover:underline">
          Daftar dengan GitHub
        </Link>
      </p>
    </div>
  );
}