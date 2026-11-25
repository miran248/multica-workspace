import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJSON } from '../scripts/config.js';
import { GUIDE, MARKERS, WORKFLOW, renderDocument } from '../scripts/render-factory.js';

// The guide's column table and status graph are a projection of the workflow file: the suite
// renders them into memory and compares, so a hand edit inside either block is a failure and
// not a review finding. The promotion table and the exit rule around the blocks stay authored,
// and both must name only status keys the workflow resolves.
const workflow = readJSON(join(ROOT, WORKFLOW));
const document = readFileSync(join(ROOT, GUIDE), 'utf8');
const steps = new Map(workflow.steps.map(step => [step.status_key, step]));
const REVIEWS = ['spec_review', 'in_review', 'human_review', 'release_review'];
function block(text, name) {
  const [start, end] = MARKERS[name];
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  return from < 0 || to < from ? '' : text.slice(from, to + end.length);
}

function promotionSection(text) {
  return /## Promotion and the exit rule\n\n([\s\S]*?)\n\n## /.exec(text)?.[1] ?? '';
}

function guideViolations(text) {
  const violations = [];
  try {
    if (renderDocument(text, workflow) !== text) violations.push('the generated blocks differ from the workflow');
  } catch (error) {
    violations.push(error.message);
  }
  for (const name of Object.keys(MARKERS)) {
    const [start, end] = MARKERS[name];
    if (text.split(start).length !== 2 || text.split(end).length !== 2) violations.push(`expected one ${name} marker block`);
  }
  // The generated graph is the only drawing and the generated table the only column list.
  const prose = text.replace(block(text, 'graph'), '').replace(block(text, 'columns'), '');
  if ((text.match(/```mermaid/g) ?? []).length !== 1) violations.push('there is not exactly one generated graph');
  if (/```mermaid/.test(prose)) violations.push('a hand-written graph remains');
  if (/^\|\s*Column\s*\|\s*Handler\s*\|/m.test(prose)) violations.push('a hand-written column table remains');
  if (/^\|\s*Status\s*\|\s*Icon\s*\|\s*Colour\s*\|/m.test(prose)) violations.push('a hand-written presentation table remains');

  const graph = block(text, 'graph');
  const columns = block(text, 'columns');
  for (const name of ['graph', 'columns'])
    if (/has-human-release|has-human-implementer/.test(block(text, name)))
      violations.push(`the generated ${name} restates a label`);
  for (const key of steps.keys()) {
    if (!graph.includes(`  ${key}`)) violations.push(`the graph omits ${key}`);
    if (!columns.includes(`| \`${key}\` |`)) violations.push(`the column table omits ${key}`);
  }

  // The authored promotion table is four rows and every lane it names resolves.
  const section = promotionSection(text);
  const rows = section.split('\n').filter(line => /^\|/.test(line) && !/^\| ---/.test(line)).slice(1);
  if (rows.length !== 4) violations.push(`the promotion table has ${rows.length} rows, not four`);
  for (const row of rows) {
    const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
    if (cells.length !== 3) { violations.push(`the promotion row is not three cells: ${row}`); continue; }
    const lane = cells[2].replaceAll('`', '');
    if (!steps.has(lane)) violations.push(`the promotion lane ${lane} does not resolve`);
  }
  // The authored exit rule names the four review columns and the spec-approval exception.
  const bullets = section.split('\n').filter(line => line.startsWith('- '));
  if (bullets.length !== 2) violations.push(`the exit rule has ${bullets.length} bullets, not two`);
  if (!bullets[0]?.includes('spec_review')) violations.push('the exit rule does not name spec_review');
  if (!/spec-approval exception/.test(bullets[0] ?? '')) violations.push('the exit rule omits the spec-approval exception');
  for (const key of REVIEWS.slice(1)) if (!bullets[1]?.includes(`\`${key}\``)) violations.push(`the exit rule does not name ${key}`);
  for (const key of REVIEWS) if (!section.includes(`\`${key}\``)) violations.push(`the promotion section omits ${key}`);
  // Every status-shaped token in the authored section must resolve; a gate lane never does.
  for (const token of new Set(section.match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? []))
    if (!steps.has(token)) violations.push(`${token} does not resolve`);
  if (/_gate\b|gate lane/i.test(text)) violations.push('the guide names a gate lane');
  return violations;
}

test('the guide is exactly what the renderer produces from the workflow', () => {
  assert.deepEqual(guideViolations(document), []);
});

test('the renderer is idempotent', () => {
  const once = renderDocument(document, workflow);
  assert.equal(renderDocument(once, workflow), once);
});

test('a hand edit inside the column table or the graph is a failure', () => {
  const columnEdit = document.replace('| `backlog` | none |', '| `backlog` | Planner |');
  assert.notEqual(columnEdit, document);
  assert.notDeepEqual(guideViolations(columnEdit), []);
  const graphEdit = document.replace('  spec_progress --> spec_review', '  spec_progress --> in_review');
  assert.notEqual(graphEdit, document);
  assert.notDeepEqual(guideViolations(graphEdit), []);
});

test('the promotion table and the exit rule agree with the workflow', () => {
  const section = promotionSection(document);
  assert.match(section, /^\| any \| spec child \| `spec_progress` \|$/m);
  assert.match(section, /^\| neither or `has-human-release` \| delivery \| `in_progress` \|$/m);
  assert.match(section, /^\| `has-human-implementer` \| delivery \| `human_progress` \|$/m);
  assert.match(section, /^\| any \| release \| `release_progress` \|$/m);
  for (const key of REVIEWS) assert.ok(section.includes(`\`${key}\``), `the exit rule omits ${key}`);
  assert.ok(!/_gate\b|gate lane/i.test(document), 'the guide names a gate lane');
  // The guide's four rows and `roles/planner.md`'s are one table, so neither can drift alone.
  const rows = text => text.split('\n').filter(line => /^\|/.test(line) && !/^\|[- |]+$/.test(line)).slice(1);
  assert.deepEqual(rows(section), rows(readFileSync(join(ROOT, 'roles/planner.md'), 'utf8')));
});

test('the renderer checks the guide offline', () => {
  const result = spawnSync(process.execPath, ['scripts/render-factory.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /docs\/factory\.md is current/);
});
