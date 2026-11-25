import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLedger } from '../scripts/migrations.js';
import { resolve } from '../scripts/config.js';
import { sync } from '../scripts/sync.js';
import { fixture, writes } from './support/helpers.js';
import { id } from './support/platform.js';

const ledgerPath = root => join(root, 'migrations/changelog.jsonl');
const writeLedger = (f, events) => writeFileSync(ledgerPath(f.root), events.map(event => JSON.stringify(event)).join('\n') + '\n');
const options = f => ({ root: f.root, runner: f.runner, stateDirectory: f.stateDirectory, source: f.source, log() {} });

test('the ledger loads in order and ignores blank lines', t => {
  const f = fixture(t);
  writeLedger(f, [{ kind: 'rename', entity: 'workflow', from: 'Delivery', to: 'Factory' }, { kind: 'retire', entity: 'label', name: 'stale' }]);
  const events = loadLedger(f.root);
  assert.deepEqual(events.map(event => [event.line, event.kind]), [[1, 'rename'], [2, 'retire']]);
});

test('the ledger rejects malformed events before any platform read', t => {
  for (const event of [
    { kind: 'move', entity: 'label', name: 'x' },
    { kind: 'rename', entity: 'nope', from: 'a', to: 'b' },
    { kind: 'rename', entity: 'label', from: 'a', to: 'b', extra: true },
    { kind: 'rename', entity: 'label', from: 'a', to: 'a' },
    { kind: 'retire', entity: 'label', name: 'bug' },
    { kind: 'rename', entity: 'autopilot', from: 'a', to: 'b' },
  ]) {
    const f = fixture(t); writeLedger(f, [event]);
    assert.throws(() => resolve(f.binding, f.root), /Migration ledger/);
  }
});

test('a rename must end at a declared name or chain into a later event', t => {
  const f = fixture(t);
  writeLedger(f, [{ kind: 'rename', entity: 'label', from: 'old', to: 'nowhere' }]);
  assert.throws(() => resolve(f.binding, f.root), /neither declared nor renamed later/);
  writeLedger(f, [{ kind: 'rename', entity: 'label', from: 'old', to: 'mid' }, { kind: 'rename', entity: 'label', from: 'mid', to: 'bug' }]);
  assert.doesNotThrow(() => resolve(f.binding, f.root));
});

test('a rename cannot start from a name the catalog still declares', t => {
  const f = fixture(t);
  writeLedger(f, [{ kind: 'rename', entity: 'label', from: 'bug', to: 'defect' }]);
  assert.throws(() => resolve(f.binding, f.root), /still declared/);
});

test('an event scoped to another workspace is ignored here', t => {
  const f = fixture(t);
  writeLedger(f, [{ kind: 'rename', entity: 'label', from: 'unrelated-old', to: 'unrelated-new', workspaces: ['another-workspace'] }]);
  assert.doesNotThrow(() => resolve(f.binding, f.root));
});

test('a `*`-scoped autopilot event applies in every workspace', t => {
  const f = fixture(t);
  // The catalog declares no `Retired sweep`; the event authorizes its retirement wherever it runs.
  writeLedger(f, [{ kind: 'retire', entity: 'autopilot', name: 'Retired sweep', workspaces: ['*'] }]);
  assert.deepEqual(resolve(f.binding, f.root).migrations.map(event => event.name), ['Retired sweep']);
  // A named slug still filters: the event does not leak into another workspace.
  writeLedger(f, [{ kind: 'retire', entity: 'autopilot', name: 'Retired sweep', workspaces: ['another-workspace'] }]);
  assert.deepEqual(resolve(f.binding, f.root).migrations, []);
});

test('two chained renames apply in order and keep the object identity', t => {
  const f = fixture(t);
  f.state.labels.push({ id: id(820), name: 'ancient-label', color: '#111111', description: 'x', resource_type: 'issue' });
  const path = join(f.root, 'templates/default.json'), catalog = JSON.parse(readFileSync(path, 'utf8'));
  catalog.labels['ready-for-agent'].name = 'agent-ready';
  writeFileSync(path, JSON.stringify(catalog));
  writeLedger(f, [
    { kind: 'rename', entity: 'label', from: 'ancient-label', to: 'middle-label' },
    { kind: 'rename', entity: 'label', from: 'middle-label', to: 'agent-ready' },
  ]);
  sync({ ...options(f), repository: f.binding.repository });
  assert.ok(!f.state.labels.some(label => label.name === 'ancient-label' || label.name === 'middle-label'));
  assert.equal(f.state.labels.find(label => label.name === 'agent-ready').id, id(820));
});

test('the two epic-label renames keep the live identity and their issues', t => {
  const f = fixture(t);
  f.state.labels.push({ id: id(830), name: 'human-assigned', color: '#d946ef', description: 'old', resource_type: 'issue', usage_count: 3 });
  f.state.labels.push({ id: id(831), name: 'manual-merge', color: '#f97316', description: 'old', resource_type: 'issue', usage_count: 2 });
  writeLedger(f, [
    { kind: 'rename', entity: 'label', from: 'human-assigned', to: 'has-human-implementer' },
    { kind: 'rename', entity: 'label', from: 'manual-merge', to: 'has-human-release' },
  ]);
  const result = sync({ ...options(f), repository: f.binding.repository });
  assert.equal(result.result.status, 'verified');
  const implements_ = f.state.labels.find(label => label.id === id(830));
  const releases = f.state.labels.find(label => label.id === id(831));
  assert.equal(implements_.name, 'has-human-implementer');
  assert.equal(implements_.usage_count, 3);
  assert.equal(releases.name, 'has-human-release');
  assert.equal(releases.usage_count, 2);
  assert.ok(!f.state.labels.some(label => ['human-assigned', 'manual-merge'].includes(label.name)));
  assert.equal(f.state.labels.length, 14);
  assert.deepEqual(result.result.migrations, ['human-assigned→has-human-implementer', 'manual-merge→has-human-release']);
});

test('purging a consumed rename leaves the catalog as the only declaration', t => {
  const f = fixture(t);
  const path = join(f.root, 'templates/default.json'), catalog = JSON.parse(readFileSync(path, 'utf8'));
  catalog.labels['ready-for-agent'].name = 'agent-ready';
  writeFileSync(path, JSON.stringify(catalog));
  writeLedger(f, [{ kind: 'rename', entity: 'label', from: 'ready-for-agent', to: 'agent-ready' }]);
  sync({ ...options(f), repository: f.binding.repository });
  writeFileSync(ledgerPath(f.root), '');
  f.state.calls = [];
  const result = sync({ ...options(f), repository: f.binding.repository });
  assert.equal(result.result.operations, 0);
  assert.equal(writes(f.state).length, 0);
});
