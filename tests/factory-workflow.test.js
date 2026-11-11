import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ROLES, resolve, syntheticBinding } from '../scripts/config.js';

// The workflow is the contract; the usage guide is what a human and an agent read. These
// tests pin the graph, the route table and the guide together, so a column that changes
// behaviour cannot leave the documentation describing the old one.
const resolved = resolve(syntheticBinding(), ROOT);
const workflow = resolved.shared.workflows.factory;
const steps = new Map(workflow.steps.map(step => [step.status_key, step]));
const TERMINAL = new Set(['done', 'cancelled']);
const ICONS = new Set(['dotted', 'circle', 'half', 'three_quarters', 'check', 'slash', 'cross']);
const spec = readFileSync(join(ROOT, 'docs/factory.md'), 'utf8');

// The only edges the graph declares. Everything else the instructions carry is checked here
// as a route table: the target must be a real column, and the column must name it.
const ROUTES = {
  spec_progress: ['spec_review', 'blocked'],
  spec_review: ['spec_progress', 'awaiting_merge'],
  in_progress: ['in_review', 'blocked', 'human_progress'],
  human_progress: ['human_review', 'blocked'],
  in_review: ['in_progress', 'awaiting_merge', 'done'],
  human_review: ['human_progress', 'awaiting_merge', 'done'],
  awaiting_merge: ['spec_progress', 'in_progress', 'human_progress'],
  blocked: ['spec_progress', 'human_progress', 'in_progress', 'cancelled', 'Blocked by'],
};

test('every column resolves a handler, a legal edge and instructions that name an exit', () => {
  assert.equal(new Set(steps.keys()).size, workflow.steps.length, 'duplicate status key');
  for (const step of workflow.steps) {
    const key = step.status_key;
    const type = step.handler?.type ?? 'none';
    if (type === 'agent') assert.ok(ROLES.includes(step.handler.role), `${key}: unknown agent role`);
    if (type === 'member') assert.equal(step.handler.role, 'human', `${key}: member handler must be the human`);
    if (type !== 'none') assert.ok(step.instructions?.trim(), `${key}: handled column has no instructions`);
    for (const target of [step.next_status_key, step.back_status_key]) {
      if (!target) continue;
      assert.notEqual(target, key, `${key}: edge points at itself`);
      assert.ok(steps.has(target), `${key}: unknown edge ${target}`);
    }
    if (TERMINAL.has(key)) {
      assert.equal(type, 'none', `${key}: terminal column must not hand off`);
      assert.equal(step.next_status_key ?? null, null, `${key}: terminal column must not advance`);
    } else if (type !== 'none') {
      const named = workflow.steps.some(item => item.status_key !== key && step.instructions.includes(item.status_key));
      assert.ok(named, `${key}: instructions do not name where the ticket moves`);
    }
  }
  assert.equal(steps.get('human_progress').handler.role, 'human');
  assert.equal(steps.get('awaiting_merge').handler.role, 'human');
});

test('each review column declares its own back status, so no instruction has to guess', () => {
  assert.deepEqual(
    ['spec_review', 'in_review', 'human_review'].map(key => [key, steps.get(key).back_status_key]),
    [['spec_review', 'spec_progress'], ['in_review', 'in_progress'], ['human_review', 'human_progress']]);
  assert.equal(steps.get('in_progress').next_status_key, 'in_review');
  assert.equal(steps.get('human_progress').next_status_key, 'human_review');
  assert.equal(steps.get('spec_review').next_status_key, 'awaiting_merge');
  // The merge completes the ticket: a manual "advance" or a wrong send-back default would
  // close it without a merge, so the column declares no edge at all. The delivery review
  // columns are the same: their PASS is the merge, never a move to done.
  assert.equal(steps.get('awaiting_merge').next_status_key ?? null, null);
  assert.equal(steps.get('awaiting_merge').back_status_key ?? null, null);
  assert.equal(steps.get('in_review').next_status_key ?? null, null);
  assert.equal(steps.get('human_review').next_status_key ?? null, null);
});

