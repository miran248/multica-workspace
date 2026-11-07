/** One command: resolve this workspace live, apply the catalog by name, read back.
 *  Nothing is authored locally: a converged run leaves Git and the workspace untouched. */
import { parseArgs } from 'node:util';
import { ROOT } from './config.js';
import { entrypoint } from './cli.js';
import { run } from './platform.js';
import { resolveWorkspace } from './workspace.js';
import { deploy, sourceIdentity } from './deploy.js';
import { buildPlan } from './deployment.js';

const USAGE = `sync [--runtime-id ID] [--keep-unmanaged] [--dry-run]

Resolves workspace identity, owners, the online Dsh runtime and this checkout's origin,
then reconciles the catalog by name. --dry-run prints the plan without writing anything.`;

export function sync(options = {}) {
  const resolved = resolveWorkspace(options);
  if (!resolved.repository) throw new Error("No GitHub origin: the rendered prompt must carry this catalog's own URL. Add one with `git remote add origin <url>`.");
  const result = deploy(resolved.binding, true, { ...options });
  return { ...resolved, result };
}

export function main(args = process.argv.slice(2)) {
  const parsed = parseArgs({ args, allowPositionals: true, options: {
    'runtime-id': { type: 'string' }, 'keep-unmanaged': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' },
  } });
  if (parsed.values.help) { console.log(USAGE); return; }
  if (parsed.positionals.length) throw new Error('sync takes no positional arguments');
  const resolved = resolveWorkspace({ root: ROOT, runtimeId: parsed.values['runtime-id'] });
  if (!resolved.repository) throw new Error("No GitHub origin: the rendered prompt must carry this catalog's own URL. Add one with `git remote add origin <url>`.");
  const { binding, runtime } = resolved;
  if (parsed.values['dry-run']) {
    const plan = buildPlan(binding, { root: ROOT, runner: run, keepUnmanaged: parsed.values['keep-unmanaged'] });
    console.log(JSON.stringify({ workspace: binding.identity.workspace_slug, runtime: runtime.id, repository: resolved.repository,
      ...plan, source: sourceIdentity(ROOT), status: plan.operations.length ? 'pending' : 'configured',
      verification: 'plan only; not applied' }, null, 2));
    return;
  }
  const result = deploy(binding, true, { keepUnmanaged: parsed.values['keep-unmanaged'] });
  console.log(JSON.stringify({
    workspace: binding.identity.workspace_slug, runtime: runtime.id, repository: resolved.repository,
    status: result.status, operations: result.operations, pruned: result.retired,
    sync_control: result.sync_control, migrations: result.migrations,
    source_revision: result.source.revision, verified_at: result.verified_at, journal: result.journal,
    next: result.sync_control === 'configured' ? 'Catalog converged; schedule and status remain operator state.' : 'Run `just schedule` to install the scheduled sync.',
  }, null, 2));
}

entrypoint(import.meta.url, main);
