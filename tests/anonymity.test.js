import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from '../scripts/config.js';

const SKIP = new Set(['.git', 'node_modules', '.local']);
const SKIP_FILES = new Set(['package-lock.json']);
const TEXT = /\.(md|json|js|jsonl|txt|yml|yaml)$/;
const files = (directory, root = directory) => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (SKIP.has(entry.name)) return [];
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return files(path, root);
  const name = relative(root, path);
  return TEXT.test(entry.name) && !SKIP_FILES.has(name) ? [name] : [];
});
const ANONYMOUS_UUID = /^00000000-0000-4000-8000-/;
const violations = (name, text) => {
  const found = [];
  for (const match of text.matchAll(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/gi)) {
    if (!ANONYMOUS_UUID.test(match[0])) found.push({ name, rule: 'live UUID', match: match[0] });
  }
  for (const [rule, pattern] of Object.entries({
    'personal email': /[\w.+-]+@(?!example\.test|github\.com)[\w-]+\.[\w.]+/g,
    'consumer workspace': new RegExp(['miran' + '248', '248' + '-sh'].join('|'), 'g'),
    'consumer project': new RegExp('\\b' + 'min' + 'er\\b', 'g'),
    'absolute home path': /\/Users\/|\/home\//g,
  })) {
    for (const match of text.matchAll(pattern)) found.push({ name, rule, match: match[0] });
  }
  return found;
};

test('the catalog, docs and scripts carry no live identity, consumer name or home path', () => {
  const names = files(ROOT);
  assert.ok(names.length > 50);
  const found = names.flatMap(name => violations(name, readFileSync(join(ROOT, name), 'utf8')));
  assert.deepEqual(found, []);
});

test('there is no committed workspace manifest layer', () => {
  assert.equal(existsSync(join(ROOT, 'workspaces')), false);
  assert.equal(existsSync(join(ROOT, 'archive')), false);
  assert.equal(existsSync(join(ROOT, 'skills/manifest.json')), true);
});

test('the license and upstream attribution are present and public', () => {
  assert.match(readFileSync(join(ROOT, 'LICENSE'), 'utf8'), /MIT License/);
  const notice = readFileSync(join(ROOT, 'NOTICE'), 'utf8');
  assert.match(notice, /mattpocock\/skills/);
  assert.match(notice, /Copyright \(c\) 2026 Matt Pocock/);
  assert.match(notice, /4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/);
  assert.match(readFileSync(join(ROOT, 'README.md'), 'utf8'), /holds no workspace ID/);
  assert.equal(statSync(join(ROOT, 'docs/apply.md')).isFile(), true);
});
