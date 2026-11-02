// Tombol tampilkan/sembunyikan password. `targets` = id input yang dikontrol, dipisah koma.
// Komponen server: kliknya ditangani handler global di ThemeScript (data-password-toggle),
// dan label berganti lewat CSS dari atribut aria-pressed, tanpa state React.
export function PasswordToggle({ targets }: { targets: string }) {
    return (
      <button
        type="button"
        data-password-toggle={targets}
        aria-pressed="false"
        aria-label="Tampilkan atau sembunyikan password"
        className="absolute inset-y-0 right-0 cursor-pointer px-3 text-xs font-medium text-slate-400 hover:text-slate-200"
      >
        <span className="pw-label-show">Tampil</span>
        <span className="pw-label-hide">Sembunyi</span>
      </button>
    );
  }