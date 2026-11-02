import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
        <p>© {new Date().getFullYear()} mfikria Status</p>
        <nav className="flex gap-5" aria-label="Tautan footer">
          <Link href="/docs" className="hover:text-slate-200">
            Dokumentasi
          </Link>
          <Link href="/login" className="hover:text-slate-200">
            Masuk
          </Link>
          <Link href="/register" className="hover:text-slate-200">
            Daftar
          </Link>
        </nav>
      </div>
    </footer>
  );
}
