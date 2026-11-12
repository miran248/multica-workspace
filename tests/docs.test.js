import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ROOT } from '../scripts/config.js';

const read = path => readFileSync(join(ROOT, path), 'utf8');

test('the knowledge layer exists and the routing file links to it', () => {
  for (const path of ['GLOSSARY.md', 'docs/README.md', 'docs/adr/README.md', 'docs/specs/README.md', 'docs/apply.md', 'docs/factory.md'])
    assert.equal(existsSync(join(ROOT, path)), true, `${path} is missing`);

  const routing = read('AGENTS.md');
  for (const link of ['docs/README.md', 'GLOSSARY.md', 'docs/adr/', 'docs/specs/'])
    assert.ok(routing.includes(link), `AGENTS.md does not link ${link}`);
});

test('every relative link in the catalog documentation resolves', () => {
  const docs = readdirSync(join(ROOT, 'docs'), { recursive: true })
    .filter(name => name.endsWith('.md')).map(name => `docs/${name}`);
  const sources = ['AGENTS.md', 'README.md', 'GLOSSARY.md', 'templates/handoff.md', ...docs];
  const dangling = [];
  for (const source of sources) {
    for (const [, target] of read(source).matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(https?:|#|mailto:)/.test(target) || target.startsWith('<')) continue;
      const path = join(ROOT, dirname(source), target.split('#')[0]);
      if (!existsSync(path)) dangling.push(`${source}: ${target}`);
    }
  }
  assert.deepEqual(dangling, []);
});

test('the handoff template points at a caps table that exists', () => {
  assert.match(read('templates/handoff.md'), /\[README\.md\]\(\.\.\/README\.md#brevity-caps\)/);
  const caps = read('README.md');
  assert.match(caps, /^## Brevity caps$/m);
  for (const cap of ['200 words', '130 words', '600 bytes', '1 KB', '800 bytes'])
    assert.ok(caps.includes(cap), `README.md omits the ${cap} cap`);
});

test('every ADR is numbered and one decision long', () => {
  const files = readdirSync(join(ROOT, 'docs/adr')).filter(name => name.endsWith('.md') && name !== 'README.md');
  assert.ok(files.length > 0);
  for (const name of files) {
    assert.match(name, /^\d{4}-[a-z0-9-]+\.md$/, `${name} is not numbered`);
    const text = read(`docs/adr/${name}`);
    for (const heading of ['## Context', '## Decision', '## Consequences'])
      assert.ok(text.includes(heading), `${name} is missing ${heading}`);
  }
});

test('every spec records its acceptance instead of a pending proposal', () => {
  const files = readdirSync(join(ROOT, 'docs/specs')).filter(name => name.endsWith('.md') && name !== 'README.md');
  assert.ok(files.length > 0);
  for (const name of files) {
    const body = read(`docs/specs/${name}`);
    assert.match(body.split('\n')[0], /^# /, `${name} does not open with its title`);
    assert.match(body, /^Accepted \d{4}-\d{2}-\d{2}\./m, `${name} does not record an acceptance date`);
    assert.ok(!/^Proposed\./m.test(body), `${name} still reads as proposed`);
  }
});
