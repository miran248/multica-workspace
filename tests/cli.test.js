import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../scripts/config.js';
import { fixture } from './support/helpers.js';

test('sync applies in a clean checkout and converges; failures propagate', t => {
  const f = fixture(t);
  // A live skill the catalog no longer declares exercises the delete path.
  f.state.skills.push({ id: '00000000-0000-4000-8000-000000009999', name: 'retired-method', content: 'old', files: [] });
  for (const name of ['scripts', 'package.json']) cpSync(join(ROOT, name), join(f.root, name), { recursive: true });
  symlinkSync(join(ROOT, 'node_modules'), join(f.root, 'node_modules'));
  writeFileSync(join(f.root, '.gitignore'), '.local/\nnode_modules/\n');
  const git = (...args) => execFileSync('git', args, { cwd: f.root, stdio: 'pipe' });
  git('init', '-q');
  git('remote', 'add', 'origin', 'https://github.com/example/multica-workspace.git');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'test: fixture');
  const statePath = join(f.root, '.local/state.json');
  mkdirSync(join(f.root, '.local'), { recursive: true });
  writeFileSync(statePath, JSON.stringify(f.state));
  const env = { ...process.env, PATH: `${join(ROOT, 'tests/support')}:${process.env.PATH}`, FAKE_STATE: statePath };
  const invoke = (cmd, args, extra = {}) => spawnSync(cmd, args, { cwd: f.root, env: { ...env, ...extra }, encoding: 'utf8' });

  const validated = invoke('node', ['scripts/config.js']);
  assert.equal(validated.status, 0, validated.stderr + validated.stdout);
  const first = invoke('node', ['scripts/sync.js']);
  assert.equal(first.status, 0, first.stderr + first.stdout);
  assert.match(first.stdout, /"status": "verified"/);
  assert.match(first.stdout, /"operations": [1-9]/);
  assert.match(first.stdout, /just schedule/);
  assert.ok(!JSON.parse(readFileSync(statePath, 'utf8')).skills.some(skill => skill.name === 'retired-method'));
  const second = invoke('node', ['scripts/sync.js']);
  assert.equal(second.status, 0, second.stderr + second.stdout);
  assert.match(second.stdout, /"operations": 0/);

  const scheduled = invoke('node', ['scripts/schedule.js']);
  assert.equal(scheduled.status, 0, scheduled.stderr + scheduled.stdout);
  assert.match(scheduled.stdout, /"created": true/);
  const again = invoke('node', ['scripts/schedule.js']);
  assert.equal(again.status, 0, again.stderr + again.stdout);
  assert.match(again.stdout, /"created": false/);

  assert.equal(invoke('node', ['scripts/sync.js', '--help']).status, 0);
  const failed = invoke('node', ['scripts/sync.js'], { FAKE_ERROR: '1' });
  assert.equal(failed.status, 7);
  assert.match(failed.stderr, /fake diagnostic/);
  assert.notEqual(invoke('node', ['scripts/sync.js'], { FAKE_INVALID_JSON: '1' }).status, 0);
});

test('the real CLI validates offline and refuses a checkout with no origin', t => {
  const validate = spawnSync(process.execPath, ['scripts/config.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(validate.status, 0, validate.stderr);
  const f = fixture(t);
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts/config.js')], { cwd: f.root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('the recipes and package scripts stay the commands the suite and CI run', () => {
  const justfile = readFileSync(join(ROOT, 'justfile'), 'utf8');
  for (const command of [
    'npm ci',
    'node scripts/config.js',
    'node --test',
    'node scripts/sync.js "$@"',
    'node scripts/schedule.js "$@"',
  ]) assert.ok(justfile.includes(command), `justfile lost: ${command}`);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.validate, 'node scripts/config.js');
  assert.equal(pkg.scripts.test, 'node --test');
});
