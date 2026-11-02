// Komponen server (tanpa 'use client'): kliknya ditangani handler global di ThemeScript
// lewat atribut data-theme-toggle, jadi tidak perlu menunggu hydrasi React.
export function ThemeToggle({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      data-theme-toggle=""
      aria-label="Ganti mode terang/gelap"
      title="Ganti mode terang/gelap"
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 ${className}`}
    >
      {/* Matahari: tampil saat gelap */}
      <svg className="theme-sun h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      {/* Bulan: tampil saat terang */}
      <svg className="theme-moon h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
      </svg>
    </button>
  );
}