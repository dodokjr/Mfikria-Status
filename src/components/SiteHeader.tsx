import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader({ signedIn, active }: { signedIn: boolean; active?: 'home' | 'docs' }) {
  const link = (on: boolean) => `text-sm transition hover:text-slate-100 ${on ? 'text-slate-100' : 'text-slate-400'}`;
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">m</span>
          <span className="text-sm font-semibold">mfikria Status</span>
        </Link>

        <nav className="flex items-center gap-5" aria-label="Navigasi utama">
          <Link href="/#fitur" className={`hidden md:inline ${link(false)}`}>
            Fitur
          </Link>
          <Link href="/#cara-kerja" className={`hidden md:inline ${link(false)}`}>
            Cara kerja
          </Link>
          <Link href="/docs" className={link(active === 'docs')}>
            Dokumentasi
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
              Buka dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg border border-slate-700 px-3.5 py-2 text-sm text-slate-300 transition hover:bg-slate-800 sm:inline">
                Masuk
              </Link>
              <Link href="/register" className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
