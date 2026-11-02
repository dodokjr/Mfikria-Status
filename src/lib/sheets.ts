import { SignJWT, importPKCS8 } from 'jose';
import { buildUserRow, parseUserRowsDetailed, type NewUser, type SheetUser } from './sheetRows';

export type { SheetUser, NewUser } from './sheetRows';

export class SheetsConfigError extends Error {}

// Butuh akses tulis untuk mencatat registrasi baru. Bagikan sheet ke service account sebagai Editor.
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const USERS_TTL_MS = 30_000;

let tokenCache: { token: string; expiresAt: number } | null = null;
let usersCache: { at: number; users: SheetUser[] } | null = null;

function env() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!email || !privateKey || !sheetId) {
    throw new SheetsConfigError('GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, dan GOOGLE_SHEET_ID wajib diisi');
  }
  // Mulai dari baris 1 agar header ikut terbaca dan data di baris pertama tidak terlewat.
  const range = process.env.GOOGLE_SHEET_RANGE?.trim() || 'users!A1:H';
  return {
    email,
    privateKey,
    sheetId,
    range,
    tab: range.includes('!') ? range.split('!')[0] : 'users',
    tokenUri: process.env.GOOGLE_TOKEN_URI?.trim() || 'https://oauth2.googleapis.com/token',
    apiBase: (process.env.GOOGLE_SHEETS_BASE_URL?.trim() || 'https://sheets.googleapis.com').replace(/\/+$/, ''),
  };
}

/** Access token service account (JWT bearer flow), di-cache sampai mendekati kedaluwarsa. */
async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - 60_000 > Date.now()) return tokenCache.token;

  const { email, privateKey, tokenUri } = env();
  const key = await importPKCS8(privateKey, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(email)
    .setSubject(email)
    .setAudience(tokenUri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('Google token: access_token kosong');
  tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return tokenCache.token;
}

/** Baca daftar user dari Google Spreadsheet (cache 30 detik, hasil kosong tidak di-cache). */
export async function loadUsers(force = false): Promise<SheetUser[]> {
  if (!force && usersCache && Date.now() - usersCache.at < USERS_TTL_MS) return usersCache.users;

  const { sheetId, range, apiBase } = env();
  const token = await accessToken();
  const res = await fetch(`${apiBase}/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 401) tokenCache = null;
    throw new Error(`Google Sheets ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
  const json = (await res.json()) as { values?: unknown };
  const { users, skipped, usedHeader } = parseUserRowsDetailed(json.values);

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[sheets] range "${range}": ${users.length} user terbaca (${usedHeader ? 'pakai header' : 'tanpa header, urutan A..G'})`,
    );
    if (skipped.length) console.warn('[sheets] baris dilewati:', skipped);
  }

  // Jangan cache hasil kosong, supaya perbaikan di sheet langsung terbaca.
  if (users.length > 0) usersCache = { at: Date.now(), users };
  return users;
}

/** Tambahkan user baru sebagai baris baru di spreadsheet. Nilai ditulis apa adanya (RAW), bukan sebagai formula. */
export async function appendUser(user: NewUser): Promise<void> {
  const { sheetId, tab, apiBase } = env();
  const token = await accessToken();
  const target = encodeURIComponent(`${tab}!A:H`);
  const res = await fetch(
    `${apiBase}/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${target}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [buildUserRow(user)] }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    if (res.status === 401) tokenCache = null;
    throw new Error(`Google Sheets append ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
  usersCache = null;
}