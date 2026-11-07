/** Foreground workspace-local sync: pin, lock, journal, read back. The catalog is read-only
 *  input, so a converged run leaves Git untouched and there is nothing to commit. */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve as absolute } from 'node:path';
import { ROOT, readJSON, resolve, canonical } from './config.js';
import { saveManifest } from './cli.js';
import { run } from './platform.js';
import { buildPlan, executePlan, resolvedForDeployment, digest } from './deployment.js';
export { unpack, buildPlan } from './deployment.js';

export function assertCurrentWorkspace(binding, runner = run) {
  const current = runner('', 'workspace', 'get');
  if (current.id !== binding.workspace_id) throw new Error('Workspace changed during the run; start again from the target runtime');
}
export const render = (role, binding, root = ROOT) => resolve(binding, root).agents[role].instructions;
export const renderPrompt = item => item.deployment_prompt;

export function sourceIdentity(root = ROOT) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  return { revision: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') };
}
/** Lock and journal live inside this checkout. The shared Git cache may sit outside the run
 *  sandbox and be read-only, and two workspaces syncing at the same time share nothing here. */
export function stateDirectory(root = ROOT) {
  return process.env.CONFIG_SYNC_STATE
    ? absolute(process.env.CONFIG_SYNC_STATE)
    : join(absolute(root), '.local/config-sync');
}
const UNWRITABLE = new Set(['EPERM', 'EACCES', 'EROFS', 'ENOSPC']);
const lockOwner = path => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
const running = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
const describeOwner = lock => lock?.pid ? `pid ${lock.pid}, run ${lock.run_id ?? 'unknown'}` : 'owner unknown';
const unwritable = (directory, error) => new Error(`Sync state is not writable at ${directory} (${error.code ?? error.message}); set CONFIG_SYNC_STATE to a writable directory`);
export function withWorkspaceLock(workspace, directory, runId, work) {
  const path = join(directory, `${workspace}.lock`);
  try { mkdirSync(directory, { recursive: true }); } catch (error) { throw unwritable(directory, error); }
  let fd;
  for (let attempt = 0; fd === undefined; attempt += 1) {
    try { fd = openSync(path, 'wx', 0o600); } catch (error) {
      if (UNWRITABLE.has(error.code)) throw unwritable(directory, error);
      if (error.code !== 'EEXIST') throw error;
      const held = lockOwner(path);
      const contended = new Error(`Workspace ${workspace} is already syncing (${describeOwner(held)}); wait for it to exit`);
      if (running(held?.pid) || attempt > 0) throw contended;
      // The recorded writer is gone: the exclusive create above is still the only way to claim it.
      try { unlinkSync(path); } catch (gone) { if (gone.code !== 'ENOENT') throw gone; }
    }
  }
  try { writeFileSync(fd, JSON.stringify({ pid: process.pid, run_id: runId })); return work(); }
  finally {
    closeSync(fd);
    try { unlinkSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
/** Reject uncommitted shared source: the bytes this run would deploy must be the commit. */
function assertCleanSource(root) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const changed = [...git('diff', '--name-only', 'HEAD').trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')].filter(Boolean);
  for (const path of changed) {
    if (path === '.local' || path.startsWith('.local/')) continue;
    throw new Error(`Uncommitted source input: ${path}; commit before apply`);
  }
}

export function deploy(binding, apply = false, options = {}) {
  const { root = ROOT, runner = run, log = console.log, source = sourceIdentity, keepUnmanaged = false } = options;
  resolvedForDeployment(binding, { root }); // Never write even a local journal for a pending binding.
  const pinned = source(root);
  if (!apply) {
    const plan = buildPlan(binding, { ...options, root, runner, keepUnmanaged });
    log(JSON.stringify({ ...plan, source: pinned, status: plan.operations.length ? 'pending' : 'configured', verification: 'plan only; not applied' }, null, 2));
    return plan;
  }
  const directory = options.stateDirectory ?? stateDirectory(root);
  const runId = options.runId ?? randomUUID();
  const slug = binding.identity.workspace_slug;
  return withWorkspaceLock(slug, directory, runId, () => {
    assertCurrentWorkspace(binding, runner);
    const journalPath = join(directory, `${slug}.json`);
    const previous = existsSync(journalPath) ? readJSON(journalPath) : null;
    // A partial run re-plans from live state: every operation is name-keyed and idempotent,
    // so a created object is found, not recreated. Only a moved source is refused.
    if (previous?.status === 'partially-applied' && canonical(previous.source) !== canonical(pinned))
      throw new Error('Source changed during partial sync; reconcile the checkpoint first');
    const plan = buildPlan(binding, { ...options, root, runner, keepUnmanaged });
    const current = resolve(binding, root);
    if (current.shared_hash !== plan.shared_hash || current.binding_hash !== plan.binding_hash || current.ledger_hash !== plan.ledger_hash)
      throw new Error('Deployment inputs changed; reconcile the checkpoint first');
    if (source === sourceIdentity) assertCleanSource(root);
    if (previous?.status === 'verified') saveManifest(join(directory, `${slug}.${digest(previous)}.json`), previous);
    const journal = { run_id: runId, source: pinned, plan_hash: plan.plan_hash, status: 'partially-applied' };
    const saveJournal = () => saveManifest(journalPath, journal);
    saveJournal();
    try {
      const result = executePlan(binding, plan, { root, runner, pack: options.pack, assets: current.shared.assets });
      journal.status = 'verified'; journal.result = result; journal.verified_at = new Date().toISOString(); saveJournal();
      log(`Readback verified: ${result.operations} planned operations, ${result.retired.length} retired; no catalog write.`);
      return { ...result, journal: journalPath, source: pinned, verified_at: journal.verified_at };
    } catch (error) { journal.error = error.message; saveJournal(); throw error; }
  });
}
