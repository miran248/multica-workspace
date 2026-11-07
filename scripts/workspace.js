/** Resolve one workspace binding from the live platform. Nothing here is persisted:
 *  workspace, owners, runtime and source repository are re-read on every run. */
import { execFileSync } from 'node:child_process';
import { ROLES } from './config.js';
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

/** One online Dsh runtime binds every role. With more than one, the operator must choose:
 *  the CLI has no runtime name selector, so an implicit pick would be a guess. */
export function selectRuntime(runtimes, workspaceId, preferred) {
  const candidates = runtimes.filter(runtime => runtime.workspace_id === workspaceId
    && (runtime.provider ?? 'dsh') === 'dsh' && runtime.status === 'online');
  if (preferred) {
    const chosen = candidates.find(runtime => runtime.id === preferred);
    if (!chosen) throw new Error(`Runtime ${preferred} is not an online Dsh runtime in this workspace`);
    return chosen;
  }
  if (candidates.length === 1) return candidates[0];
  if (!candidates.length) throw new Error('No online Dsh runtime in this workspace; start one first');
  throw new Error(`Multiple online Dsh runtimes; choose one with --runtime-id or RUNTIME: ${candidates.map(runtime => runtime.id).join(', ')}`);
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

export function bindingFor({ workspace, owners, runtime, repository }) {
  return {
    workspace_id: workspace.id,
    human_user_id: owners[0].user_id,
    owner_ids: owners.map(owner => owner.user_id),
    identity: { workspace_name: workspace.name ?? workspace.slug, workspace_slug: workspace.slug, human_name: owners[0].name },
    agent_runtimes: Object.fromEntries(ROLES.map(role => [role, runtime.id])),
    repository,
  };
}

export function resolveWorkspace({ root = process.cwd(), runner = run, runtimeId, repository = sourceRepository(root) } = {}) {
  const workspace = runner('', 'workspace', 'get');
  if (!workspace?.id || !workspace?.slug) throw new Error('Workspace identity unavailable; run inside the target workspace runtime');
  const members = unpack(runner(workspace.id, 'workspace', 'member', 'list'), 'members');
  const owners = resolveOwners(members);
  const runtimes = unpack(runner(workspace.id, 'runtime', 'list'), 'runtimes');
  const runtime = selectRuntime(runtimes, workspace.id, runtimeId ?? process.env.RUNTIME);
  return { workspace, owners, runtime, repository, binding: bindingFor({ workspace, owners, runtime, repository }) };
}
