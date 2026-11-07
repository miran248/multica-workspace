import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sync } from '../scripts/sync.js';
import { ROOT, readJSON, resolve } from '../scripts/config.js';
import { fixture, writes } from './support/helpers.js';
import { id } from './support/platform.js';

const options = f => ({ root: f.root, runner: f.runner, stateDirectory: f.stateDirectory, source: f.source, log() {} });
const catalog = () => readJSON(join(ROOT, 'templates/default.json')).labels;
const editCatalog = (f, mutate) => {
  const path = join(f.root, 'templates/default.json'), value = readJSON(path);
  mutate(value.labels);
  writeFileSync(path, JSON.stringify(value));
};
const writeLedger = (f, events) => writeFileSync(join(f.root, 'migrations/changelog.jsonl'),
  events.map(event => JSON.stringify(event)).join('\n') + '\n');

test('the shared catalog declares seven triage labels and seven flags as workspace issue labels', () => {
  const labels = catalog();
  const names = {
    bug: 'bug',
    enhancement: 'enhancement',
    'human-assigned': 'human-assigned',
    'manual-merge': 'manual-merge',
    'needs-info': 'needs-info',
    'needs-triage': 'needs-triage',
    'ready-for-agent': 'ready-for-agent',
    'ready-for-human': 'ready-for-human',
    'wayfinder-grilling': 'wayfinder:grilling',
    'wayfinder-map': 'wayfinder:map',
    'wayfinder-prototype': 'wayfinder:prototype',
    'wayfinder-research': 'wayfinder:research',
    'wayfinder-task': 'wayfinder:task',
    wontfix: 'wontfix'
  };
  assert.deepEqual(Object.keys(labels).sort(), Object.keys(names).sort());
  assert.deepEqual(Object.entries(labels).filter(([, label]) => label.triage !== false).map(([key]) => key).sort(),
    ['bug', 'enhancement', 'needs-info', 'needs-triage', 'ready-for-agent', 'ready-for-human', 'wontfix']);
  for (const [key, label] of Object.entries(labels)) {
    assert.equal(label.name, names[key], key);
    assert.equal(label.resource_type, 'issue', key);
    assert.match(label.color, /^#[0-9a-f]{6}$/, key);
    assert.ok(label.description.length > 0, key);
  }
  const liveNames = Object.values(labels).map(label => label.name);
  assert.equal(new Set(liveNames).size, liveNames.length);
});

test('every agent instruction carries the canonical-role-to-label mapping', t => {
  const f = fixture(t), resolved = resolve(f.binding, f.root);
  const mapping = 'Triage labels (canonical role → workspace issue label): bug→bug, enhancement→enhancement, ' +
    'needs-info→needs-info, needs-triage→needs-triage, ready-for-agent→ready-for-agent, ' +
    'ready-for-human→ready-for-human, wontfix→wontfix. Every triaged issue carries exactly one category and one state label.';
  for (const role of Object.keys(resolved.agents)) assert.ok(resolved.agents[role].instructions.includes(mapping), role);
});

test('duplicate catalog label names are refused before any write', t => {
  const f = fixture(t);
  editCatalog(f, labels => { labels.wontfix.name = 'bug'; });
  assert.throws(() => resolve(f.binding, f.root), /Duplicate label name/);
});

test('sync creates the fourteen labels by name and then converges', t => {
  const f = fixture(t);
  const result = sync({ ...options(f), repository: f.binding.repository });
  assert.equal(result.result.status, 'verified');
  assert.deepEqual(f.state.labels.map(label => label.name).sort(), Object.values(catalog()).map(label => label.name).sort());
  for (const [, definition] of Object.entries(catalog())) {
    const live = f.state.labels.find(label => label.name === definition.name);
    assert.equal(live.color, definition.color);
    assert.equal(live.description, definition.description);
  }
  f.state.calls = [];
  const second = sync({ ...options(f), repository: f.binding.repository });
  assert.equal(second.result.operations, 0);
  assert.equal(writes(f.state).length, 0);
});

test('a same-name live label is updated in place, never duplicated', t => {
  const f = fixture(t);
  f.state.labels.push({ id: id(810), name: 'wontfix', color: '#111111', description: 'stale', resource_type: 'issue' });
  sync({ ...options(f), repository: f.binding.repository });
  assert.equal(f.state.labels.filter(label => label.name === 'wontfix').length, 1);
  const live = f.state.labels.find(label => label.id === id(810));
  assert.equal(live.color, catalog().wontfix.color);
  assert.equal(f.state.labels.length, 14);
});

test('a drifted live label is updated in place and keeps its identity', t => {
  const f = fixture(t);
  sync({ ...options(f), repository: f.binding.repository });
  const live = f.state.labels.find(label => label.name === 'ready-for-agent');
  live.color = '#000000';
  live.description = 'stale';
  f.state.calls = [];
  sync({ ...options(f), repository: f.binding.repository });
  const after = f.state.labels.find(label => label.id === live.id);
  assert.equal(after.color, catalog()['ready-for-agent'].color);
  assert.equal(after.description, catalog()['ready-for-agent'].description);
  assert.equal(f.state.labels.length, 14);
});

test('a catalog label rename declared in the ledger keeps the live label identity', t => {
  const f = fixture(t);
  sync({ ...options(f), repository: f.binding.repository });
  const before = f.state.labels.find(label => label.name === 'ready-for-agent');
  editCatalog(f, labels => { labels['ready-for-agent'].name = 'agent-ready'; });
  writeLedger(f, [{ kind: 'rename', entity: 'label', from: 'ready-for-agent', to: 'agent-ready' }]);
  sync({ ...options(f), repository: f.binding.repository });
  const after = f.state.labels.find(label => label.id === before.id);
  assert.equal(after.name, 'agent-ready');
  assert.ok(!f.state.labels.some(label => label.name === 'ready-for-agent'));
  assert.equal(f.state.labels.length, 14);
  assert.match(resolve(f.binding, f.root).agents.general.instructions, /ready-for-agent→agent-ready/);
});

test('a rename onto a name another live label already uses is refused', t => {
  const f = fixture(t);
  sync({ ...options(f), repository: f.binding.repository });
  f.state.labels.push({ id: id(814), name: 'agent-ready', color: '#123456', description: 'other', resource_type: 'issue' });
  editCatalog(f, labels => { labels['ready-for-agent'].name = 'agent-ready'; });
  writeLedger(f, [{ kind: 'rename', entity: 'label', from: 'ready-for-agent', to: 'agent-ready' }]);
  f.state.calls = [];
  assert.throws(() => sync({ ...options(f), repository: f.binding.repository }), /both ready-for-agent and agent-ready exist as label/);
  assert.equal(writes(f.state).length, 0);
});

test('an unused undeclared label is retired', t => {
  const f = fixture(t);
  f.state.labels.push({ id: id(813), name: 'unused-flag', color: '#123456', description: 'stale', resource_type: 'issue', usage_count: 0 });
  const result = sync({ ...options(f), repository: f.binding.repository });
  assert.deepEqual(result.result.retired, [{ entity: 'label', key: 'unused-flag' }]);
  assert.ok(!f.state.labels.some(label => label.name === 'unused-flag'));
});

test('a used undeclared label refuses until a retire event authorizes the detach', t => {
  const f = fixture(t);
  f.state.labels.push({ id: id(815), name: 'in-use', color: '#123456', description: 'x', resource_type: 'issue', usage_count: 2 });
  assert.throws(() => sync({ ...options(f), repository: f.binding.repository }), /in-use is used by 2 issue/);
  assert.ok(f.state.labels.some(label => label.name === 'in-use'));
  writeLedger(f, [{ kind: 'retire', entity: 'label', name: 'in-use' }]);
  const result = sync({ ...options(f), repository: f.binding.repository });
  assert.deepEqual(result.result.retired, [{ entity: 'label', key: 'in-use' }]);
});

test('a declared label with the wrong live resource type stops the run before any write', t => {
  const f = fixture(t);
  sync({ ...options(f), repository: f.binding.repository });
  f.state.labels.find(label => label.name === 'bug').resource_type = 'skill';
  f.state.calls = [];
  assert.throws(() => sync({ ...options(f), repository: f.binding.repository }), /Label resource type drift: bug/);
  assert.equal(writes(f.state).length, 0);
});

test('a declared label missing from the workspace is recreated by name', t => {
  const f = fixture(t);
  sync({ ...options(f), repository: f.binding.repository });
  f.state.labels = f.state.labels.filter(label => label.name !== 'bug');
  f.state.calls = [];
  sync({ ...options(f), repository: f.binding.repository });
  assert.ok(f.state.labels.some(label => label.name === 'bug'));
  assert.equal(f.state.labels.length, 14);
});

test('the shared instructions file stays the generic capped contract', () => {
  assert.ok(!readFileSync(join(ROOT, 'shared/instructions.md'), 'utf8').includes('Triage labels'));
});
