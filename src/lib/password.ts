/** Cost bcrypt untuk semua hash password (2^12 putaran). */
export const BCRYPT_COST = 12;

const COMMON = ['password', 'passw0rd', 'qwerty', 'letmein', 'welcome', 'iloveyou', 'abc123', '12345678', 'admin123'];

export interface PasswordContext {
  login: string;
  email: string;
  name: string;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Validasi password baru. Mengembalikan pesan error, atau null jika lolos.
 * Catatan: password GitHub tidak pernah terlihat oleh aplikasi ini (OAuth), jadi
 * "berbeda dari GitHub" ditegakkan dengan menolak password yang memuat identitas GitHub user.
 */
export function validatePassword(pw: string, ctx: PasswordContext): string | null {
  if (pw.length < 10) return 'Password minimal 10 karakter';
  if (new TextEncoder().encode(pw).length > 72) return 'Password terlalu panjang (maksimal 72 byte)';

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3) return 'Gunakan minimal 3 jenis karakter: huruf kecil, huruf besar, angka, simbol';
  if (/^(.)\1+$/.test(pw)) return 'Password tidak boleh satu karakter yang diulang';

  const flat = squash(pw);
  const personal = [ctx.login, ctx.email.split('@')[0] ?? '', ...ctx.name.split(/\s+/)].map(squash).filter((s) => s.length >= 4);
  if (personal.some((s) => flat.includes(s))) return 'Password tidak boleh memuat username, email, atau nama GitHub Anda';
  if (COMMON.some((c) => flat.includes(c))) return 'Password terlalu umum, pilih yang lebih unik';
  return null;
}
