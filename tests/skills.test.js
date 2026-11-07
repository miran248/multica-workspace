import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deploy } from '../scripts/deploy.js';
import { ROOT, readJSON, resolve, sha256 } from '../scripts/config.js';
import { fixture, apply, writes, seedImport, readSkill } from './support/helpers.js';
import { id } from './support/platform.js';

const skill = (f, name) => f.state.skills.find(entry => entry.name === name);
function missing(f, key = 'agent-retro') {
  f.state.skills = f.state.skills.filter(entry => entry.name !== key);
  seedImport(f, key);
}
const journal = f => readJSON(join(f.stateDirectory, 'fixture.json'));

test('every catalog skill is declared once and bound to exactly one role', () => {
  const catalog = readJSON(join(ROOT, 'templates/default.json'));
  const manifest = readJSON(join(ROOT, 'skills/manifest.json'));
  const bound = Object.entries(catalog.agents).flatMap(([role, agent]) => agent.skills.map(skill => [skill, role]));
  const directories = readdirSync(join(ROOT, 'skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  assert.equal(bound.length, 20);
  assert.equal(new Set(bound.map(([name]) => name)).size, 20);
  assert.deepEqual(bound.map(([name]) => name).sort(), directories);
  assert.deepEqual(bound.map(([name]) => name).sort(), manifest.skills.map(entry => entry.logical_id).sort());
  for (const entry of manifest.skills) assert.deepEqual(Object.keys(entry).sort(), ['logical_id', 'provenance']);
});

test('provenance is a record, not a pin: no bytes or hashes in the manifest', () => {
  const manifest = readJSON(join(ROOT, 'skills/manifest.json'));
  assert.equal(manifest.provenance.repo, 'mattpocock/skills');
  assert.equal(manifest.provenance.license, 'MIT');
  assert.match(manifest.provenance.commit, /^[a-f0-9]{40}$/);
  const counts = Object.fromEntries(['identical', 'fork', 'rewrite', 'own'].map(status =>
    [status, manifest.skills.filter(entry => entry.provenance.status === status).length]));
  assert.deepEqual(counts, { identical: 3, fork: 7, rewrite: 4, own: 6 });
  assert.deepEqual(manifest.skills.filter(entry => entry.provenance.status === 'rewrite').map(entry => entry.logical_id).sort(),
    ['diagnosing-bugs', 'domain-modeling', 'setup-multica-project', 'tdd']);
  for (const entry of manifest.skills) {
    assert.equal('sha256' in entry, false, entry.logical_id);
    assert.equal('bytes' in entry, false, entry.logical_id);
    if (entry.provenance.status === 'own') assert.equal('upstream' in entry.provenance, false, entry.logical_id);
    else assert.equal(typeof entry.provenance.upstream, 'string', entry.logical_id);
  }
  assert.match(readFileSync(join(ROOT, 'NOTICE'), 'utf8'), /mattpocock\/skills/);
});

for (const [name, mutate] of Object.entries({
  'missing status': m => delete m.skills[0].provenance,
  'own with upstream': m => { m.skills.find(entry => entry.provenance.status === 'own').provenance.upstream = 'x'; },
  'duplicate upstream': m => { const [first, second] = m.skills.filter(entry => entry.provenance.status !== 'own'); second.provenance.upstream = first.provenance.upstream; },
  'missing upstream': m => { delete m.skills.find(entry => entry.provenance.status === 'fork').provenance.upstream; },
  'missing commit': m => { delete m.provenance.commit; },
  'missing attribution': m => { delete m.provenance.license; },
})) test(`resolver rejects provenance drift: ${name}`, t => {
  const f = fixture(t), path = join(f.root, 'skills/manifest.json'), manifest = readJSON(path);
  mutate(manifest);
  writeFileSync(path, JSON.stringify(manifest));
  assert.throws(() => resolve(f.binding, f.root), /provenance/i);
});

test('a skill directory outside the manifest is refused', t => {
  const f = fixture(t), path = join(f.root, 'skills/manifest.json'), manifest = readJSON(path);
  manifest.skills = manifest.skills.filter(entry => entry.logical_id !== 'agent-retro');
  writeFileSync(path, JSON.stringify(manifest));
  assert.throws(() => resolve(f.binding, f.root), /skills: unknown or missing logical key/);
});

test('a skill bound to two roles is refused', t => {
  const f = fixture(t), path = join(f.root, 'templates/default.json'), catalog = readJSON(path);
  catalog.agents.reviewer.skills.push('agent-retro');
  writeFileSync(path, JSON.stringify(catalog));
  assert.throws(() => resolve(f.binding, f.root), /bound to more than one role/);
});

test('a missing live skill is imported with its supporting files and attached by id', t => {
  const f = fixture(t); missing(f, 'code-review');
  apply(f, { pack() {} });
  const imported = skill(f, 'code-review');
  assert.ok(imported);
  assert.equal(imported.content, readSkill(f.root, 'code-review').content);
  assert.deepEqual(imported.files.map(file => file.path), ['agents/openai.yaml']);
  assert.ok(f.state.agents.find(agent => agent.name === 'reviewer').skills.some(entry => entry.id === imported.id));
  f.state.calls = [];
  apply(f);
  assert.equal(writes(f.state).length, 0);
});

test('a local skill edit plans an update carrying old and new bytes, then converges', t => {
  const f = fixture(t), live = skill(f, 'code-review');
  const content = readFileSync(join(f.root, 'skills/code-review/SKILL.md'), 'utf8') + '\nLocal advance.\n';
  writeFileSync(join(f.root, 'skills/code-review/SKILL.md'), content);
  const plan = deploy(f.binding, false, f);
  const op = plan.operations.find(operation => operation.entity === 'skill' && operation.key === 'code-review');
  assert.equal(op.action, 'update');
  assert.equal(op.id, live.id);
  assert.equal(op.before.sha256, sha256(live.content));
  assert.equal(op.after.sha256, sha256(content));
  assert.deepEqual(op.after.files, [{ path: 'agents/openai.yaml', sha256: sha256(live.files[0].content) }]);
  assert.equal(writes(f.state).length, 0);
  apply(f);
  assert.equal(live.content, content);
  f.state.calls = [];
  apply(f);
  assert.equal(writes(f.state).length, 0);
});

test('a live skill file the catalog no longer lists is deleted', t => {
  const f = fixture(t), live = skill(f, 'code-review');
  live.files.push({ id: id(2100), path: 'agents/stale.md', content: 'stale' });
  apply(f);
  assert.deepEqual(live.files.map(entry => entry.path), ['agents/openai.yaml']);
  assert.ok(f.state.calls.some(call => call[1] === 'skill' && call[2] === 'files' && call[3] === 'delete'));
  f.state.calls = [];
  apply(f);
  assert.equal(writes(f.state).length, 0);
});

test('a half-applied skill update resumes from live bytes without duplicating', t => {
  const f = fixture(t), live = skill(f, 'code-review');
  const content = readFileSync(join(f.root, 'skills/code-review/SKILL.md'), 'utf8') + '\nResume.\n';
  writeFileSync(join(f.root, 'skills/code-review/SKILL.md'), content);
  let broken = false;
  const runner = (...args) => {
    if (!broken && args[1] === 'skill' && args[2] === 'files' && args[3] === 'upsert') { broken = true; throw Error('interrupted update'); }
    return f.runner(...args);
  };
  assert.throws(() => apply(f, { runner }), /interrupted update/);
  assert.equal(journal(f).status, 'partially-applied');
  const result = apply(f);
  assert.equal(result.status, 'verified');
  assert.equal(live.content, content);
  assert.equal(f.state.skills.filter(entry => entry.name === 'code-review').length, 1);
});

test('an import whose readback does not match leaves the run partial', t => {
  const f = fixture(t); missing(f); f.state.importContent['agent-retro'] = 'wrong';
  assert.throws(() => apply(f, { pack() {} }), /Readback mismatch/);
  assert.equal(journal(f).status, 'partially-applied');
});

test('duplicate live skills with one name refuse before any write', t => {
  const f = fixture(t), live = skill(f, 'tdd');
  f.state.skills.push({ ...live, id: id(7777) });
  f.state.calls = [];
  assert.throws(() => apply(f), /Multiple live skills named tdd/);
  assert.equal(writes(f.state).length, 0);
});
