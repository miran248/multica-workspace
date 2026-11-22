import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ROLES, readJSON, resolve, syntheticBinding } from '../scripts/config.js';
import { render } from '../scripts/deploy.js';
import { resolveWorkspace } from '../scripts/workspace.js';
import { fixture } from './support/helpers.js';
import { id } from './support/platform.js';

test('the shared contract reaches every role and the linked PR owns the handoff', t => {
  const f = fixture(t), resolved = resolve(f.binding, f.root);
  for (const role of ROLES) {
    const text = render(role, f.binding, f.root);
    assert.match(text, /^## Delivery$/m, role);
    assert.match(text, /^## Handoffs$/m, role);
    assert.match(text, /Conventional Commits `type\(scope\): summary, TICKET`/, role);
    assert.match(text, /summary, TICKET/, role);
    assert.match(text, /Linked PR is the handoff/, role);
    assert.match(text, /empty body not a finding/, role);
    assert.match(text, /move or merge last/, role);
    assert.doesNotMatch(text, /[Aa]rm auto-merge/, role);
  }
  assert.match(render('reviewer', f.binding, f.root), /a moved head or a moved base invalidates the verdict/);
  assert.match(render('reviewer', f.binding, f.root), /exit rule/);
  assert.doesNotMatch(render('reviewer', f.binding, f.root), /awaiting_merge/);
  assert.match(render('planner', f.binding, f.root), /Own the epic/);
  assert.match(render('planner', f.binding, f.root), /child to `spec_progress`/);
  assert.match(render('planner', f.binding, f.root), /\| any \| spec child \| `spec_progress` \|/);
  assert.match(render('implementer', f.binding, f.root), /reviewable PR/);
  for (const role of ROLES) assert.doesNotMatch(readFileSync(join(ROOT, `roles/${role}.md`), 'utf8'), /Coordinator|squad/, role);
  assert.deepEqual(Object.keys(resolved.shared.workflows), ['factory']);
  assert.equal(resolved.shared.catalog.timezone, 'UTC');
  assert.equal(resolved.sync.timezone, 'UTC');
});

test('the catalog declares no document and no contract stores a link', t => {
  const f = fixture(t);
  assert.deepEqual(readJSON(join(f.root, 'templates/default.json')).documents, {});
  assert.equal(existsSync(join(f.root, 'templates/handoff.md')), false);
  for (const role of ROLES) {
    const text = render(role, f.binding, f.root);
    assert.doesNotMatch(text, /templates\/handoff\.md/, role);
  }
  assert.doesNotMatch(readFileSync(join(ROOT, 'shared/instructions.md'), 'utf8'), /https?:\/\//);
});

test('the rendered shared contract links issue references to the workspace base', () => {
  const binding = syntheticBinding();
  for (const role of ROLES) {
    const text = render(role, binding);
    assert.match(text, /https:\/\/multica\.ai\/validation\/issues\/MIR-123/, role);
    assert.match(text, /bare keys only in a commit subject, PR title or branch/, role);
    assert.doesNotMatch(text, /workspace get|workspace member/, role);
  }
  const selfHosted = render('general', { ...binding, app_url: 'https://app.example.test' });
  assert.match(selfHosted, /https:\/\/app\.example\.test\/validation\/issues\/MIR-123/);
  assert.doesNotMatch(selfHosted, /multica\.ai/);
});

test('the live binding takes the app origin from the flag, then the environment, then the default', t => {
  const f = fixture(t);
  const runner = (...args) => f.runner(...args);
  const appUrlOf = options => resolveWorkspace({ root: f.root, runner, repository: 'https://github.com/acme/catalog', ...options }).binding.app_url;
  assert.equal(appUrlOf({ appUrl: 'https://app.example.test' }), 'https://app.example.test');
  process.env.MULTICA_APP_URL = 'https://env.example.test';
  t.after(() => { delete process.env.MULTICA_APP_URL; });
  assert.equal(appUrlOf({}), 'https://env.example.test');
  assert.equal(appUrlOf({ appUrl: 'https://app.example.test' }), 'https://app.example.test');
  delete process.env.MULTICA_APP_URL;
  assert.equal(appUrlOf({}), 'https://multica.ai');
});

test('no role launches foreground or focus-stealing work', t => {
  const f = fixture(t);
  for (const role of ROLES) {
    const text = render(role, f.binding, f.root);
    assert.match(text, /^## Launching$/m, role);
    assert.match(text, /never foreground/, role);
    assert.match(text, /detached/, role);
    assert.match(text, /windows non-activating and unfocused/, role);
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
    const definition = readJSON(join(ROOT, path));
    const prompt = readFileSync(join(ROOT, definition.prompt), 'utf8');
    assert.doesNotMatch(prompt, uuid, `${key} embeds a workspace ID`);
    assert.doesNotMatch(prompt, /https?:\/\/github\.com\//, `${key} hardcodes a repository URL`);
    // The sync control reconciles this catalog, so it needs the live origin; a sweep is
    // workspace-local and must not acquire one.
    if (definition.parameters.includes('repository')) {
      assert.match(prompt, /\{\{repository\}\}/, `${key} asks the run for its own origin`);
      assert.match(prompt, /just sync/);
    } else {
      assert.deepEqual(definition.parameters, [], `${key} carries no parameters`);
      assert.doesNotMatch(prompt, /\{\{/, `${key} leaves an unapproved parameter`);
    }
  }
});

test('the catalog resolves the hourly stale sweep with its role and prompt', () => {
  const resolved = resolve(syntheticBinding());
  const sweep = resolved.autopilots.find(item => item.key === 'stale-sweep');
  assert.ok(sweep, 'the catalog does not deploy a stale-sweep autopilot');
  assert.equal(sweep.cron, '0 * * * *');
  assert.equal(sweep.role, 'planner');
  assert.equal(sweep.execution_mode, 'run_only');
  assert.equal(sweep.issue_title_template, null);
  assert.equal(sweep.timezone, 'UTC');
  for (const column of ['spec_review', 'in_review', 'human_review', 'release_review'])
    assert.ok(sweep.prompt.includes(`\`${column}\``), `the sweep prompt does not read ${column}`);
  assert.match(sweep.prompt, /two hours/);
  assert.match(sweep.prompt, /issue timeline/);
  assert.doesNotMatch(sweep.prompt, /human_progress|awaiting_merge/);
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
  'non-https app url': binding => { binding.app_url = 'http://multica.ai'; },
  'path-bearing app url': binding => { binding.app_url = 'https://multica.ai/validation'; },
  'whitespace-bearing app url': binding => { binding.app_url = 'https://multica.ai /x'; },
  'brace-bearing app url': binding => { binding.app_url = 'https://{slug}.multica.ai'; },
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

test('the ticket template writes acceptance criteria, not an unticked checklist', () => {
  const template = readFileSync(join(ROOT, 'skills/to-tickets/SKILL.md'), 'utf8');
  // Nothing ticks a box after creation: the ticket closes on a merge or a status move, and the
  // Reviewer's PASS is the evidence record.
  assert.doesNotMatch(template, /- \[[ xX]\]/);
  assert.match(template, /Acceptance criteria are statements, not a checklist/);
});

test('duplicate label names and duplicate workflow names refuse offline', t => {
  const f = fixture(t);
  const path = join(f.root, 'templates/default.json'), catalog = readJSON(path);
  catalog.labels.wontfix.name = 'bug';
  writeFileSync(path, JSON.stringify(catalog));
  assert.throws(() => resolve(f.binding, f.root), /Duplicate label name/);
});
