import { config } from './config';
import type { PendingRegistration } from './types';

export class GitHubError extends Error {}

export const GITHUB_STATE_COOKIE = 'mfikria_gh_state';

export function githubConfigured(): boolean {
  return Boolean(config.githubClientId && config.githubClientSecret);
}

/** Origin publik aplikasi: APP_URL jika diisi (disarankan di balik proxy), jika tidak origin request. */
export function appOrigin(requestOrigin: string): string {
  return config.appUrl || requestOrigin;
}

export function callbackUrl(requestOrigin: string): string {
  return `${appOrigin(requestOrigin)}/api/auth/github/callback`;
}

export function authorizeUrl(requestOrigin: string, state: string): string {
  const q = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: callbackUrl(requestOrigin),
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${q}`;
}

/** Jika GITHUB_ALLOWED_USERS diisi, hanya username di daftar itu yang boleh mendaftar. */
export function isAllowedLogin(login: string): boolean {
  const allow = config.githubAllowedUsers;
  return allow.length === 0 || allow.includes(login.toLowerCase());
}

const apiHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'mfikria-status',
  'X-GitHub-Api-Version': '2022-11-28',
});

interface GitHubUser {
  id: number;
  login: string;
  name?: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Tukar `code` OAuth dengan identitas GitHub terverifikasi (id, username, nama, email utama).
 * Access token hanya dipakai sesaat di sini dan tidak disimpan di mana pun.
 */
export async function fetchGithubIdentity(code: string, requestOrigin: string): Promise<PendingRegistration> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
      redirect_uri: callbackUrl(requestOrigin),
    }),
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!tokenRes.ok) throw new GitHubError(`GitHub token ${tokenRes.status}`);
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenJson.access_token) throw new GitHubError(`GitHub: ${tokenJson.error_description ?? tokenJson.error ?? 'token kosong'}`);
  const token = tokenJson.access_token;

  const [userRes, emailRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers: apiHeaders(token), signal: AbortSignal.timeout(15_000), cache: 'no-store' }),
    fetch('https://api.github.com/user/emails', { headers: apiHeaders(token), signal: AbortSignal.timeout(15_000), cache: 'no-store' }),
  ]);
  if (!userRes.ok) throw new GitHubError(`GitHub user ${userRes.status}`);
  if (!emailRes.ok) throw new GitHubError(`GitHub emails ${emailRes.status}`);

  const user = (await userRes.json()) as GitHubUser;
  const emails = (await emailRes.json()) as GitHubEmail[];
  const email = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
  if (!user?.id || !user.login) throw new GitHubError('Profil GitHub tidak lengkap');
  if (!email) throw new GitHubError('Tidak ada email GitHub yang terverifikasi');

  return {
    githubId: String(user.id),
    login: user.login,
    name: (user.name?.trim() || user.login).slice(0, 100),
    email: email.email.trim().toLowerCase(),
  };
}
