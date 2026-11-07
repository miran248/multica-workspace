import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ROLES, readJSON, resolve, syntheticBinding } from '../scripts/config.js';
import { render } from '../scripts/deploy.js';
import { fixture } from './support/helpers.js';
import { id } from './support/platform.js';

test('the shared contract reaches every role and the status move owns dispatch', t => {
  const f = fixture(t), resolved = resolve(f.binding, f.root);
  for (const role of ROLES) {
    assert.match(render(role, f.binding, f.root), /Use Conventional Commits/, role);
    assert.match(render(role, f.binding, f.root), /The status move is the handoff/, role);
  }
  assert.match(render('reviewer', f.binding, f.root), /never approve your own implementation/);
  assert.match(render('planner', f.binding, f.root), /grilling to acceptance/);
  assert.match(render('implementer', f.binding, f.root), /move the ticket to `in_review`/);
  for (const role of ROLES) assert.doesNotMatch(readFileSync(join(ROOT, `roles/${role}.md`), 'utf8'), /Coordinator|squad/, role);
  assert.deepEqual(Object.keys(resolved.shared.workflows), ['factory']);
  assert.equal(resolved.shared.catalog.timezone, 'UTC');
  assert.equal(resolved.sync.timezone, 'UTC');
});

test('no role launches foreground or focus-stealing work', t => {
  const f = fixture(t);
  for (const role of ROLES) {
    const text = render(role, f.binding, f.root);
    assert.match(text, /never in a turn's foreground/, role);
    assert.match(text, /non-activating and unfocused/, role);
  }
});

test('the rendered approval line uses the owner user IDs and the origin, never a stored identity', t => {
  const f = fixture(t), general = render('general', f.binding, f.root);
  assert.match(general, new RegExp(`Workspace approval owner \\(user ID\\): ${id(3)}`));
  assert.match(general, /Configuration source: https:\/\/github\.com\/example\/multica-workspace\./);
  const multi = { ...f.binding, owner_ids: [id(3), id(4)] };
  assert.match(render('general', multi, f.root), /Workspace approval owners \(user IDs\): .*; the first receives autopilot reports/);
});

test('shared autopilot templates carry no catalog identity and no stale repository URL', () => {
  const catalog = readJSON(join(ROOT, 'templates/default.json'));
  const uuid = /[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i;
  for (const [key, path] of Object.entries(catalog.autopilots)) {
    const prompt = readFileSync(join(ROOT, readJSON(join(ROOT, path)).prompt), 'utf8');
    assert.doesNotMatch(prompt, uuid, `${key} embeds a workspace ID`);
    assert.doesNotMatch(prompt, /agent-config/, `${key} names a retired consumer catalog`);
    assert.match(prompt, /\{\{repository\}\}/, `${key} asks the run for its own origin`);
    assert.match(prompt, /just sync/);
  }
});

for (const [name, mutate] of Object.entries({
  unknown: binding => { binding.typo = true; },
  'manifest override': binding => { binding.agent_overrides = { general: { model: 'fallback' } }; },
  'legacy runtime key': binding => { binding.runtime_id = id(2); },
  'non-uuid workspace': binding => { binding.workspace_id = 7; },
  'catalog selector': binding => { binding.catalog = 'other'; },
  'workspace timezone override': binding => { binding.timezone = { name: 'UTC' }; },
  'unknown role': binding => { binding.agent_runtimes.typo = id(2); },
  'observed state': binding => { binding.observed = { agents: {} }; },
  'missing owner': binding => { binding.owner_ids = []; },
  'null runtime': binding => { binding.agent_runtimes.general = null; },
  'missing repository': binding => { binding.repository = null; },
  'missing role': binding => { delete binding.agent_runtimes.release; },
})) test(`binding schema rejects ${name}`, t => {
  const f = fixture(t);
  mutate(f.binding);
  assert.throws(() => resolve(f.binding, f.root), /Invalid binding/);
});

test('a pending runtime blocks deployment before discovery or writes', t => {
  const f = fixture(t);
  f.binding.agent_runtimes.general = id(2);
  const blocked = { ...f.binding, owner_ids: [] };
  assert.throws(() => resolve(blocked, f.root), /Invalid binding|no approval owner/);
});

test('offline validation resolves the catalog with a placeholder binding and exits zero', () => {
  const result = spawnSync(process.execPath, ['scripts/config.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Valid catalog: default; configured/);
  assert.equal(syntheticBinding().identity.workspace_slug, 'validation');
});

test('duplicate label names and duplicate workflow names refuse offline', t => {
  const f = fixture(t);
  const path = join(f.root, 'templates/default.json'), catalog = readJSON(path);
  catalog.labels.wontfix.name = 'bug';
  writeFileSync(path, JSON.stringify(catalog));
  assert.throws(() => resolve(f.binding, f.root), /Duplicate label name/);
});
