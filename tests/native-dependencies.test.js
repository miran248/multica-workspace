import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUTOPILOTS, ROLES, ROOT, compareVersions, readJSON, resolve, syntheticBinding,
} from '../scripts/config.js';
import { deploy } from '../scripts/deploy.js';
import { resolveWorkspace } from '../scripts/workspace.js';
import { catalogFiles, catalogText, fixture, read, writes } from './support/helpers.js';

// The dependency contract has one home per rule: shared `## Delivery` carries the wait as a
// blocker, the Implementer carries the build-ready woken run, the Planner and to-tickets carry
// the edge's place, and the guide states the model once. The retired carriers are pinned by
// absence: `--until-issue`, the stale sweep, and a dependency parked in `blocked`.

const deliveryOf = shared => /^## Delivery\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';

function waitViolations({ shared, implementer, planner, release, tickets, specSkill, review, blocked, guide, glossary, catalog }) {
  const violations = [];
  const delivery = deliveryOf(shared);
  if (!/`--blocked-by`/.test(delivery)) violations.push('shared Delivery: no blocker carrier');
  if (!/blocker, not a status/.test(delivery)) violations.push('shared Delivery: the wait is not a blocker');
  if (!/`blocked` is triage only/.test(delivery)) violations.push('shared Delivery: blocked is not triage only');
  if (/park(ed|s)? (it|the ticket|a dependency)/i.test(delivery)) violations.push('shared Delivery: parks a dependency wait');

  for (const [name, text] of [['roles/implementer.md', implementer], ['roles/release.md', release], ['roles/planner.md', planner]]) {
    if (/--until-issue/.test(text)) violations.push(`${name}: keeps the retired condition`);
    if (text.includes('`ended`')) violations.push(`${name}: keeps the retired clause`);
  }
  if (!/release[^.]*`main`/.test(implementer)) violations.push('roles/implementer.md: no release verification');
  for (const phrase of ['fetch', 'ancestor-check', 'merge `main`', 'retry once'])
    if (!implementer.includes(phrase)) violations.push(`roles/implementer.md: no ${phrase}`);
  if (!/`cancelled` or deleted blocker/.test(implementer)) violations.push('roles/implementer.md: a cancelled or deleted blocker is not parked');
  if (!/`blocked`/.test(implementer)) violations.push('roles/implementer.md: the cancelled blocker has no parking move');

  if (!/--blocked-by <dependency-epic>/.test(planner)) violations.push('roles/planner.md: no epic-named edge');
  if (!/at publish/.test(planner)) violations.push('roles/planner.md: the edge is not set at publish');
  if (!/never spec, release, epic/.test(planner)) violations.push('roles/planner.md: the edge may sit off the delivery children');
  if (!/`via: stage`/.test(planner)) violations.push('roles/planner.md: the stage wait is not the platform blocker');

  if (!/up-to-date requirement/.test(release)) violations.push('roles/release.md: no up-to-date order gate');
  if (!/mergeStateStatus/.test(release)) violations.push('roles/release.md: no mergeStateStatus read');

  if (!/`--blocked-by <dependency-epic>`/.test(tickets)) violations.push('to-tickets: no epic-named edge');
  if (!/at publish/.test(tickets)) violations.push('to-tickets: the edge is not set at publish');
  if (!/never on the spec child, the release child or the epic/.test(tickets))
    violations.push('to-tickets: the three forbidden carriers are not named');
  if (!/not yet filed is filed first/.test(tickets)) violations.push('to-tickets: an unfiled dependency is not filed first');
  if (!/`Blocked by`/.test(specSkill)) violations.push('to-spec: the proposed breakdown has no Blocked by cell');
  if (!/Read each\s+child's `blocked_by`/.test(review)) violations.push('code-review: the published edges are not read');
  if (!/`via: stage`/.test(tickets)) violations.push('to-tickets: no stage wait');
  if (!/no manual intra-epic edge/.test(tickets)) violations.push('to-tickets: a manual intra-epic edge is allowed');
  if (!/same-stage dependency is a slicing defect/.test(tickets)) violations.push('to-tickets: a same-stage dependency is not a slicing defect');

  if (!/`blocked` is triage only/.test(blocked)) violations.push('blocked column: not triage only');
  if (!/`--blocked-by` blocker/.test(blocked)) violations.push('blocked column: the blocker is not the wait');
  if (!/timeline records/.test(blocked)) violations.push('blocked column: no triage route');
  if (/--until-issue/.test(blocked)) violations.push('blocked column: keeps the retired condition');

  for (const phrase of ['`--blocked-by <dependency-epic>`', '`via: stage`', 'no manual intra-epic edge', 'release squash is on `main`'])
    if (!guide.includes(phrase)) violations.push(`docs/factory.md: no ${phrase}`);
  if (!/Multica 0\.13\.0 or newer/.test(guide)) violations.push('docs/factory.md: no platform floor');
  if (!/refuses a lower version before any plan or write/.test(guide)) violations.push('docs/factory.md: no floor refusal');
  if (/--until-issue/.test(guide)) violations.push('docs/factory.md: keeps the retired condition');
  // The guide describes the model once: no second copy of the rule inside it.
  for (const phrase of ['`--blocked-by <dependency-epic>`', '`via: stage`'])
    if (guide.split(phrase).length - 1 !== 1) violations.push(`docs/factory.md: ${phrase} is not stated once`);
  if (!/adds no manual intra-epic edge/.test(guide)) violations.push('docs/factory.md: a manual intra-epic edge is allowed');
  if (guide.split('manual intra-epic edge').length - 1 !== 1) violations.push('docs/factory.md: the manual intra-epic edge is not stated once');

  if (!/\*\*blocker\*\*/.test(glossary)) violations.push('GLOSSARY.md: no blocker term');
  if (!/\*\*stage wait\*\*/.test(glossary)) violations.push('GLOSSARY.md: no stage wait term');
  if (!/\*\*version floor\*\*/.test(glossary)) violations.push('GLOSSARY.md: no version floor term');
  if (!/\*\*blocked\*\* — the triage status/.test(glossary)) violations.push('GLOSSARY.md: blocked is not triage only');

  for (const [path, text] of Object.entries(catalog))
    if (/--until-issue/.test(text)) violations.push(`${path}: keeps the retired condition`);
  return violations;
}

const contract = () => ({
  shared: read('shared/instructions.md'),
  implementer: read('roles/implementer.md'),
  planner: read('roles/planner.md'),
  release: read('roles/release.md'),
  tickets: read('skills/to-tickets/SKILL.md'),
  specSkill: read('skills/to-spec/SKILL.md'),
  review: read('skills/code-review/SKILL.md'),
  blocked: catalogText()['templates/workflows/factory.json']
    ? JSON.parse(read('templates/workflows/factory.json')).steps.find(step => step.status_key === 'blocked').instructions
    : '',
  guide: read('docs/factory.md'),
  glossary: read('GLOSSARY.md'),
  catalog: catalogText(),
});

test('the wait is a blocker named once per carrier and never a status', () => {
  assert.deepEqual(waitViolations(contract()), []);
  // A shared contract that parks a dependency is the retired model.
  assert.notDeepEqual(waitViolations({ ...contract(), shared: contract().shared.replace('`blocked` is triage only.', '`blocked` is triage only. A dependency wait parks a dependency in `blocked` until it clears.') }), []);
  // An Implementer without the sync starts the woken run on a stale base.
  assert.notDeepEqual(waitViolations({ ...contract(), implementer: contract().implementer.replace(/^- Woken by a blocker ending:.*$/m, '') }), []);
  // An edge on the spec child gates a tree the spec lane does not consume.
  assert.notDeepEqual(waitViolations({ ...contract(), tickets: contract().tickets.replace('never on the spec child, the release child or the epic', 'on the spec child too') }), []);
  // A release that keeps the retired condition parks a release the platform already wakes.
  assert.notDeepEqual(waitViolations({ ...contract(), release: `${contract().release} A remaining \`--until-issue\` reads \`ended\`.` }), []);
  // A manual intra-epic edge duplicates the stage wait the platform already materialised.
  assert.notDeepEqual(waitViolations({ ...contract(), guide: `${contract().guide}\n### Second copy\n\nAdd a manual intra-epic edge when a later stage waits.` }), []);
  // A column that still parks a dependency never triages a real blocker.
  assert.notDeepEqual(waitViolations({ ...contract(), blocked: 'A cross-epic dependency waits on an `--until-issue` condition.' }), []);
});

test('the stale sweep is gone from every carrier and explicit in the ledger', () => {
  const removed = ['templates/autopilots/stale-sweep.json', 'templates/autopilots/stale-sweep.md'];
  for (const path of removed) assert.equal(existsSync(join(ROOT, path)), false, `${path} survives`);
  assert.deepEqual(Object.keys(readJSON(join(ROOT, 'templates/default.json')).autopilots), ['config-sync']);
  assert.deepEqual(AUTOPILOTS, ['config-sync']);
  assert.deepEqual(resolve(syntheticBinding()).autopilots, []);
  assert.deepEqual(readJSON(join(ROOT, 'templates/default.json')).autopilots, { 'config-sync': 'templates/autopilots/config-sync.json' });
  // A title rendered identically in every workspace is scoped with `*`, never a consumer slug.
  const ledger = readFileSync(join(ROOT, 'migrations/changelog.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const retire = ledger.filter(event => event.kind === 'retire' && event.entity === 'autopilot');
  assert.deepEqual(retire.map(event => [event.name, event.workspaces]), [['Stale sweep', ['*']]]);
  for (const path of ['docs/factory.md', 'README.md', 'GLOSSARY.md', 'docs/apply.md']) {
    // A link to the retiring ADR is history, not a carrier; the guide may cite it once.
    const prose = read(path).replace(/\]\([^)]*\)/g, '');
    assert.doesNotMatch(prose, /stale-sweep|Stale sweep|### The stale sweep|two or more hours|stale-review guard/, `${path} keeps a sweep carrier`);
  }
  // No offline pin keeps the retired autopilot alive.
  const pins = readdirSync(join(ROOT, 'tests')).filter(name => name.endsWith('.js') && name !== 'native-dependencies.test.js')
    .filter(name => /stale-sweep|Stale sweep|stale-review guard/.test(read(`tests/${name}`)));
  assert.deepEqual(pins, []);
});

test('the ledger wildcard is a stated exception, never a slug-only rule', () => {
  const standard = read('AGENTS.md');
  const guide = read('migrations/README.md');
  assert.ok(standard.includes('or to `"*"` when its title renders identically'), 'AGENTS.md does not state the wildcard exception');
  // The bullet opens with the exception: a slug-only sentence followed by a wildcard carve-out
  // is the contradiction the first review found.
  assert.ok(guide.includes('named workspace slugs, or to `["*"]`'), 'migrations/README.md does not open with the wildcard exception');
  assert.ok(!guide.includes('limits an event to named workspace slugs.'), 'migrations/README.md still states a slug-only rule');
  for (const [path, text] of [['AGENTS.md', standard], ['migrations/README.md', guide]]) {
    assert.match(text, /renders\s+identically\s+in\s+every workspace/, `${path} omits the wildcard's condition`);
    assert.match(text, /anonymous catalog cannot name/, `${path} omits why the wildcard is needed`);
  }
});

test('the catalog declares one platform floor and the resolver refuses below it', () => {
  const floor = readJSON(join(ROOT, 'templates/default.json')).platform.floor;
  assert.equal(floor, '0.13.0');
  // One declaration: the catalog JSON is the only place the version is declared, not documented.
  const declarations = catalogFiles().filter(path => /\.json$/.test(path)).filter(path => /"floor"/.test(read(path)));
  assert.deepEqual(declarations, ['templates/default.json']);
  const binding = syntheticBinding();
  assert.deepEqual(binding.versions, { cli: floor, runtime: floor });
  assert.equal(resolve(binding).platform_floor, floor);
  assert.equal(compareVersions('0.13.0', floor), 0);
  assert.equal(compareVersions('0.12.9', floor), -1);
  assert.equal(compareVersions('0.14.0', floor), 1);
  assert.equal(compareVersions('bad', floor), null);
  assert.equal(compareVersions(null, floor), null);
  // A lower CLI, a lower runtime, both and an unreadable version each refuse and name both.
  for (const versions of [{ cli: '0.12.0', runtime: floor }, { cli: floor, runtime: '0.12.0' }, { cli: '0.12.0', runtime: '0.12.0' }, { cli: null, runtime: floor }]) {
    assert.throws(() => resolve({ ...binding, versions }), /Platform floor 0\.13\.0 or newer required.*syncing CLI.*bound runtime metadata\.cli_version/);
  }
});

test('the live binding reads both versions and a dry run refuses before any write', t => {
  const f = fixture(t);
  const options = { root: f.root, runner: f.runner, repository: f.binding.repository };
  assert.deepEqual(resolveWorkspace(options).binding.versions, { cli: '0.13.0', runtime: '0.13.0' });
  f.state.cliVersion = '0.12.0';
  assert.throws(() => resolve(resolveWorkspace(options).binding, f.root), /Platform floor 0\.13\.0.*syncing CLI 0\.12\.0/);
  f.state.cliVersion = '0.13.0';
  f.state.runtime.metadata.cli_version = '0.12.1';
  assert.throws(() => resolve(resolveWorkspace(options).binding, f.root), /bound runtime metadata\.cli_version 0\.12\.1/);
  f.state.runtime.metadata.cli_version = '0.13.0';
  // The plan and the apply both refuse before a write when the bound versions are below it.
  const below = { ...f.binding, versions: { cli: '0.12.0', runtime: '0.12.1' } };
  f.state.calls = [];
  assert.throws(() => deploy(below, false, f), /Platform floor 0\.13\.0/);
  assert.throws(() => deploy(below, true, f), /Platform floor 0\.13\.0/);
  assert.equal(writes(f.state).length, 0);
  assert.equal(f.state.agents.length, 0);
});

test('the native-dependency carriers resolve from the catalog for every role', () => {
  const resolved = resolve(syntheticBinding());
  assert.equal(resolved.platform_floor, '0.13.0');
  for (const role of ROLES) {
    const text = resolved.agents[role].instructions;
    assert.match(text, /blocker, not a status/, role);
    assert.match(text, /`blocked` is triage only/, role);
  }
  assert.match(resolved.agents.planner.instructions, /--blocked-by <dependency-epic>/);
  assert.match(resolved.agents.implementer.instructions, /ancestor-check/);
  assert.match(resolved.agents.release.instructions, /mergeStateStatus/);
});
