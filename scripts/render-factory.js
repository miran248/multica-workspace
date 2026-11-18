/** Render the Factory guide's projection of the workflow: the status graph and the column
 *  table, written between markers in docs/factory.md. The workflow file is the source; the
 *  renderer is offline, deterministic and idempotent. The promotion table and the exit rule
 *  stay authored in the guide because they are rules, not projections of the graph. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entrypoint } from './cli.js';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const WORKFLOW = 'templates/workflows/factory.json';
export const GUIDE = 'docs/factory.md';

export const MARKERS = {
  graph: [
    '<!-- factory:graph:start (generated from templates/workflows/factory.json; do not edit) -->',
    '<!-- factory:graph:end -->',
  ],
  columns: [
    '<!-- factory:columns:start (generated from templates/workflows/factory.json; do not edit) -->',
    '<!-- factory:columns:end -->',
  ],
};

const title = role => (role ? role[0].toUpperCase() + role.slice(1) : '');
const handler = step => {
  const { type = 'none', role } = step.handler ?? {};
  if (type === 'agent') return title(role);
  if (type === 'member') return 'human';
  return type;
};
const key = value => (value ? `\`${value}\`` : '—');
const value = input => (input === undefined || input === null || input === '' ? '—' : input);

/** The declared graph, nothing else: every column is a node, `next_status_key` is a solid
 *  arrow and `back_status_key` a dotted one. Promotion and triage routes live in the
 *  instructions, so the guide's prose carries them rather than a second drawing. */
export function renderGraph(workflow) {
  const lines = ['```mermaid', 'flowchart TD'];
  for (const step of workflow.steps) lines.push(`  ${step.status_key}`);
  const edges = [];
  for (const step of workflow.steps) {
    if (step.next_status_key) edges.push(`  ${step.status_key} --> ${step.next_status_key}`);
    if (step.back_status_key) edges.push(`  ${step.status_key} -.-> ${step.back_status_key}`);
  }
  if (edges.length) lines.push('', ...edges);
  lines.push('```');
  return lines.join('\n');
}

/** One row per declared column: the seat that handles it, its declared presentation and its
 *  two edges. A system status declares no presentation, so those cells stay empty. */
export function renderColumns(workflow) {
  const lines = [
    '| Column | Handler | Icon | Colour | Next | Back |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const step of workflow.steps) {
    const presentation = step.new_status ?? {};
    lines.push(`| \`${step.status_key}\` | ${handler(step)} | ${key(presentation.icon)} | ${value(presentation.color)} | ${key(step.next_status_key)} | ${key(step.back_status_key)} |`);
  }
  return lines.join('\n');
}

function replaceBlock(document, name, body) {
  const [start, end] = MARKERS[name];
  if (document.split(start).length !== 2 || document.split(end).length !== 2)
    throw new Error(`docs/factory.md: expected exactly one ${name} marker block`);
  const from = document.indexOf(start) + start.length;
  const to = document.indexOf(end);
  if (to < from) throw new Error(`docs/factory.md: the ${name} markers are out of order`);
  return `${document.slice(0, from)}\n${body}\n${document.slice(to)}`;
}

/** Render both blocks into memory. A hand edit inside a block is lost here, which is what the
 *  suite compares against the file. */
export function renderDocument(document, workflow) {
  return replaceBlock(replaceBlock(document, 'graph', renderGraph(workflow)), 'columns', renderColumns(workflow));
}

export function renderGuide(root = ROOT, { write = true } = {}) {
  const workflow = JSON.parse(readFileSync(join(root, WORKFLOW), 'utf8'));
  const path = join(root, GUIDE);
  const before = readFileSync(path, 'utf8');
  const after = renderDocument(before, workflow);
  if (write && before !== after) writeFileSync(path, after);
  return { workflow, path, before, after, changed: before !== after };
}

export function main() {
  const check = process.argv.includes('--check');
  const { changed } = renderGuide(ROOT, { write: !check });
  if (check && changed) {
    console.error('docs/factory.md differs from the workflow; run `just render-factory`');
    process.exitCode = 1;
    return;
  }
  console.log(check ? 'docs/factory.md is current' : `${changed ? 'rendered' : 'unchanged'}: docs/factory.md`);
}

entrypoint(import.meta.url, main);
