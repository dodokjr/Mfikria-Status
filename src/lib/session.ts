// Aman dipakai di middleware (Edge runtime): hanya bergantung pada `jose`.
import { SignJWT, jwtVerify } from 'jose';
import type { PendingRegistration, SessionUser } from './types';

export const SESSION_COOKIE = 'mfikria_session';
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 jam

export const PENDING_COOKIE = 'mfikria_pending';
export const PENDING_MAX_AGE = 60 * 15; // 15 menit untuk menyelesaikan pembuatan password

function secretKey(): Uint8Array | null {
  const s = process.env.AUTH_SECRET;
  return s && s.length >= 32 ? new TextEncoder().encode(s) : null;
}

export async function signSession(user: SessionUser): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error('AUTH_SECRET belum diset (minimal 32 karakter)');
  return new SignJWT({ typ: 'session', name: user.name, role: user.role, ...(user.github ? { github: user.github } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  const key = secretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (!payload.sub || payload.typ !== 'session') return null;
    return {
      email: payload.sub,
      name: typeof payload.name === 'string' ? payload.name : payload.sub,
      role: payload.role === 'admin' ? 'admin' : 'viewer',
      ...(typeof payload.github === 'string' && payload.github ? { github: payload.github } : {}),
    };
  } catch {
    return null;
  }
}

/** Token sementara: bukti bahwa user sudah lolos OAuth GitHub, sebelum password dibuat. */
export async function signPending(p: PendingRegistration): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error('AUTH_SECRET belum diset (minimal 32 karakter)');
  return new SignJWT({ typ: 'reg', gid: p.githubId, login: p.login, name: p.name, email: p.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MAX_AGE}s`)
    .sign(key);
}

export async function verifyPending(token: string | undefined): Promise<PendingRegistration | null> {
  const key = secretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (payload.typ !== 'reg') return null;
    const { gid, login, name, email } = payload;
    if (typeof gid !== 'string' || typeof login !== 'string' || typeof name !== 'string' || typeof email !== 'string') return null;
    return { githubId: gid, login, name, email };
  } catch {
    return null;
  }
}
