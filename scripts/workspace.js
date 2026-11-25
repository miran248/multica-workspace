/** Resolve one workspace binding from the live platform. Nothing here is persisted:
 *  workspace, owners, runtime and source repository are re-read on every run. */
import { execFileSync } from 'node:child_process';
import { DEFAULT_APP_URL, ROLES, requiredProvider } from './config.js';
import { run, unpack } from './platform.js';

/** Normalize an origin URL to its web form; a fork keeps its own address. */
export function normalizeRepository(url) {
  const match = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(url) ?? /^https:\/\/([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
  return match ? `https://${match[1]}/${match[2]}` : null;
}

export function sourceRepository(root = process.cwd()) {
  try {
    return normalizeRepository(execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch { return null; }
}

/** The provider-agnostic selector: exactly one online runtime of the catalog's configured
 *  provider family binds every role. Zero or several is a refusal, not a choice — a second
 *  online runtime is a misconfiguration to stop, and there is no per-run override. */
export function selectRuntime(runtimes, workspaceId, provider) {
  if (!provider) throw new Error('No required runtime provider in the catalog defaults');
  const candidates = runtimes.filter(runtime => runtime.workspace_id === workspaceId
    && (runtime.provider ?? 'dsh') === provider && runtime.status === 'online');
  if (candidates.length === 1) return candidates[0];
  if (!candidates.length) throw new Error(`No online ${provider} runtime in this workspace; the catalog requires exactly one`);
  throw new Error(`Multiple online ${provider} runtimes (${candidates.length}); the catalog requires exactly one: ${candidates.map(runtime => runtime.id).join(', ')}`);
}

/** The approval gate compares the comment author's user_id, so the owner set comes from the
 *  member list: the first owner by user_id is the primary report recipient. */
export function resolveOwners(members) {
  const owners = members
    .filter(member => member.role === 'owner' && (member.user_id ?? member.id))
    .map(member => ({ user_id: member.user_id ?? member.id, name: member.name ?? 'owner' }))
    .sort((a, b) => a.user_id.localeCompare(b.user_id));
  if (!owners.length) throw new Error('Workspace has no owner; the approval gate needs one');
  return owners;
}

export function bindingFor({ workspace, owners, runtime, repository, versions, appUrl = process.env.MULTICA_APP_URL ?? DEFAULT_APP_URL }) {
  return {
    workspace_id: workspace.id,
    human_user_id: owners[0].user_id,
    owner_ids: owners.map(owner => owner.user_id),
    app_url: appUrl,
    versions,
    identity: { workspace_name: workspace.name ?? workspace.slug, workspace_slug: workspace.slug, human_name: owners[0].name },
    agent_runtimes: Object.fromEntries(ROLES.map(role => [role, runtime.id])),
    repository,
  };
}

/** The two platform facts the floor check reads: the CLI that applies this catalog and the
 *  bound runtime's `metadata.cli_version`, which executes the runs it dispatches. */
export function platformVersions(runtime, runner = run) {
  // A read that fails leaves the fact unreadable, which the resolver refuses and names.
  let cli = null;
  try { cli = runner('', 'version')?.version ?? null; } catch { cli = null; }
  return { cli, runtime: runtime?.metadata?.cli_version ?? null };
}

export function resolveWorkspace({ root = process.cwd(), runner = run, appUrl, repository = sourceRepository(root) } = {}) {
  const workspace = runner('', 'workspace', 'get');
  if (!workspace?.id || !workspace?.slug) throw new Error('Workspace identity unavailable; run inside the target workspace runtime');
  const members = unpack(runner(workspace.id, 'workspace', 'member', 'list'), 'members');
  const owners = resolveOwners(members);
  const runtimes = unpack(runner(workspace.id, 'runtime', 'list'), 'runtimes');
  const runtime = selectRuntime(runtimes, workspace.id, requiredProvider(root));
  const versions = platformVersions(runtime, runner);
  return { workspace, owners, runtime, repository, versions, binding: bindingFor({ workspace, owners, runtime, repository, versions, appUrl }) };
}
