import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJSON, resolve } from '../scripts/config.js';
import { fixture } from './support/helpers.js';

// Two shapes, each authored once: a ticket body from to-tickets, a comment from the shared
// contract. Everything else either names the shape or carries its own rule.
const read = path => readFileSync(join(ROOT, path), 'utf8');
const ticket = /<issue-template>([\s\S]*?)<\/issue-template>/.exec(read('skills/to-tickets/SKILL.md'))[1];

test('a ticket body is Branch: plus What, Acceptance and Touch', () => {
  assert.match(ticket, /^Branch: spec\/<epic-key>/m);
  assert.deepEqual([...ticket.matchAll(/^## (.+)$/gm)].map(([, heading]) => heading), ['What', 'Acceptance', 'Touch']);
  assert.doesNotMatch(ticket, /^## Parent$/m);
  assert.doesNotMatch(ticket, /^## Blocked by$/m);
});

test('a comment is the three headings, authored once in the shared contract', () => {
  const shared = read('shared/instructions.md');
  assert.match(shared, /^## Handoffs$/m);
  for (const heading of ['## What', '## Evidence', '## Next']) assert.ok(shared.includes(`\`${heading}\``), heading);
  assert.match(shared, /P2 — file:line: trigger; consequence; fix/);
  assert.doesNotMatch(read('roles/planner.md'), /^## (What|Evidence|Next)$/m);
});

test('no role repeats a delivery rule', () => {
  for (const name of readdirSync(join(ROOT, 'roles')).filter(name => name.endsWith('.md'))) {
    const text = read(`roles/${name}`);
    for (const phrase of ['Branch:', 'Touch:', 'Conventional Commits', 'squash', 'auto-merge', 'one PR'])
      assert.ok(!text.includes(phrase), `roles/${name} repeats ${phrase}`);
  }
});

test('code-review names the five delivery checks', () => {
  const review = read('skills/code-review/SKILL.md');
  const section = /## Delivery checks\n\n([\s\S]*?)\n\n## /.exec(review)?.[1] ?? '';
  assert.equal([...section.matchAll(/^\d+\. /gm)].length, 5);
});

test('grilling ends on one handoff packet and creates nothing first', () => {
  const grilling = read('skills/grilling/SKILL.md');
  for (const field of ['Destination', 'Shape', 'Mode labels', 'Slice outline']) assert.ok(grilling.includes(`**${field}**`), field);
  assert.match(grilling, /no epic, spec or ticket is a side effect/);
  assert.match(grilling, /No spec run starts and no slice is written before the user answers/);
  assert.match(grilling, /The slice freezes when the spec PR opens/);
});

test('the catalog declares no document and a declared document must have a file', t => {
  const catalog = readJSON(join(ROOT, 'templates/default.json'));
  assert.deepEqual(catalog.documents, {});
  const f = fixture(t);
  const path = join(f.root, 'templates/default.json');
  writeFileSync(path, JSON.stringify({ ...catalog, documents: { missing: 'templates/missing.md' } }));
  assert.throws(() => resolve(f.binding, f.root), /ENOENT|missing\.md/);
});
