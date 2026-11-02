import { config } from '../config';
import type { DeployStatus, ItemStatus, PingResult, StatusItem } from '../types';
import { getJson, ping, pmap } from '../util';

interface VercelDeployment {
  id?: string;
  uid?: string;
  readyState?: string;
  createdAt?: number;
  buildingAt?: number;
  ready?: number;
  alias?: string[];
  meta?: { githubCommitMessage?: string; githubCommitRef?: string };
}

interface VercelProject {
  id: string;
  name: string;
  framework?: string | null;
  serverlessFunctionRegion?: string | null;
  resourceConfig?: {
    functionDefaultMemoryType?: string | null;
    functionDefaultTimeout?: number | null;
    functionDefaultRegions?: string[] | null;
  };
  link?: { type?: string; org?: string; repo?: string };
  targets?: { production?: VercelDeployment };
  latestDeployments?: VercelDeployment[];
}

interface VercelProjectsResponse {
  projects?: VercelProject[];
  pagination?: { next?: number | null };
}

const STATE: Record<string, DeployStatus> = {
  READY: 'operational',
  BUILDING: 'building',
  INITIALIZING: 'building',
  QUEUED: 'building',
  ERROR: 'failed',
  CANCELED: 'canceled',
};

export function finalStatus(deploy: DeployStatus, p: PingResult | null): ItemStatus {
  return p && !p.ok ? 'down' : deploy;
}

async function fetchProjects(token: string, teamId: string | null): Promise<VercelProject[]> {
  const projects: VercelProject[] = [];
  let until: number | null = null;
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ limit: '100' });
    if (teamId) q.set('teamId', teamId);
    if (until) q.set('until', String(until));
    const data: VercelProjectsResponse = await getJson<VercelProjectsResponse>(`https://api.vercel.com/v9/projects?${q}`, token);
    projects.push(...(data.projects ?? []));
    until = data.pagination?.next ?? null;
    if (!until) break;
  }
  return projects;
}

export async function collectVercel(): Promise<{ items: StatusItem[]; errors: string[] }> {
  const teams = config.vercelTeams.length ? config.vercelTeams : [null];
  const combos = config.vercelTokens.flatMap((token) => teams.map((team) => ({ token, team })));

  const errors: string[] = [];
  const raw: { p: VercelProject; team: string | null }[] = [];
  await Promise.all(
    combos.map(async ({ token, team }) => {
      try {
        const projects = await fetchProjects(token, team);
        projects.forEach((p) => raw.push({ p, team }));
      } catch (e) {
        errors.push(`Vercel ${team ?? 'personal'}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
  );

  const seen = new Set<string>();
  const unique = raw.filter(({ p }) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  const items = await pmap(unique, 8, async ({ p, team }): Promise<StatusItem> => {
    const prod = p.targets?.production;
    const dep = prod ?? p.latestDeployments?.[0] ?? null;
    const alias = prod?.alias?.[0];
    const url = alias ? `https://${alias}` : `https://${p.name}.vercel.app`;
    const state = dep?.readyState ?? null;
    const deployStatus: DeployStatus = state ? (STATE[state] ?? 'unknown') : 'no-deployment';
    const pg = deployStatus === 'no-deployment' ? null : await ping(url);

    const buildSec = dep?.ready && dep?.buildingAt && dep.ready > dep.buildingAt ? Math.round((dep.ready - dep.buildingAt) / 1000) : null;
    const rc = p.resourceConfig;
    const regions = rc?.functionDefaultRegions?.length ? rc.functionDefaultRegions : p.serverlessFunctionRegion ? [p.serverlessFunctionRegion] : [];

    return {
      provider: 'vercel',
      id: `vercel:${p.id}`,
      name: p.name,
      team: team ?? 'personal',
      framework: p.framework ?? null,
      repoOwner: p.link?.type === 'github' ? (p.link.org ?? null) : null,
      url,
      status: finalStatus(deployStatus, pg),
      deployId: dep?.id ?? dep?.uid ?? null,
      resources: {
        memory: rc?.functionDefaultMemoryType ?? null,
        timeoutSec: rc?.functionDefaultTimeout ?? null,
        regions,
        buildSec,
      },
      deploy: {
        state,
        status: deployStatus,
        createdAt: dep?.createdAt ? new Date(dep.createdAt).toISOString() : null,
        commit: dep?.meta?.githubCommitMessage?.split('\n')[0] ?? null,
        branch: dep?.meta?.githubCommitRef ?? null,
      },
      ping: pg,
    };
  });

  return { items, errors };
}