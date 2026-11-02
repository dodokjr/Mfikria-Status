import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

/** Bilah atas untuk halaman login/registrasi: kembali ke beranda + toggle tema. */
export function AuthTopBar() {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4">
      <Link href="/" className="text-sm text-slate-400 transition hover:text-slate-100">
        ← Beranda
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/docs" className="text-sm text-slate-400 transition hover:text-slate-100">
          Dokumentasi
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
