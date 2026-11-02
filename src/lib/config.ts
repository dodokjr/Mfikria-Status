const list = (v?: string): string[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Getter dipakai agar env dibaca saat runtime, bukan saat build.
export const config = {
  get appName(): string {
    return process.env.APP_NAME?.trim() || 'mfikriaApp';
  },
  get appHealthUrl(): string {
    return process.env.APP_HEALTH_URL?.trim() || '';
  },
  get cacheTtlMs(): number {
    return num(process.env.CACHE_TTL, 60) * 1000;
  },
  get ping(): boolean {
    return (process.env.PING ?? 'true') !== 'false';
  },
  get pingTimeoutMs(): number {
    return num(process.env.PING_TIMEOUT_MS, 8000);
  },
  get vercelTokens(): string[] {
    return list(process.env.VERCEL_TOKEN);
  },
  get vercelTeams(): string[] {
    return list(process.env.VERCEL_TEAM_IDS);
  },
  get netlifyTokens(): string[] {
    return list(process.env.NETLIFY_TOKEN);
  },
  // Registrasi GitHub
  get appUrl(): string {
    return (process.env.APP_URL?.trim() || '').replace(/\/+$/, '');
  },
  get githubClientId(): string {
    return process.env.GITHUB_CLIENT_ID?.trim() || '';
  },
  get githubClientSecret(): string {
    return process.env.GITHUB_CLIENT_SECRET?.trim() || '';
  },
  /** Daftar username GitHub yang diundang. Kosong = siapa pun boleh mendaftar (dengan persetujuan admin). */
  get githubAllowedUsers(): string[] {
    return list(process.env.GITHUB_ALLOWED_USERS).map((s) => s.toLowerCase().replace(/^@/, ''));
  },
  get registrationAutoApprove(): boolean {
    return process.env.REGISTRATION_AUTO_APPROVE === 'true';
  },
};
