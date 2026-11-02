import { hash } from 'bcryptjs';
import { config } from './config';
import { BCRYPT_COST } from './password';
import { appendUser, loadUsers } from './sheets';
import type { PendingRegistration, SessionUser } from './types';

export class RegistrationError extends Error {
  constructor(public code: 'exists', message: string) {
    super(message);
  }
}

/**
 * auto    = akun langsung aktif (username GitHub ada di GITHUB_ALLOWED_USERS, atau REGISTRATION_AUTO_APPROVE=true)
 * pending = akun dibuat nonaktif; admin mengubah kolom "aktif" menjadi TRUE untuk menyetujui
 */
export function registrationMode(): 'auto' | 'pending' {
  if (config.githubAllowedUsers.length > 0) return 'auto';
  return config.registrationAutoApprove ? 'auto' : 'pending';
}

/**
 * Buat akun baru: password di-hash dengan bcrypt (satu arah, bersalt, cost 12) lalu
 * dicatat sebagai baris baru di Google Spreadsheet. Password asli tidak pernah disimpan.
 */
export async function createAccount(p: PendingRegistration, password: string): Promise<{ active: boolean; user: SessionUser }> {
  const users = await loadUsers(true);
  if (users.some((u) => u.githubId === p.githubId || u.email === p.email)) {
    throw new RegistrationError('exists', 'Akun GitHub ini sudah terdaftar');
  }

  const passwordHash = await hash(password, BCRYPT_COST);
  const active = registrationMode() === 'auto';
  await appendUser({
    email: p.email,
    passwordHash,
    name: p.name,
    role: 'viewer',
    active,
    github: p.login,
    githubId: p.githubId,
  });
  return { active, user: { email: p.email, name: p.name, role: 'viewer', github: p.login } };
}