test('every custom status declares a known icon and a hex colour', () => {
  for (const step of workflow.steps.filter(item => item.new_status)) {
    assert.ok(ICONS.has(step.new_status.icon), `${step.status_key}: unknown icon ${step.new_status.icon}`);
    assert.match(step.new_status.color, /^#[0-9a-f]{6}$/i, `${step.status_key}: invalid colour`);
    assert.ok(['unstarted', 'started', 'done', 'cancelled'].includes(step.new_status.category), `${step.status_key}: invalid category`);
  }
  for (const key of ['spec_progress', 'spec_review', 'human_progress', 'human_review', 'awaiting_merge'])
    assert.ok(steps.get(key)?.new_status, `${key} does not declare its presentation`);
});

test('the four modes enter the column their actor handles', () => {
  const enter = (issue, key) => {
    const step = steps.get(key);
    assert.ok(step, `unknown column ${key}`);
    if (step.handler?.type === 'agent') issue.assignee = step.handler.role;
    if (step.handler?.type === 'member') issue.assignee = 'human';
    issue.status = key;
  };
  const walk = path => {
    const issue = { status: 'todo', assignee: 'planner' };
    for (const key of path) enter(issue, key);
    return issue;
  };

  const autonomous = walk(['in_progress', 'in_review', 'done']);
  assert.equal(autonomous.assignee, 'reviewer');

  const manualMerge = walk(['in_progress', 'in_review', 'awaiting_merge']);
  assert.equal(manualMerge.status, 'awaiting_merge');
  assert.equal(manualMerge.assignee, 'human');

  const humanOnly = walk(['human_progress', 'human_review', 'done']);
  assert.equal(humanOnly.status, 'done');
  assert.equal(humanOnly.assignee, 'reviewer');

  const humanMerge = walk(['human_progress', 'human_review', 'awaiting_merge']);
  assert.equal(humanMerge.status, 'awaiting_merge');
  assert.equal(humanMerge.assignee, 'human');

  const specApproval = walk(['spec_progress', 'spec_review', 'awaiting_merge']);
  assert.equal(specApproval.status, 'awaiting_merge');
  assert.equal(specApproval.assignee, 'human');
});

test('the route table resolves: every named target is a column and every column names its targets', () => {
  for (const [key, targets] of Object.entries(ROUTES)) {
    const text = steps.get(key)?.instructions ?? '';
    for (const target of targets) assert.ok(text.includes(target), `${key} does not route ${target}`);
  }
  for (const step of workflow.steps) {
    if (!step.instructions) continue;
    for (const [, mentioned] of step.instructions.matchAll(/\b(backlog|todo|spec_progress|spec_review|in_progress|human_progress|in_review|human_review|awaiting_merge|blocked|done|cancelled)\b/g))
      assert.ok(steps.has(mentioned), `${step.status_key} names unknown status ${mentioned}`);
  }
  const merge = steps.get('awaiting_merge').instructions;
  assert.match(merge, /merge completes this ticket/);
  assert.match(merge, /approves the spec, its proposed breakdown and the published children/);
  assert.doesNotMatch(merge, /move (it|this ticket) to done/);
});

test('the comment is the handoff and the move or merge comes last', () => {
  for (const key of ['spec_progress', 'in_progress', 'human_progress']) {
    assert.match(steps.get(key).instructions, /[Cc]omment[^.]*then move/, `${key} does not comment before moving`);
  }
  assert.match(steps.get('spec_review').instructions, /post the PASS at the exact head[^.]*then move/);
  for (const key of ['in_review', 'human_review'])
    assert.match(steps.get(key).instructions, /post the PASS verdict at the exact head, then merge/, `${key} does not post before merging`);
  const handoff = readFileSync(join(ROOT, 'templates/handoff.md'), 'utf8');
  assert.match(handoff, /## The comment is the handoff/);
  assert.match(handoff, /comment first and make the change last/);
  assert.doesNotMatch(handoff, /before the comment is posted/);
});

test('no column enables auto-merge; a PASS is the merge', () => {
  for (const step of workflow.steps) {
    const text = step.instructions ?? '';
    assert.doesNotMatch(text, /gh pr merge --auto|[Aa]rm auto-merge/, `${step.status_key} arms auto-merge`);
  }
  for (const key of ['spec_review', 'in_review', 'human_review', 'awaiting_merge'])
    assert.match(steps.get(key).instructions, /[Nn]ever (merge or )?enable auto-merge/, `${key} does not forbid auto-merge`);
  assert.doesNotMatch(spec, /arms auto-merge|PASS: auto-merge|auto-merged|deferred auto-merge/);
  assert.match(spec, /Auto-merge stays off/);
  assert.match(readFileSync(join(ROOT, 'docs/apply.md'), 'utf8'), /Leave \*\*Allow auto-merge\*\* off/);
  const adr = readFileSync(join(ROOT, 'docs/adr/0006-comment-first-merge-last.md'), 'utf8');
  assert.match(adr, /The comment is the handoff/);
  assert.match(adr, /allow_auto_merge/);
});

test('only a merge moves a ticket: no column handles a close', () => {
  // The platform writes nothing on a close and no wakeup observes one, so an instruction that
  // reacts to it would be a convention with no event behind it. A close is ambiguous too:
  // rejected, superseded, rebased and cancelled PRs close identically.
  for (const step of workflow.steps) {
    const text = step.instructions ?? '';
    assert.doesNotMatch(text, /closed (pull request|PR)|withdrawal|Closing the pull request/i, `${step.status_key} handles a close`);
  }
  // A review still needs something to review; that is an entry precondition, not a close handler.
  for (const key of ['spec_review', 'in_review', 'human_review']) {
    const text = steps.get(key).instructions;
    assert.match(text, /not open/, `${key} does not check for an open PR`);
    assert.match(text, new RegExp(`back to ${steps.get(key).back_status_key}`), `${key} does not name its back status`);
  }
  assert.match(spec, /A close is not a workflow event/);
  assert.doesNotMatch(spec, /Close is a withdrawal/);
  assert.match(spec, /A review needs an open PR/);
  const adr = readFileSync(join(ROOT, 'docs/adr/0005-the-merged-spec-pr-is-the-approval.md'), 'utf8');
  assert.match(adr, /A close is not a workflow event/);
  assert.doesNotMatch(adr, /A close without merge is a withdrawal/);
});

test('the spec PR carries the breakdown its merge approves', () => {
  for (const key of ['spec_progress', 'spec_review'])
    assert.match(steps.get(key).instructions, /proposed breakdown/, `${key} does not name the breakdown`);
  assert.match(spec, /proposed breakdown/);
  assert.match(readFileSync(join(ROOT, 'roles/planner.md'), 'utf8'), /proposed breakdown/);
  for (const path of ['skills/to-spec/SKILL.md', 'skills/to-tickets/SKILL.md'])
    assert.match(readFileSync(join(ROOT, path), 'utf8'), /Proposed breakdown|proposed breakdown/, path);
});

test('the slice is published in the spec run, before stage 1 closes', () => {
  const planner = readFileSync(join(ROOT, 'roles/planner.md'), 'utf8');
  assert.match(planner, /Slice with to-tickets in the spec run/);
  assert.match(planner, /the wake promotes/);
  const tickets = readFileSync(join(ROOT, 'skills/to-tickets/SKILL.md'), 'utf8');
  assert.match(tickets, /before the spec PR leaves `spec_progress`/);
  assert.match(tickets, /--status backlog/);
  assert.match(tickets, /never the spec child/);
  assert.doesNotMatch(tickets, /After the spec child is done/);
  assert.doesNotMatch(tickets, /only the frontier is `todo`/);
  const step = steps.get('spec_progress').instructions;
  assert.match(step, /Publish the whole slice/);
  assert.match(step, /create nothing after it/);
  assert.match(step, /reconcile the existing children/);
  assert.match(spec, /Publishing before the child closes/);
  assert.match(spec, /No child is created after the merge/);
  const adr = readFileSync(join(ROOT, 'docs/adr/0007-publish-the-slice-in-the-spec-run.md'), 'utf8');
  assert.match(adr, /One barrier wake per epic/);
});

test('approval is the merge, not an approval comment', () => {
  assert.doesNotMatch(spec, /approval comment/);
  assert.doesNotMatch(spec, /approves the spec and the ticket breakdown/);
  assert.doesNotMatch(readFileSync(join(ROOT, 'roles/planner.md'), 'utf8'), /approval comment/);
  for (const path of ['skills/to-spec/SKILL.md', 'skills/to-tickets/SKILL.md', 'skills/grilling/SKILL.md'])
    assert.doesNotMatch(readFileSync(join(ROOT, path), 'utf8'), /approval-owner comment/, path);
});

test('the usage guide names every column, the labels and the modes', () => {
  for (const key of steps.keys()) assert.ok(spec.includes(`\`${key}\``), `docs/factory.md does not name ${key}`);
  for (const label of ['human-assigned', 'manual-merge']) assert.ok(spec.includes(`\`${label}\``), `docs/factory.md does not name ${label}`);
  for (const mode of ['autonomous', 'human']) assert.ok(spec.toLowerCase().includes(mode), `docs/factory.md has no ${mode} mode`);
});
