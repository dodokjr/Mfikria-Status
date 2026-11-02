import type { Role } from './types';

export interface SheetUser {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  active: boolean;
  github: string;
  githubId: string;
}

export type NewUser = SheetUser;

export interface SkippedRow {
  row: number; // urutan baris dalam range yang dibaca (1 = baris pertama range)
  reason: string;
}

export interface ParseResult {
  users: SheetUser[];
  skipped: SkippedRow[];
  usedHeader: boolean;
}

type Field = 'email' | 'passwordHash' | 'name' | 'role' | 'active' | 'github' | 'githubId';

// Kolom "aktif" harus berisi salah satu nilai ini; selain itu dianggap nonaktif (default-deny).
const TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'ya', 'aktif', 'active']);

// Urutan default bila sheet tidak punya baris header: A..G (H terdaftar_pada diabaikan).
const DEFAULT_ORDER: Field[] = ['email', 'passwordHash', 'name', 'role', 'active', 'github', 'githubId'];

// Nama header yang dikenali (sudah dinormalisasi: huruf kecil, tanpa simbol/spasi).
const ALIASES: Record<Field, string[]> = {
  email: ['email', 'surel', 'emailaddress'],
  passwordHash: ['passwordhash', 'password', 'hash', 'katasandi'],
  name: ['nama', 'name'],
  role: ['role', 'peran'],
  active: ['aktif', 'active', 'status'],
  github: ['githublogin', 'github', 'githubusername'],
  githubId: ['githubid'],
};

const clean = (c: unknown) => String(c ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Cari baris header; kembalikan peta field -> indeks kolom, atau null bila bukan header. */
function detectHeader(row: string[]): Partial<Record<Field, number>> | null {
  const map: Partial<Record<Field, number>> = {};
  row.forEach((cell, i) => {
    const n = norm(cell);
    if (!n || cell.includes('@')) return;
    for (const field of Object.keys(ALIASES) as Field[]) {
      if (map[field] === undefined && ALIASES[field].includes(n)) map[field] = i;
    }
  });
  return map.email !== undefined && map.passwordHash !== undefined ? map : null;
}

/** Ubah baris mentah dari Sheets API menjadi daftar user, lengkap dengan laporan baris yang dilewati. */
export function parseUserRowsDetailed(values: unknown): ParseResult {
  const result: ParseResult = { users: [], skipped: [], usedHeader: false };
  if (!Array.isArray(values)) return result;

  const rows = values.filter(Array.isArray).map((r) => (r as unknown[]).map(clean));
  let columns: Partial<Record<Field, number>> = Object.fromEntries(DEFAULT_ORDER.map((f, i) => [f, i]));
  let start = 0;

  if (rows.length > 0) {
    const header = detectHeader(rows[0]!);
    if (header) {
      columns = header;
      start = 1;
      result.usedHeader = true;
    }
  }

  const seen = new Set<string>();
  for (let i = start; i < rows.length; i++) {
    const row = rows[i]!;
    const get = (f: Field) => (columns[f] === undefined ? '' : (row[columns[f]!] ?? ''));
    const rowNo = i + 1;

    if (row.every((c) => !c)) continue; // baris kosong, abaikan tanpa laporan

    const email = get('email').toLowerCase();
    const hash = get('passwordHash');
    if (!email) {
      result.skipped.push({ row: rowNo, reason: 'kolom email kosong' });
      continue;
    }
    if (!email.includes('@')) {
      result.skipped.push({ row: rowNo, reason: `"${email}" bukan email (urutan kolom salah?)` });
      continue;
    }
    if (!hash) {
      result.skipped.push({ row: rowNo, reason: `${email}: password_hash kosong` });
      continue;
    }
    if (seen.has(email)) {
      result.skipped.push({ row: rowNo, reason: `${email}: duplikat` });
      continue;
    }
    seen.add(email);

    result.users.push({
      email,
      passwordHash: hash,
      name: get('name') || email,
      role: get('role').toLowerCase() === 'admin' ? 'admin' : 'viewer',
      active: TRUE_VALUES.has(get('active').toLowerCase()),
      github: get('github').replace(/^@/, ''),
      githubId: get('githubId'),
    });
  }
  return result;
}

/** Versi sederhana: hanya daftar user. */
export function parseUserRows(values: unknown): SheetUser[] {
  return parseUserRowsDetailed(values).users;
}

/** Susun satu baris baru (A..H) untuk ditambahkan ke spreadsheet. */
export function buildUserRow(u: NewUser, now: Date = new Date()): string[] {
  return [
    u.email.toLowerCase(),
    u.passwordHash,
    u.name,
    u.role,
    u.active ? 'TRUE' : 'FALSE',
    u.github,
    u.githubId,
    now.toISOString(),
  ];
}