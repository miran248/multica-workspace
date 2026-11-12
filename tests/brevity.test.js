import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJSON } from '../scripts/config.js';

// Caps: generic shared contract <=220 words; role contracts <=130; descriptions <=100 chars.
const wordCount = path => readFileSync(join(ROOT, path), 'utf8').trim().split(/\s+/).filter(Boolean).length;
const overCap = (cap, paths) => paths
  .map(path => ({ path, words: wordCount(path) }))
  .filter(({ words }) => words > cap)
  .map(({ path, words }) => `${path}: ${words} > ${cap}`);

test('shared instructions stay within 220 words', () => {
  assert.deepEqual(overCap(220, ['shared/instructions.md']), []);
});

test('every role stays within 130 words', () => {
  const roles = readdirSync(join(ROOT, 'roles')).filter(name => name.endsWith('.md')).sort().map(name => `roles/${name}`);
  assert.deepEqual(overCap(130, roles), []);
});

test('template descriptions stay within 100 characters', () => {
  const over = [];
  for (const name of readdirSync(join(ROOT, 'templates')).filter(name => name.endsWith('.json')).sort()) {
    const template = readJSON(join(ROOT, 'templates', name));
    for (const [kind, entries] of Object.entries({ agent: template.agents, squad: template.squads })) {
      for (const [key, entry] of Object.entries(entries)) {
        if (entry.description.length > 100) over.push(`${name} ${kind} ${key}: ${entry.description.length} > 100`);
      }
    }
  }
  assert.deepEqual(over, []);
});

test('shared instructions keep only generic rules; operational gates live in roles', () => {
  const shared = readFileSync(join(ROOT, 'shared/instructions.md'), 'utf8');
  for (const heading of ['One gate', 'Production authority', 'Stage advance']) assert.ok(!shared.includes(heading), heading);
  assert.match(readFileSync(join(ROOT, 'roles/planner.md'), 'utf8'), /production:/);
  assert.match(readFileSync(join(ROOT, 'roles/release.md'), 'utf8'), /requires second approval/);
  assert.match(readFileSync(join(ROOT, 'roles/implementer.md'), 'utf8'), /in_review/);
  assert.match(readFileSync(join(ROOT, 'roles/reviewer.md'), 'utf8'), /awaiting_merge/);
});
