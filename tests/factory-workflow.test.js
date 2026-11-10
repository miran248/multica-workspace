import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ROLES, resolve, syntheticBinding } from '../scripts/config.js';

// The workflow is the contract; the usage guide is what a human and an agent read. These
// tests pin the graph, the mode routes and the guide together, so a column that changes
// behaviour cannot leave the documentation describing the old one.
const resolved = resolve(syntheticBinding(), ROOT);
const workflow = resolved.shared.workflows.factory;
const steps = new Map(workflow.steps.map(step => [step.status_key, step]));
const TERMINAL = new Set(['done', 'cancelled']);
const ICONS = new Set(['dotted', 'circle', 'half', 'three_quarters', 'check', 'slash', 'cross']);
const spec = readFileSync(join(ROOT, 'docs/factory.md'), 'utf8');

test('every column resolves a handler, a legal edge and instructions that name an exit', () => {
  assert.equal(new Set(steps.keys()).size, workflow.steps.length, 'duplicate status key');
  for (const step of workflow.steps) {
    const key = step.status_key;
    if (step.handler.type === 'agent') assert.ok(ROLES.includes(step.handler.role), `${key}: unknown agent role`);
    if (step.handler.type === 'member') assert.equal(step.handler.role, 'human', `${key}: member handler must be the human`);
    if (step.handler.type !== 'none') assert.ok(step.instructions?.trim(), `${key}: handled column has no instructions`);
    for (const target of [step.next_status_key, step.back_status_key]) {
      if (!target) continue;
      assert.notEqual(target, key, `${key}: edge points at itself`);
      assert.ok(steps.has(target), `${key}: unknown edge ${target}`);
    }
    if (TERMINAL.has(key)) {
      assert.equal(step.handler.type, 'none', `${key}: terminal column must not hand off`);
      assert.equal(step.next_status_key ?? null, null, `${key}: terminal column must not advance`);
    } else if (step.handler.type !== 'none') {
      const named = workflow.steps.some(item => item.status_key !== key && step.instructions.includes(item.status_key));
      assert.ok(named, `${key}: instructions do not name where the ticket moves`);
    }
  }
  assert.equal(steps.get('human_progress').handler.role, 'human');
  assert.equal(steps.get('awaiting_merge').handler.role, 'human');
});

test('every custom status declares a known icon and a hex colour', () => {
  for (const step of workflow.steps.filter(item => item.new_status)) {
    assert.ok(ICONS.has(step.new_status.icon), `${step.status_key}: unknown icon ${step.new_status.icon}`);
    assert.match(step.new_status.color, /^#[0-9a-f]{6}$/i, `${step.status_key}: invalid colour`);
    assert.ok(['unstarted', 'started', 'done', 'cancelled'].includes(step.new_status.category), `${step.status_key}: invalid category`);
  }
  for (const key of ['spec_progress', 'spec_review', 'human_progress', 'awaiting_merge'])
    assert.ok(steps.get(key)?.new_status, `${key} does not declare its presentation`);
});

test('the four modes enter the column their actor handles', () => {
  const enter = (issue, key) => {
    const step = steps.get(key);
    assert.ok(step, `unknown column ${key}`);
    if (step.handler.type === 'agent') issue.assignee = step.handler.role;
    if (step.handler.type === 'member') issue.assignee = 'human';
    issue.status = key;
  };
  const walk = path => {
    const issue = { status: 'todo', assignee: 'planner' };
    for (const key of path) enter(issue, key);
    return issue;
  };

  const autonomous = walk(['in_progress', 'in_review', 'done']);
  assert.equal(steps.get('in_progress').handler.role, 'implementer');
  assert.equal(autonomous.assignee, 'reviewer');

  const manualMerge = walk(['in_progress', 'in_review', 'awaiting_merge', 'done']);
  assert.equal(steps.get('awaiting_merge').handler.role, 'human');
  assert.equal(manualMerge.status, 'done');

  const humanOnly = walk(['human_progress', 'in_review', 'done']);
  assert.equal(humanOnly.status, 'done');

  const humanMerge = walk(['human_progress', 'in_review', 'awaiting_merge', 'done']);
  assert.equal(humanMerge.status, 'done');

  assert.equal(steps.get('human_progress').next_status_key, 'in_review');
  assert.equal(steps.get('awaiting_merge').next_status_key, 'done');
});

test('the review and triage columns route the human lane without leaving it', () => {
  const review = steps.get('in_review').instructions;
  for (const key of ['human_progress', 'spec_progress', 'in_progress', 'awaiting_merge', 'done'])
    assert.ok(review.includes(key), `in_review does not route ${key}`);
  for (const key of ['spec_progress', 'human_progress', 'in_progress', 'cancelled'])
    assert.ok(steps.get('blocked').instructions.includes(key), `blocked does not route ${key}`);
  assert.match(steps.get('in_progress').instructions, /human_progress/);
});

test('the usage guide names every column and both mode labels', () => {
  for (const key of steps.keys()) assert.ok(spec.includes(`\`${key}\``), `docs/factory.md does not name ${key}`);
  for (const label of ['human-assigned', 'manual-merge']) assert.ok(spec.includes(`\`${label}\``), `docs/factory.md does not name ${label}`);
  for (const mode of ['autonomous', 'human']) assert.ok(spec.toLowerCase().includes(mode), `docs/factory.md has no ${mode} mode`);
});
