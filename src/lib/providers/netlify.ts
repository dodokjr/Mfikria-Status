import { config } from '../config';
import type { DeployStatus, StatusItem } from '../types';
import { getJson, ping, pmap } from '../util';
import { finalStatus } from './vercel';

interface NetlifySite {
  id: string;
  name: string;
  url?: string;
  ssl_url?: string;
  account_slug?: string;
  build_settings?: { provider?: string; repo_path?: string; repo_url?: string };
}

/** Ambil pemilik repo GitHub ("owner" dari "owner/repo") dari pengaturan build site Netlify. */
export function netlifyRepoOwner(bs: NetlifySite['build_settings']): string | null {
  if (!bs) return null;
  const fromUrl = bs.repo_url?.match(/github\.com[/:]([^/]+)\//i)?.[1];
  if (fromUrl) return fromUrl;
  if (bs.provider === 'github' && bs.repo_path) return bs.repo_path.split('/')[0] || null;
  return null;
}

interface NetlifyDeploy {
  id?: string;
  state?: string;
  created_at?: string;
  title?: string | null;
  branch?: string | null;
  framework?: string | null;
  error_message?: string | null;
  deploy_time?: number | null; // detik
}

const STATE: Record<string, DeployStatus> = {
  ready: 'operational',
  building: 'building',
  enqueued: 'building',
  new: 'building',
  uploading: 'building',
  uploaded: 'building',
  preparing: 'building',
  processing: 'building',
  pending_review: 'building',
  error: 'failed',
};

async function fetchSites(token: string): Promise<NetlifySite[]> {
  const sites: NetlifySite[] = [];
  for (let page = 1; page <= 20; page++) {
    const data = await getJson<NetlifySite[]>(`https://api.netlify.com/api/v1/sites?filter=all&per_page=100&page=${page}`, token);
    sites.push(...data);
    if (data.length < 100) break;
  }
  return sites;
}

export async function collectNetlify(): Promise<{ items: StatusItem[]; errors: string[] }> {
  const errors: string[] = [];
  const raw: { s: NetlifySite; token: string }[] = [];
  await Promise.all(
    config.netlifyTokens.map(async (token, n) => {
      try {
        const sites = await fetchSites(token);
        sites.forEach((s) => raw.push({ s, token }));
      } catch (e) {
        errors.push(`Netlify token#${n + 1}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
  );

  const seen = new Set<string>();
  const unique = raw.filter(({ s }) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

  const items = await pmap(unique, 6, async ({ s, token }): Promise<StatusItem> => {
    let dep: NetlifyDeploy | null = null;
    try {
      const deps = await getJson<NetlifyDeploy[]>(`https://api.netlify.com/api/v1/sites/${s.id}/deploys?per_page=1`, token);
      dep = deps[0] ?? null;
    } catch (e) {
      errors.push(`Netlify ${s.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
    const url = s.ssl_url || s.url || `https://${s.name}.netlify.app`;
    const state = dep?.state ?? null;
    const deployStatus: DeployStatus = state ? (STATE[state] ?? 'unknown') : 'no-deployment';
    const pg = deployStatus === 'no-deployment' ? null : await ping(url);
    return {
      provider: 'netlify',
      id: `netlify:${s.id}`,
      name: s.name,
      team: s.account_slug ?? null,
      framework: dep?.framework ?? null,
      repoOwner: netlifyRepoOwner(s.build_settings),
      url,
      status: finalStatus(deployStatus, pg),
      deployId: dep?.id ?? null,
      resources: {
        memory: null, // Netlify tidak mengekspos konfigurasi memori lewat API ini
        timeoutSec: null,
        regions: [],
        buildSec: typeof dep?.deploy_time === 'number' ? dep.deploy_time : null,
      },
      deploy: {
        state,
        status: deployStatus,
        createdAt: dep?.created_at ?? null,
        commit: dep?.title ?? null,
        branch: dep?.branch ?? null,
        error: dep?.error_message ?? null,
      },
      ping: pg,
    };
  });

  return { items, errors };
}