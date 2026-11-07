import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { resolveWorkspace, normalizeRepository, selectRuntime, resolveOwners } from '../scripts/workspace.js';
import { deploy, stateDirectory, withWorkspaceLock, sourceIdentity } from '../scripts/deploy.js';
import { ROLES } from '../scripts/config.js';
import { fixture, apply, writes } from './support/helpers.js';
import { id } from './support/platform.js';

const runner = f => (...args) => f.runner(...args);

test('the live binding uses the member user_id, one online Dsh runtime for every role and the origin URL', t => {
  const f = fixture(t);
  const { binding, runtime, owners } = resolveWorkspace({ root: f.root, runner: runner(f), repository: 'https://github.com/acme/catalog' });
  assert.equal(binding.workspace_id, id(1));
  assert.equal(binding.human_user_id, id(3));
  assert.deepEqual(binding.owner_ids, [id(3)]);
  assert.equal(binding.identity.workspace_slug, 'fixture');
  assert.equal(binding.repository, 'https://github.com/acme/catalog');
  assert.equal(runtime.id, id(2));
  assert.deepEqual(Object.keys(binding.agent_runtimes).sort(), [...ROLES].sort());
  for (const role of ROLES) assert.equal(binding.agent_runtimes[role], id(2));
  assert.equal(owners[0].name, 'miran');
});

test('runtime selection is provider- and status-scoped', () => {
  const online = { id: id(2), workspace_id: id(1), provider: 'dsh', status: 'online' };
  const offline = { id: id(3), workspace_id: id(1), provider: 'dsh', status: 'offline' };
  const codex = { id: id(4), workspace_id: id(1), provider: 'codex', status: 'online' };
  const other = { id: id(5), workspace_id: id(9), provider: 'dsh', status: 'online' };
  assert.equal(selectRuntime([online, offline, codex, other], id(1)).id, online.id);
  assert.throws(() => selectRuntime([offline, codex, other], id(1)), /No online Dsh runtime/);
  assert.throws(() => selectRuntime([online, { ...online, id: id(6) }], id(1)), /Multiple online Dsh runtimes/);
  assert.equal(selectRuntime([online, { ...online, id: id(6) }], id(1), id(6)).id, id(6));
});

test('owners come from role=owner and user_id, sorted for determinism', () => {
  const members = [{ id: id(8), user_id: id(9), role: 'owner', name: 'b' }, { id: id(7), user_id: id(3), role: 'owner', name: 'a' }, { id: id(6), user_id: id(5), role: 'member', name: 'c' }];
  assert.deepEqual(resolveOwners(members).map(owner => owner.user_id), [id(3), id(9)]);
  assert.throws(() => resolveOwners([{ user_id: id(5), role: 'member' }]), /no owner/);
});

test('origin normalization supports ssh and https and rejects other shapes', () => {
  assert.equal(normalizeRepository('git@github.com:acme/catalog.git'), 'https://github.com/acme/catalog');
  assert.equal(normalizeRepository('https://github.com/acme/catalog.git'), 'https://github.com/acme/catalog');
  assert.equal(normalizeRepository('/srv/repos/catalog.git'), null);
});

test('the source repository comes from git origin and stays null without one', t => {
  const f = fixture(t);
  assert.equal(resolveWorkspace({ root: f.root, runner: runner(f) }).repository, null);
  execFileSync('git', ['init', '-q'], { cwd: f.root });
  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:acme/catalog.git'], { cwd: f.root });
  assert.equal(resolveWorkspace({ root: f.root, runner: runner(f) }).repository, 'https://github.com/acme/catalog');
});

test('a foreign workspace is never read and a moved workspace refuses writes', t => {
  const f = fixture(t);
  const scoped = (workspace, ...args) => { if (workspace && workspace !== id(1)) throw Error('cross-workspace denied'); return f.runner(workspace, ...args); };
  apply(f, { runner: scoped });
  assert.equal(f.state.agents.length, 5);
  const g = fixture(t); g.state.workspace.id = id(99); g.state.calls = [];
  assert.throws(() => apply(g), /Workspace changed during the run/);
  assert.equal(writes(g.state).length, 0);
});

test('the synchronous lock prevents a second writer and names the holder', t => {
  const f = fixture(t);
  withWorkspaceLock('fixture', f.stateDirectory, 'owner-run', () => {
    assert.throws(() => apply(f), /already syncing \(pid \d+, run owner-run\)/);
  });
  assert.equal(writes(f.state).length, 0);
});

test('two workspaces sync at the same time without contending', t => {
  const f = fixture(t);
  const held = [];
  const result = withWorkspaceLock('fixture', f.stateDirectory, 'first', () => withWorkspaceLock('other', f.stateDirectory, 'second', () => {
    held.push(existsSync(join(f.stateDirectory, 'fixture.lock')), existsSync(join(f.stateDirectory, 'other.lock')));
    return 'both';
  }));
  assert.equal(result, 'both');
  assert.deepEqual(held, [true, true]);
  assert.equal(existsSync(join(f.stateDirectory, 'fixture.lock')), false);
});

test('a lock left by a dead writer is reclaimed', t => {
  const f = fixture(t); mkdirSync(f.stateDirectory, { recursive: true });
  const dead = spawnSync(process.execPath, ['-e', '']).pid;
  writeFileSync(join(f.stateDirectory, 'fixture.lock'), JSON.stringify({ pid: dead, run_id: 'interrupted' }));
  assert.equal(withWorkspaceLock('fixture', f.stateDirectory, 'replacement', () => 'ran'), 'ran');
});

test('an unwritable state directory reports the directory, not contention', t => {
  const f = fixture(t); mkdirSync(f.stateDirectory, { recursive: true }); chmodSync(f.stateDirectory, 0o500);
  t.after(() => { if (existsSync(f.stateDirectory)) chmodSync(f.stateDirectory, 0o700); });
  assert.throws(() => withWorkspaceLock('fixture', f.stateDirectory, 'blocked', () => {}), /not writable/);
});

test('state stays inside the checkout and follows CONFIG_SYNC_STATE', t => {
  const f = fixture(t);
  assert.equal(stateDirectory(f.root), join(f.root, '.local/config-sync'));
  process.env.CONFIG_SYNC_STATE = join(f.root, 'elsewhere');
  t.after(() => { delete process.env.CONFIG_SYNC_STATE; });
  assert.equal(stateDirectory(f.root), join(f.root, 'elsewhere'));
});

const commit = root => {
  execFileSync('git', ['init', '-q'], { cwd: root });
  writeFileSync(join(root, '.gitignore'), '.local/\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'test: fixture'], { cwd: root });
};
test('a clean checkout applies and a dirty one refuses before any write', t => {
  const f = fixture(t); commit(f.root);
  f.source = () => sourceIdentity(f.root);
  writeFileSync(join(f.root, 'roles/general.md'), 'dirty');
  assert.throws(() => deploy(f.binding, true, { ...f, source: sourceIdentity }), /Uncommitted source input/);
  assert.equal(writes(f.state).length, 0);
  rmSync(join(f.root, 'roles/general.md'));
  execFileSync('git', ['checkout', '--', 'roles/general.md'], { cwd: f.root });
  apply(f, { source: sourceIdentity });
  assert.equal(f.state.agents.length, 5);
  assert.ok(!readdirSync(f.root).includes('workspaces'));
});
