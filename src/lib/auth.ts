import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { BCRYPT_COST } from './password';
import { loadUsers } from './sheets';
import { SESSION_COOKIE, verifySession } from './session';
import type { SessionUser } from './types';

const normalize = (s: string) => s.trim().toLowerCase();

// Hash dummy dengan cost yang sama dengan hash asli, agar waktu respons sama saat email tidak ditemukan.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hash(`dummy-${Math.random().toString(36).slice(2)}`, BCRYPT_COST));

async function safeCompare(password: string, hashed: string): Promise<boolean> {
  try {
    return await compare(password, hashed);
  } catch {
    return false; // hash di spreadsheet rusak / bukan bcrypt
  }
}

/** Cocokkan email + password dengan daftar user di Google Spreadsheet. */
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const target = normalize(email);
  const users = await loadUsers();
  const user = users.find((u) => normalize(u.email) === target);
  const valid = await safeCompare(password, user?.passwordHash?.trim() || (await getDummyHash()));
  const ok = !!user && valid && user.active;

  if (!ok && process.env.NODE_ENV !== 'production') {
    const reason = !user
      ? 'email tidak ditemukan di sheet'
      : !valid
        ? 'password tidak cocok (atau kolom hash bukan bcrypt)'
        : 'akun tidak aktif';
    console.warn(`[auth] gagal login ${target}: ${reason}`);
  }

  if (!ok || !user) return null;
  return { email: user.email, name: user.name, role: user.role, ...(user.github ? { github: user.github } : {}) };
}

/**
 * Sesi saat ini (untuk server component & route handler).
 * Selain memverifikasi cookie, memastikan user masih aktif di spreadsheet,
 * sehingga mengubah kolom "aktif" menjadi FALSE langsung mencabut akses.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const user = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!user) return null;
  try {
    const current = (await loadUsers()).find((u) => normalize(u.email) === normalize(user.email));
    if (!current || !current.active) return null;
    return { email: current.email, name: current.name, role: current.role, ...(current.github ? { github: current.github } : {}) };
  } catch {
    // Spreadsheet sedang tidak terbaca: pakai sesi yang masih valid agar dashboard tidak ikut mati.
    return user;
  }
}