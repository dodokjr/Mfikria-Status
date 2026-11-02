export type Provider = 'vercel' | 'netlify';

export type DeployStatus = 'operational' | 'building' | 'failed' | 'canceled' | 'unknown' | 'no-deployment';
export type ItemStatus = DeployStatus | 'down';

export interface PingResult {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  error?: string;
}

/** Konfigurasi function & lama build. Memori adalah konfigurasi, bukan pemakaian aktual. */
export interface ItemResources {
  memory: string | null;
  timeoutSec: number | null;
  regions: string[];
  /** Lama build deployment terakhir (detik). */
  buildSec: number | null;
}

/** Detail deployment (log build, pesan error) yang diambil sesuai permintaan, hanya untuk admin. */
export interface DeployDetails {
  source: Provider;
  lines: string[];
  truncated: boolean;
  errorMessage: string | null;
  buildSec: number | null;
  regions: string[];
  note?: string;
  adminUrl?: string;
}

export interface StatusItem {
  provider: Provider;
  id: string;
  name: string;
  team: string | null;
  framework: string | null;
  /** Pemilik repo GitHub yang terhubung ke project (untuk filter per akun GitHub). */
  repoOwner: string | null;
  url: string;
  status: ItemStatus;
  /** ID deployment terakhir, dipakai untuk mengambil log. */
  deployId?: string | null;
  resources?: ItemResources;
  deploy: {
    state: string | null;
    status: DeployStatus;
    createdAt: string | null;
    commit: string | null;
    branch: string | null;
    error?: string | null;
  };
  ping: PingResult | null;
}

export interface Summary {
  total: number;
  operational: number;
  building: number;
  failed: number;
  down: number;
  canceled: number;
  other: number;
  overall: 'operational' | 'degraded' | 'unknown';
}

export interface ProviderResult {
  configured: boolean;
  items: StatusItem[];
  errors: string[];
  fetchedAt: string | null;
}

export interface ProviderInfo {
  configured: boolean;
  errors: string[];
  fetchedAt: string | null;
}

export interface HealthCheck extends PingResult {
  url: string;
}

export interface ScopeInfo {
  /** mine = hanya project dengan repo milik akun GitHub user; all = semua project */
  mode: 'mine' | 'all';
  github: string | null;
  /** true jika user boleh beralih antara "milik saya" dan "semua" (admin ber-GitHub) */
  canToggle: boolean;
}

export interface StatusPayload {
  generatedAt: string;
  appName: string;
  scope: ScopeInfo;
  summary: Summary;
  app: {
    found: boolean;
    summary: Summary;
    items: StatusItem[];
    health: HealthCheck | null;
  };
  others: {
    summary: Summary;
    items: StatusItem[];
  };
  providers: Record<Provider, ProviderInfo>;
}

export type Role = 'admin' | 'viewer';

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
  /** username GitHub (kosong untuk akun yang ditambahkan manual di spreadsheet) */
  github?: string;
}

/** Data profil GitHub yang sudah terverifikasi, menunggu user membuat password. */
export interface PendingRegistration {
  githubId: string;
  login: string;
  name: string;
  email: string;
}

export interface HistoryEvent {
  /** Waktu deployment dibuat (epoch ms). */
  t: number;
  status: DeployStatus;
}

export interface ItemHistory {
  source: Provider;
  since: number;
  events: HistoryEvent[];
  truncated: boolean;
}

export type UsageCategory = 'network' | 'cache' | 'other';

export interface UsageRow {
  service: string;
  category: UsageCategory;
  unit: string;
  qty7: number;
  qty30: number;
  cost7: number;
  cost30: number;
}

export interface VercelUsage {
  provider: 'vercel';
  scope: 'project' | 'team';
  currency: string | null;
  from: string;
  to: string;
  rows: UsageRow[];
}

export interface NetlifyUsage {
  provider: 'netlify';
  account: string;
  /** Satuan byte. */
  used: number | null;
  included: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  updatedAt: string | null;
}

export type UsageReport = VercelUsage | NetlifyUsage;

export interface GitHubRepo {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  fork: boolean;
  archived: boolean;
  /** ISO, waktu push terakhir. */
  pushedAt: string | null;
}

export interface GitHubProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  url: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
}

export interface ProfilePayload {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  /** true bila akun punya lebih dari 100 repo publik (hanya 100 terbaru yang diambil). */
  truncated: boolean;
}

export interface RepoLanguage {
  name: string;
  bytes: number;
}

export interface RepoCommit {
  sha: string;
  message: string;
  author: string | null;
  date: string | null;
  url: string;
}

export interface RepoRelease {
  tag: string;
  name: string | null;
  url: string;
  publishedAt: string | null;
}

export interface RepoDetails {
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  homepage: string | null;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  /** Ukuran repo dalam KB (dari GitHub). */
  sizeKb: number;
  stars: number;
  forks: number;
  watchers: number;
  /** Termasuk pull request yang masih terbuka. */
  openIssues: number;
  fork: boolean;
  parent: { name: string; url: string } | null;
  archived: boolean;
  createdAt: string | null;
  pushedAt: string | null;
  updatedAt: string | null;
  languages: RepoLanguage[];
  commits: RepoCommit[];
  release: RepoRelease | null;
}