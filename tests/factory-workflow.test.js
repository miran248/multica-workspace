import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ROLES, resolve, syntheticBinding } from '../scripts/config.js';

// The workflow is the contract; the usage guide is what a human and an agent read. These
// tests pin the graph, the promotion table and the exit rule together, so a column that
// changes behaviour cannot leave the documentation describing the old one.
const resolved = resolve(syntheticBinding(), ROOT);
const workflow = resolved.shared.workflows.factory;
const steps = new Map(workflow.steps.map(step => [step.status_key, step]));
const TERMINAL = new Set(['done', 'cancelled']);
const ICONS = new Set(['dotted', 'circle', 'half', 'three_quarters', 'check', 'slash', 'cross']);
const REVIEWS = ['spec_review', 'in_review', 'human_review', 'release_review'];
const WORK = ['spec_progress', 'in_progress', 'human_progress', 'release_progress'];
const PRESENTED = ['epic_progress', 'spec_progress', 'spec_review', 'human_progress', 'release_progress', 'human_review', 'release_review', 'awaiting_merge'];
const COLUMNS = ['backlog', 'todo', 'epic_progress', 'spec_progress', 'spec_review', 'in_progress', 'human_progress', 'release_progress', 'in_review', 'human_review', 'release_review', 'awaiting_merge', 'blocked', 'done', 'cancelled'];
const LABELS = /has-human-release|has-human-implementer|manual-merge|human-assigned/;
const PREFIXED_HEAD = ['spec', '/<epic>'].join('');
const PREFIXED_PREFIX = ['spec', '/*'].join('');
const BARRIER = ['--until', '-children', '-done'].join('');
const CANCELLED_CONDITION = ['--until', '-status', ' cancelled'].join('');
// The deleted branchless topology lives only in the record that supersedes it. Build the
// needles from parts so this suite never reintroduces the strings it forbids.
const DELETED_TOPOLOGY = [['direct', 'to', 'main'].join('-'), ['integration: ', 'none'].join('')];
const guide = readFileSync(join(ROOT, 'docs/factory.md'), 'utf8');
const read = path => readFileSync(join(ROOT, path), 'utf8');

// The only edges the graph declares. Everything else the instructions carry is checked here
// as a route table: the target must be a real column, and the column must name it.
const ROUTES = {
  spec_progress: ['spec_review', 'blocked'],
  spec_review: ['spec_progress', 'awaiting_merge'],
  in_progress: ['in_review', 'blocked', 'spec_progress'],
  human_progress: ['human_review', 'blocked', 'spec_progress'],
  release_progress: ['release_review', 'blocked'],
  in_review: ['in_progress', 'awaiting_merge'],
  human_review: ['human_progress', 'awaiting_merge', 'spec_review'],
  release_review: ['release_progress', 'awaiting_merge'],
  awaiting_merge: ['spec_progress', 'in_progress', 'human_progress', 'release_progress'],
  blocked: ['spec_progress', 'human_progress', 'in_progress', 'release_progress', 'cancelled'],
};

test('the graph resolves fifteen columns, each with a legal edge and a seat', () => {
  assert.deepEqual([...steps.keys()], COLUMNS);
  for (const step of workflow.steps) {
    const key = step.status_key;
    const type = step.handler.type;
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
  assert.equal(steps.get('epic_progress').handler.type, 'none');
  // The platform clears instructions on a handler-less step, so a declared one can never be
  // read back and the sync can never converge. The state rule lives in the guide and the
  // Planner contract instead.
  assert.ok(!steps.get('epic_progress').instructions);
  assert.equal(steps.get('human_progress').handler.role, 'human');
  assert.equal(steps.get('awaiting_merge').handler.role, 'human');
  assert.equal(steps.get('release_progress').handler.type, 'agent');
  assert.equal(steps.get('release_progress').handler.role, 'release');
  assert.equal(steps.get('release_review').handler.role, 'reviewer');
  for (const key of steps.keys()) assert.doesNotMatch(key, /_gate$/, `${key}: a gate lane is not a state`);
});

test('each review column declares awaiting_merge as its next and its own back status', () => {
  assert.deepEqual(REVIEWS.map(key => [key, steps.get(key).next_status_key, steps.get(key).back_status_key]), [
    ['spec_review', 'awaiting_merge', 'spec_progress'],
    ['in_review', 'awaiting_merge', 'in_progress'],
    ['human_review', 'awaiting_merge', 'human_progress'],
    ['release_review', 'awaiting_merge', 'release_progress']]);
  assert.equal(steps.get('in_progress').next_status_key, 'in_review');
  assert.equal(steps.get('human_progress').next_status_key, 'human_review');
  assert.equal(steps.get('release_progress').next_status_key, 'release_review');
  // The merge completes the ticket: a manual advance or a wrong send-back would close it
  // without a merge, so the human column declares no edge at all.
  assert.equal(steps.get('awaiting_merge').next_status_key ?? null, null);
  assert.equal(steps.get('awaiting_merge').back_status_key ?? null, null);
});

test('every custom status declares a known icon and a hex colour', () => {
  for (const step of workflow.steps.filter(item => item.new_status)) {
    assert.ok(ICONS.has(step.new_status.icon), `${step.status_key}: unknown icon ${step.new_status.icon}`);
    assert.match(step.new_status.color, /^#[0-9a-f]{6}$/i, `${step.status_key}: invalid colour`);
    assert.ok(['unstarted', 'started', 'done', 'cancelled'].includes(step.new_status.category), `${step.status_key}: invalid category`);
  }
  for (const key of PRESENTED) assert.ok(steps.get(key)?.new_status, `${key} does not declare its presentation`);
  assert.deepEqual(workflow.steps.filter(step => step.new_status).map(step => step.status_key), PRESENTED);
});

test('entering a column reassigns the ticket to the seat that handles it', () => {
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

  const release = walk(['release_progress', 'release_review', 'done']);
  assert.equal(release.assignee, 'reviewer');

  const releaseMerge = walk(['release_progress', 'release_review', 'awaiting_merge']);
  assert.equal(releaseMerge.status, 'awaiting_merge');
  assert.equal(releaseMerge.assignee, 'human');

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
    for (const [, mentioned] of step.instructions.matchAll(/\b(backlog|todo|epic_progress|spec_progress|spec_review|in_progress|human_progress|release_progress|in_review|human_review|release_review|awaiting_merge|blocked|done|cancelled)\b/g))
      assert.ok(steps.has(mentioned), `${step.status_key} names unknown status ${mentioned}`);
  }
  const merge = steps.get('awaiting_merge').instructions;
  assert.match(merge, /merge completes this ticket/);
  assert.match(merge, /approves the spec, its proposed breakdown and the published children/);
  assert.doesNotMatch(merge, /move (it|this ticket) to done/);
  assert.match(steps.get('blocked').instructions, /timeline records/);
  assert.doesNotMatch(steps.get('blocked').instructions, /Blocked by/);
});

test('the exit rule lives once and the promotion table lives once', () => {
  const review = read('skills/code-review/SKILL.md');
  const rule = /## The exit rule\n\n([\s\S]*?)\n\n## /.exec(review)?.[1] ?? '';
  assert.match(rule, /gh pr view .*--json baseRefName/);
  assert.match(rule, /multica issue get <parent> --output json/);
  assert.match(rule, /has-human-release/);
  assert.equal([...rule.matchAll(/^- /gm)].length, 4);

  const planner = read('roles/planner.md');
  const rows = planner.split('\n').filter(line => /^\|/.test(line)).filter(line => !/^\|[- |]+$/.test(line)).slice(1);
  assert.deepEqual(rows, [
    '| any | spec child | `spec_progress` |',
    '| neither or `has-human-release` | delivery | `in_progress` |',
    '| `has-human-implementer` | delivery | `human_progress` |',
    '| any | release | `release_progress` |',
  ]);
  assert.match(planner, /has-human-release/);
  assert.match(planner, /has-human-implementer/);
  assert.doesNotMatch(planner, /production/i);
  assert.match(read('roles/release.md'), /production:/);

  // No column instruction restates the exit rule or names an epic label.
  for (const step of workflow.steps) assert.doesNotMatch(step.instructions ?? '', LABELS, `${step.status_key} names a label`);
  // The reviewer points at the rule instead of naming a column exit.
  assert.doesNotMatch(read('roles/reviewer.md'), /awaiting_merge/);
  assert.match(read('roles/reviewer.md'), /exit rule/);
  // Outside the Planner's table and code-review's rule, no role names the labels.
  for (const role of ['general', 'implementer', 'reviewer', 'release']) assert.doesNotMatch(read(`roles/${role}.md`), LABELS, `${role} names a label`);
  assert.doesNotMatch(read('shared/instructions.md'), LABELS);
  assert.match(read('skills/code-review/SKILL.md'), /has-human-release/);
});

test('no stale-review timer is armed and the stage wake is the promotion', () => {
  const catalog = ['roles', 'shared', 'skills', 'templates'].flatMap(directory =>
    readdirSync(join(ROOT, directory), { recursive: true })
      .filter(name => /\.(md|json)$/.test(name))
      .map(name => `${directory}/${name}`));
  for (const path of catalog) {
    assert.doesNotMatch(read(path), /\b90m\b|90-minute|90 minute/i, `${path} still registers the 90m timer`);
    assert.doesNotMatch(read(path), /comment\.created/, `${path} registers a comment.created wake`);
  }
  const planner = read('roles/planner.md');
  assert.match(planner, /wakeup list/);
  assert.match(planner, /wakeup update/);
  assert.match(planner, /release readback/);
  assert.match(planner, /cancelled sweep/);
  assert.doesNotMatch(planner, /--until-children-done/);
  // The platform's stage wake is the promotion; no barrier and no closing condition is armed.
  const step = steps.get('spec_progress').instructions;
  assert.match(step, /release readback/);
  assert.match(step, /cancelled sweep/);
  assert.doesNotMatch(step, /--until-children-done/);
  assert.doesNotMatch(step, /--until-status cancelled/);
  assert.doesNotMatch(step, /gh pr list --base main/);
});

test('the guide carries the blocker model once and no retired sweep section', () => {
  assert.doesNotMatch(guide, /### The stale sweep/);
  assert.doesNotMatch(guide, /two or more hours/);
  const section = /^## One integration branch per spec\n\n([\s\S]*?)\n\n```text/m.exec(guide)?.[1] ?? '';
  assert.match(section, /`--blocked-by <dependency-epic>`/);
  assert.match(section, /`via: stage`/);
  assert.match(section, /no manual intra-epic edge/);
  assert.match(section, /release squash is on `main`/);
  assert.match(section, /parks the\n?ticket in `blocked`/);
});

test('no skill or glossary carries a gate twin or the deleted promotion lanes', () => {
  const tickets = read('skills/to-tickets/SKILL.md');
  assert.match(tickets, /four-row mapping in `roles\/planner\.md`/);
  assert.doesNotMatch(tickets, /_gate|gate lane/);
  assert.doesNotMatch(tickets, /`in_progress` for agent work/);
  assert.doesNotMatch(tickets, /merge the current `main` in, resolve, run the full suite/);
  assert.match(tickets, /release procedure lives once in `roles\/release\.md`/);
  const glossary = read('GLOSSARY.md');
  assert.doesNotMatch(glossary, /_gate|gate lane/);
  assert.doesNotMatch(glossary, /seven reviewer-handled|column count/);
  for (const term of ['release_progress', 'release_review', 'awaiting_merge', 'exit rule'])
    assert.ok(glossary.includes(term), `GLOSSARY.md does not describe ${term}`);
  assert.match(glossary, /final-stage child is the\s+release ticket/);
  assert.match(glossary, /has-human-release/);
});

test('the linked PR is the handoff and the move or merge comes last', () => {
  for (const key of WORK) {
    assert.match(steps.get(key).instructions, /linked (spec )?PR is the handoff/, `${key} does not hand off the PR`);
    assert.match(steps.get(key).instructions, /last action/, `${key} does not move last`);
  }
  assert.match(steps.get('spec_review').instructions, /post the PASS at the exact head[^.]*then move/);
  for (const key of REVIEWS) {
    assert.match(steps.get(key).instructions, /awaiting_merge/, `${key} does not declare awaiting_merge`);
  }
  for (const key of ['in_review', 'human_review', 'release_review']) {
    assert.match(steps.get(key).instructions, /exit rule in `code-review`/, `${key} does not point at the exit rule`);
    assert.match(steps.get(key).instructions, new RegExp(`back to ${steps.get(key).back_status_key}`), `${key} does not name its back status`);
  }
  const handoff = read('shared/instructions.md');
  assert.match(handoff, /^## Handoffs$/m);
  assert.match(handoff, /Linked PR is the handoff/);
  assert.match(handoff, /empty body not a finding/);
  assert.doesNotMatch(handoff, /comment is the handoff/i);
});

test('no column enables auto-merge; a PASS is the merge', () => {
  for (const step of workflow.steps) {
    const text = step.instructions ?? '';
    assert.doesNotMatch(text, /gh pr merge --auto|[Aa]rm auto-merge/, `${step.status_key} arms auto-merge`);
  }
  for (const key of [...REVIEWS, 'awaiting_merge'])
    assert.match(steps.get(key).instructions, /[Nn]ever (merge or )?enable auto-merge/, `${key} does not forbid auto-merge`);
  assert.doesNotMatch(guide, /arms auto-merge|PASS: auto-merge|auto-merged|deferred auto-merge/);
  assert.match(guide, /Auto-merge stays off/);
  assert.match(read('docs/apply.md'), /Leave \*\*Allow auto-merge\*\* off/);
  const apply = read('docs/apply.md');
  assert.match(apply, /base of the spec approval and every delivery PR/);
  assert.doesNotMatch(apply, /its only PR is the spec approval/);
  const adr = read('docs/adr/0006-comment-first-merge-last.md');
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
  for (const key of REVIEWS) {
    const text = steps.get(key).instructions;
    assert.match(text, /not open/, `${key} does not check for an open PR`);
    assert.match(text, new RegExp(`back to ${steps.get(key).back_status_key}`), `${key} does not name its back status`);
  }
  assert.match(guide, /A close is not a workflow event/);
  assert.doesNotMatch(guide, /Close is a withdrawal/);
  assert.match(guide, /A review needs an open PR/);
  const adr = read('docs/adr/0005-the-merged-spec-pr-is-the-approval.md');
  assert.match(adr, /A close is not a workflow event/);
  assert.doesNotMatch(adr, /A close without merge is a withdrawal/);
});

test('the spec PR carries the breakdown its merge approves', () => {
  for (const key of ['spec_progress', 'spec_review'])
    assert.match(steps.get(key).instructions, /proposed breakdown/, `${key} does not name the breakdown`);
  assert.match(guide, /proposed breakdown/);
  assert.match(read('roles/planner.md'), /proposed breakdown/);
  for (const path of ['skills/to-spec/SKILL.md', 'skills/to-tickets/SKILL.md'])
    assert.match(read(path), /Proposed breakdown|proposed breakdown/, path);
});

test('the slice is published in the spec run, before stage 1 closes', () => {
  const planner = read('roles/planner.md');
  assert.match(planner, /Slice in the spec run/);
  assert.match(planner, /stage wake promotes/);
  const tickets = read('skills/to-tickets/SKILL.md');
  assert.match(tickets, /before the spec PR leaves `spec_progress`/);
  assert.match(tickets, /--status backlog/);
  assert.match(tickets, /never the spec child/);
  assert.doesNotMatch(tickets, /After the spec child is done/);
  assert.doesNotMatch(tickets, /only the frontier is `todo`/);
  const step = steps.get('spec_progress').instructions;
  assert.match(step, /Publish the whole slice/);
  assert.match(step, /create no child after the merge/);
  assert.match(step, /existing children reconciled in place/);
  assert.match(guide, /Publishing before the child closes/);
  assert.match(guide, /No child is created after the merge/);
  const adr = read('docs/adr/0007-publish-the-slice-in-the-spec-run.md');
  assert.match(adr, /One barrier wake per epic/);
});

// One topology: the spec run forks and records the epic's key as the integration branch, heads
// the spec PR with the spec child's key, and publishes every child with its planned owner. A
// prefixed head, a children-done barrier, a spec/* query or a restated force-push rule is a failure.
function specRunViolations({ planner, step, tickets, specSkill, codeReview }) {
  const violations = [];
  if (!/This spec's integration branch is the one it records/.test(step))
    violations.push('spec_progress: no ticket-id integration branch fork');
  if (!/forked from `main` at the spec sha/.test(step)) violations.push('spec_progress: no fork from main');
  if (!/heads the spec child's key/.test(step)) violations.push('spec_progress: the PR head is not the spec child key');
  if (!/targets that branch, never `main`/.test(step)) violations.push('spec_progress: the spec PR may target main');
  if (!/records \(`integration: <epic>`\)/.test(step)) violations.push('spec_progress: no integration record');
  if (!/added commit/.test(step)) violations.push('spec_progress: a rework is not additive');
  if (/force-with-lease|never `--force`|--mirror/.test(step)) violations.push('spec_progress: restates the rewrite flags');
  if (!/shared `## Delivery`/.test(step)) violations.push('spec_progress: does not defer the rewrite rule to shared Delivery');
  if (!/planned owner/.test(step)) violations.push('spec_progress: the set has no planned owner');
  if (!/`Branch: <epic>`/.test(step)) violations.push('spec_progress: no ticket-id Branch line');
  if (!/final-stage release child/.test(step)) violations.push('spec_progress: no final-stage release child');
  if (!/release readback/.test(step)) violations.push('spec_progress: no release readback');
  if (!/cancelled sweep/.test(step)) violations.push('spec_progress: no cancelled sweep');
  if (step.includes(BARRIER)) violations.push('spec_progress: arms a children-done barrier');
  if (step.includes(CANCELLED_CONDITION)) violations.push('spec_progress: arms a closing condition');
  if (step.includes('gh pr list --base main')) violations.push('spec_progress: queries main heads');
  if (step.includes(PREFIXED_HEAD)) violations.push('spec_progress: a prefixed head remains');
  for (const term of DELETED_TOPOLOGY) if (step.includes(term)) violations.push('spec_progress: reintroduces the deleted topology');
  // The Planner contract carries the three branch roles, the route and the promotion boundary.
  for (const term of ['branches:', 'Slice in the spec run', 'stage wake promotes', 'wakeup list', 'wakeup update', 'release readback', 'cancelled sweep'])
    if (!planner.includes(term)) violations.push(`roles/planner.md: no ${term}`);
  for (const term of ['integration', 'spec PR', 'release PR'])
    if (!planner.includes(term)) violations.push(`roles/planner.md: no ${term} branch role`);
  if (planner.includes(BARRIER)) violations.push('roles/planner.md: arms a children-done barrier');
  if (planner.includes('gh pr list --base main')) violations.push('roles/planner.md: queries main heads');
  if (planner.includes(PREFIXED_HEAD)) violations.push('roles/planner.md: a prefixed head remains');
  if (!/final child is release/.test(planner)) violations.push('roles/planner.md: no release-kind read');
  // The publisher writes the integration branch and every planned owner; the release writes main.
  const body = /<issue-template>([\s\S]*?)<\/issue-template>/.exec(tickets)?.[1] ?? '';
  if (!/^Branch: <epic-key>/m.test(body)) violations.push('to-tickets: no ticket-id Branch line in the template');
  if (!/always present/.test(body)) violations.push('to-tickets: the Branch line is conditional');
  if (!/release child writes `Branch: main`/.test(body)) violations.push('to-tickets: the release child base is not main');
  if (!/its body writes `Branch: main`/.test(tickets)) violations.push('to-tickets: the release body base is not main');
  if (!/release child's line is `main`/.test(codeReview)) violations.push('code-review: the release child base is not main');
  if (!/planned owner/.test(tickets)) violations.push('to-tickets: no planned owner');
  if (!/no child is unassigned/.test(tickets)) violations.push('to-tickets: a child may be unassigned');
  if (!/release child is the final publication: created last, in `backlog`, in the final stage/.test(tickets))
    violations.push('to-tickets: release child is not last, backlog and final stage');
  for (const clause of ['release procedure', 'release branch', 'included children', '`Touch:` union', 'Create no child after the merge that approves its set'])
    if (!tickets.includes(clause)) violations.push(`to-tickets: missing ${clause}`);
  for (const term of DELETED_TOPOLOGY) if (tickets.includes(term)) violations.push('to-tickets: reintroduces the deleted topology');
  if (tickets.includes(PREFIXED_HEAD)) violations.push('to-tickets: a prefixed head remains');
  if (!tickets.includes('release branch `<release-key>` → `main`')) violations.push('to-tickets: the release head is not the release key');
  // The spec skill records and targets the integration branch, never main.
  if (!/records `integration: <epic-key>`/.test(specSkill)) violations.push('to-spec: no integration record');
  if (!/forks that integration branch from `main` at the spec sha/.test(specSkill)) violations.push('to-spec: no fork from main');
  if (!/targets its approval PR at `<epic-key>`, never `main`/.test(specSkill)) violations.push('to-spec: the approval PR may target main');
  if (!/single-ticket breakdown is the smallest epic/.test(specSkill)) violations.push('to-spec: no single-ticket epic');
  for (const term of DELETED_TOPOLOGY) if (specSkill.includes(term)) violations.push('to-spec: reintroduces the deleted topology');
  if (specSkill.includes(PREFIXED_HEAD)) violations.push('to-spec: a prefixed head remains');
  return violations;
}

test('the spec run forks, records and targets the integration branch', () => {
  const contract = {
    planner: read('roles/planner.md'),
    step: steps.get('spec_progress').instructions,
    tickets: read('skills/to-tickets/SKILL.md'),
    specSkill: read('skills/to-spec/SKILL.md'),
    codeReview: read('skills/code-review/SKILL.md'),
  };
  assert.deepEqual(specRunViolations(contract), []);
  // The failures the matrix exists to catch: a spec PR on main, a body with no base, a
  // prefixed head, a barrier, a main query, a restated lease and an ownerless child.
  const mainOnly = { ...contract, step: contract.step.replace(/This spec's integration branch is the one it records/, 'targets the spec PR at `main`') };
  assert.notDeepEqual(specRunViolations(mainOnly), []);
  const noBase = { ...contract, tickets: contract.tickets.replace(/^Branch: <epic-key>.*$/m, '') };
  assert.notDeepEqual(specRunViolations(noBase), []);
  const noFork = { ...contract, step: contract.step.replace('forked from `main` at the spec sha', 'created later') };
  assert.notDeepEqual(specRunViolations(noFork), []);
  const barrier = { ...contract, step: `${contract.step} ${BARRIER}` };
  assert.notDeepEqual(specRunViolations(barrier), []);
  const query = { ...contract, step: `${contract.step} gh pr list --base main` };
  assert.notDeepEqual(specRunViolations(query), []);
  const prefixed = { ...contract, specSkill: `${contract.specSkill} A ${PREFIXED_HEAD} head.` };
  assert.notDeepEqual(specRunViolations(prefixed), []);
  const lease = { ...contract, step: `${contract.step} git push --force-with-lease=<remote-ref>:<expected-sha>` };
  assert.notDeepEqual(specRunViolations(lease), []);
  const unassigned = { ...contract, tickets: contract.tickets.replace(/no child is unassigned/g, 'the human lane may be unassigned') };
  assert.notDeepEqual(specRunViolations(unassigned), []);
  const wrongBase = { ...contract, codeReview: contract.codeReview.replace("release child's line is `main`", "release child's line is the integration branch") };
  assert.notDeepEqual(specRunViolations(wrongBase), []);
});

// The spec lane carries the change window and the freeze latch: the step instruction states
// the in-place rework and the new-epic consequence, the review fails a second open spec PR or
// a post-freeze revision, and the Planner contract names the route without a second copy.
const SPEC_LANE = ['reslice window', 'revision PR', 'fresh PASS', 'freeze', 'new epic', 'superseded'];

function changeWindowViolations({ step, review, planner }) {
  const violations = [];
  for (const term of [...SPEC_LANE, 'started status'])
    if (!new RegExp(term, 'i').test(step)) violations.push(`spec_progress: no ${term}`);
  // The flags and the fetch live once in shared Delivery; the column carries the route only.
  if (/force-with-lease|never `--force`|--mirror/.test(step)) violations.push('spec_progress: restates the rewrite flags');
  if (!/rewrite follows shared `## Delivery`/.test(step)) violations.push('spec_progress: the rewrite rule is not in shared Delivery');
  if (!/no second spec (PR|pull request) is open/i.test(step)) violations.push('spec_progress: a second spec PR may be open');
  if (!/superseded and cited/.test(step)) violations.push('spec_progress: the superseded acceptance is not cited');
  if (!/create no child after the merge that approves its set/.test(step))
    violations.push('spec_progress: the child-set cut is not the approval merge');
  if (/once the spec PR opens/.test(step)) violations.push('spec_progress: a child is still forbidden once the spec PR opens');
  for (const term of ['second open spec', 'after the freeze', 'FAIL'])
    if (!review.includes(term)) violations.push(`spec_review: no ${term}`);
  for (const term of SPEC_LANE)
    if (!new RegExp(term, 'i').test(planner)) violations.push(`roles/planner.md: no ${term}`);
  if (!/branches: epic integration/.test(planner)) violations.push('roles/planner.md: the integration branch is not the epic key');
  // The new epic is the route after the freeze, not part of the in-window sequence.
  if (!/freeze; else new epic, superseded/.test(planner)) violations.push('roles/planner.md: the new epic is not conditional');
  return violations;
}

test('the spec lane names the reslice window, the freeze latch and the new-epic consequence', () => {
  const contract = {
    step: steps.get('spec_progress').instructions,
    review: steps.get('spec_review').instructions,
    planner: read('roles/planner.md'),
  };
  assert.deepEqual(changeWindowViolations(contract), []);
  // A spec run without the window amends an approved set in the new-epic territory.
  assert.notDeepEqual(changeWindowViolations({ ...contract, step: contract.step.replace(/reslice window/g, 'rework') }), []);
  // A review that passes a second open spec PR leaves two live handoffs.
  assert.notDeepEqual(changeWindowViolations({ ...contract, review: contract.review.replace('A second open spec pull request', 'A pull request') }), []);
  // A Planner contract without the freeze arms the old open-ended slice.
  assert.notDeepEqual(changeWindowViolations({ ...contract, planner: contract.planner.replace(/freeze/g, 'boundary') }), []);
  // Dropping `else` folds the new epic back into the in-window sequence ADR-0019 forbids.
  assert.notDeepEqual(changeWindowViolations({ ...contract, planner: contract.planner.replace('freeze; else new epic', 'freeze; new epic') }), []);
  // A bare `integration` loses the qualifier shared and the guide define as the epic's key.
  assert.notDeepEqual(changeWindowViolations({ ...contract, planner: contract.planner.replace('branches: epic integration', 'branches: integration') }), []);
});

// One kickoff: the packet closes on one question, the Planner creates the epic and its stage-1
// child, applies the labels and records the human seat before the move, and the guide reads the
// same route once. A kickoff that starts nothing, or creates without an owner, is the defect.
function kickoffViolations({ grilling, planner, step, guide }) {
  const violations = [];
  if (!/one close-and-start question: apply the chosen labels and start stage 1/.test(grilling))
    violations.push('grilling: the packet has no close-and-start question');
  if (!/invoked explicitly and never tied to grilling/.test(grilling))
    violations.push('grilling: wayfinder is not the explicit-invocation method');
  if (/wayfinder map, not a factory shape/.test(grilling)) violations.push('grilling: a non-empty frontier selects a wayfinder map');
  if (!/Create epic, stage-1 child in `backlog` \(project, planned owner\)/.test(planner))
    violations.push('roles/planner.md: the kickoff does not create in backlog with the project and the planned owner');
  if (!/record `human` readback/.test(planner))
    violations.push('roles/planner.md: the seat is not recorded as a readback');
  if (!/apply labels[^.]*move to `epic_progress`, child to `spec_progress`/.test(planner))
    violations.push('roles/planner.md: the labels and the epic move are not before the child move');
  if (!/- Create epic, stage-1 child .*child to `spec_progress`\.$/m.test(planner))
    violations.push('roles/planner.md: the move is not the kickoff last action');
  if (!/`done` at acceptance/.test(planner)) violations.push('roles/planner.md: the epic never reaches done');
  if (!/kickoff[^.]*labels[^.]*before this move/i.test(step)) violations.push('spec_progress: the kickoff labels are not applied before the move');
  const kickoff = /^## The kickoff labels step\n\n([\s\S]*?)\n\n## /m.exec(guide)?.[1] ?? '';
  if (!/one close-and-start question: apply the chosen mode labels and start\s+stage 1/.test(kickoff))
    violations.push('docs/factory.md: the kickoff has no close-and-start question');
  if (!/human seat the project's workflow binds to the\s+`human`\s+role from the live handler/.test(kickoff))
    violations.push('docs/factory.md: the kickoff names no human seat');
  if (!/creates\s+the epic in `backlog` and the stage-1 spec child with the project\s+and the planned owner/.test(kickoff))
    violations.push('docs/factory.md: the kickoff creates without an owner');
  if (!/records the `human` seat on the epic as a readback/.test(kickoff)) violations.push('docs/factory.md: the kickoff records no seat readback');
  const mover = /^- \*\*Planner\.\*\*[\s\S]*?(?=\n- \*\*)/m.exec(guide)?.[0] ?? '';
  if (!/Create the epic in `backlog` and the stage-1 spec child/.test(mover))
    violations.push('docs/factory.md: the Planner section creates nothing');
  if (!/record the one `human` seat from the live handler on the epic as a\s+readback/.test(mover))
    violations.push('docs/factory.md: the Planner section records no seat readback');
  return violations;
}

test('the grilling packet ends on one question and the kickoff creates, labels and moves', () => {
  const contract = {
    grilling: read('skills/grilling/SKILL.md'),
    planner: read('roles/planner.md'),
    step: steps.get('spec_progress').instructions,
    guide,
  };
  assert.deepEqual(kickoffViolations(contract), []);
  assert.match(contract.grilling, /Every grilling produces an epic with its stage-1 spec child/);
  assert.match(contract.grilling, /a single ticket is the smallest epic/);
  assert.match(contract.grilling, /opens in `backlog`/);
  assert.doesNotMatch(contract.grilling, /opens in `todo`/);
  assert.doesNotMatch(contract.grilling, /\*\*Shape\*\*/);
  assert.doesNotMatch(contract.planner, new RegExp(DELETED_TOPOLOGY[0]));
  assert.doesNotMatch(contract.step, new RegExp(DELETED_TOPOLOGY[0]));
  // A labels-only packet never starts the factory.
  assert.notDeepEqual(kickoffViolations({
    ...contract,
    grilling: contract.grilling.replace('one close-and-start question: apply the chosen labels and start stage 1', 'The packet ends on the labels question.'),
  }), []);
  // A kickoff that creates without an owner is the hole the create rule closes.
  assert.notDeepEqual(kickoffViolations({
    ...contract,
    guide: contract.guide.replace('with the project and the planned owner, ', ''),
  }), []);
  assert.notDeepEqual(kickoffViolations({ ...contract, planner: contract.planner.replace('(project, planned owner)', '') }), []);
  // An unconditional or unplaced seat can be fabricated or recorded off the epic.
  assert.notDeepEqual(kickoffViolations({ ...contract, planner: contract.planner.replace('`human` readback', 'the human seat') }), []);
  assert.notDeepEqual(kickoffViolations({ ...contract, planner: contract.planner.replace('`human` readback', 'a human seat') }), []);
  // An epic whose contract stops at epic_progress never reaches done on acceptance.
  assert.notDeepEqual(kickoffViolations({ ...contract, planner: contract.planner.replace('`done` at acceptance', '') }), []);
  // A reintroduced wayfinder-map sentence selects a container the user never asked for.
  assert.notDeepEqual(kickoffViolations({
    ...contract,
    grilling: `${contract.grilling} A non-empty frontier is a wayfinder map, not a factory shape.`,
  }), []);
});

test('no carrier keeps a prefixed head, a barrier, an open-head query, a conflicts re-arm or an unassigned lane', () => {
  const surfaces = [
    ...['roles', 'shared', 'skills', 'templates'].flatMap(directory =>
      readdirSync(join(ROOT, directory), { recursive: true })
        .filter(name => /\.(md|json)$/.test(name))
        .map(name => `${directory}/${name}`)),
    'docs/factory.md',
    'docs/apply.md',
    'README.md',
    'GLOSSARY.md',
  ];
  for (const path of surfaces) {
    const text = read(path);
    for (const [term, needle] of [
      ['a prefixed head', PREFIXED_HEAD],
      ['a spec/* prefix', PREFIXED_PREFIX],
      ['a children-done barrier', BARRIER],
      ['an open-head query', 'gh pr list --base main'],
      ['a conflicts re-arm', 'wakeup create <ticket> --until-pr conflicts'],
    ]) assert.ok(!text.includes(needle), `${path} keeps ${term}`);
    assert.doesNotMatch(text, /human-lane child may be unassigned|only unassigned child|human lane is unassigned/, `${path} leaves the human lane unassigned`);
  }
});

test('no catalog surface names the deleted topology', () => {
  const surfaces = [
    ...['roles', 'shared', 'skills', 'templates'].flatMap(directory =>
      readdirSync(join(ROOT, directory), { recursive: true })
        .filter(name => /\.(md|json)$/.test(name))
        .map(name => `${directory}/${name}`)),
    'docs/factory.md',
    'docs/apply.md',
    'docs/README.md',
    'README.md',
    'AGENTS.md',
    'GLOSSARY.md',
    ...readdirSync(join(ROOT, 'tests')).filter(name => name.endsWith('.js')).map(name => `tests/${name}`),
  ];
  for (const path of surfaces) {
    const text = read(path);
    for (const term of DELETED_TOPOLOGY) assert.ok(!text.includes(term), `${path} names the deleted topology`);
  }
});

// The delivery contract lives once in shared; the columns carry only their own route and the
// review columns point at the one exit rule. A column that restates the base or the label
// read, or a reviewer that names a column exit, is the failure this matrix catches.
function deliveryViolations({ shared, implementer, reviewer, inProgress, humanProgress, inReview, humanReview, releaseReview, awaitingMerge, codeReview }) {
  const violations = [];
  if (!/`Branch:`/.test(shared)) violations.push('shared: no body-derived branch');
  if (!/absen[ct]e? means `main`/.test(shared)) violations.push('shared: main is not the default base');
  if (!/Base: the ticket's `Branch:`/.test(shared)) violations.push('shared: the PR is not targeted at the base');
  if (!/[Mm]erge the base in before review/.test(shared)) violations.push('shared: the base is not merged before review');
  if (!/`## Touch`/.test(shared)) violations.push('shared: does not keep to Touch:');
  for (const [name, text] of [['roles/implementer.md', implementer], ['roles/reviewer.md', reviewer]])
    for (const phrase of ['`Branch:`', '`## Touch`', 'Conventional Commits', 'squash'])
      if (text.includes(phrase)) violations.push(`${name}: repeats the delivery contract: ${phrase}`);
  for (const [name, text] of [['in_progress', inProgress], ['human_progress', humanProgress]]) {
    if (/`Branch:`/.test(text)) violations.push(`${name}: restates the base rule`);
    if (/`## Touch`|`Touch:`/.test(text)) violations.push(`${name}: restates the scope rule`);
    if (/[Mm]erge the base/.test(text)) violations.push(`${name}: restates the base-merge rule`);
  }
  for (const [name, text, back] of [
    ['in_review', inReview, 'in_progress'],
    ['human_review', humanReview, 'human_progress'],
    ['release_review', releaseReview, 'release_progress'],
  ]) {
    if (!/exit rule in `code-review`/.test(text)) violations.push(`${name}: does not point at the exit rule`);
    if (!/awaiting_merge/.test(text)) violations.push(`${name}: no awaiting_merge route`);
    if (!new RegExp(`back to ${back}`).test(text)) violations.push(`${name}: no back status ${back}`);
    if (LABELS.test(text)) violations.push(`${name}: names an epic label`);
  }
  if (!/merge completes this ticket/.test(awaitingMerge)) violations.push('awaiting_merge: no merge-completes rule');
  if (LABELS.test(awaitingMerge)) violations.push('awaiting_merge: names an epic label');
  if (!/exit rule/.test(reviewer)) violations.push('roles/reviewer.md: does not point at the exit rule');
  if (/awaiting_merge/.test(reviewer)) violations.push('roles/reviewer.md: names a column exit');
  if (!/gh pr view .*--json baseRefName/.test(codeReview)) violations.push('code-review: no base lookup');
  if (!/multica issue get <parent> --output json/.test(codeReview)) violations.push('code-review: no label lookup');
  if (!/has-human-release/.test(codeReview)) violations.push('code-review: no label read');
  return violations;
}

test('the delivery contract, the base and the label read each have one home', () => {
  const contract = {
    shared: read('shared/instructions.md'),
    implementer: read('roles/implementer.md'),
    reviewer: read('roles/reviewer.md'),
    inProgress: steps.get('in_progress').instructions,
    humanProgress: steps.get('human_progress').instructions,
    inReview: steps.get('in_review').instructions,
    humanReview: steps.get('human_review').instructions,
    releaseReview: steps.get('release_review').instructions,
    awaitingMerge: steps.get('awaiting_merge').instructions,
    codeReview: read('skills/code-review/SKILL.md'),
  };
  assert.deepEqual(deliveryViolations(contract), []);
  // A work column that repeats the shared base rule is the duplication the contract removes.
  const restated = { ...contract, inProgress: `${contract.inProgress} Read \`Branch:\` under \`## Parent\`.` };
  assert.notDeepEqual(deliveryViolations(restated), []);
  // A reviewer that names a column exit instead of loading the rule is the second failure.
  const namesExit = { ...contract, reviewer: `${contract.reviewer} PASS moves to awaiting_merge.` };
  assert.notDeepEqual(deliveryViolations(namesExit), []);
  // A rule without its lookup commands is a remembered decision.
  const noLookup = { ...contract, codeReview: contract.codeReview.replace(/`gh pr view <pr> --json baseRefName`/, 'the base') };
  assert.notDeepEqual(deliveryViolations(noLookup), []);
  // A human column that names a label is the third copy the scan must catch.
  const labelInColumn = { ...contract, awaitingMerge: `${contract.awaitingMerge} Applies under \`has-human-release\`.` };
  assert.notDeepEqual(deliveryViolations(labelInColumn), []);
});

// The conflicts condition is one rule, found with `wakeup list` and replaced with `wakeup
// update`; the resolution contract keeps its one home in shared `## Delivery`. A re-arm with
// `wakeup create` duplicates the rule, so the suite forbids it.
const CONFLICT_HOMES = {
  '--until-pr conflicts': 'skills/code-review/SKILL.md',
  'Lockfile/disjoint hunks': 'shared/instructions.md',
  'Behind-but-clean': 'shared/instructions.md',
};

function mergeableViolations({ shared, codeReview, catalog, columns }) {
  const violations = [];
  const review = codeReview.replace(/\s+/g, ' ');
  const delivery = /^## Delivery\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';
  if (!/[Aa]t every review/.test(review)) violations.push('code-review: the condition is not kept at every review');
  if (!review.includes('multica issue wakeup list <ticket>')) violations.push('code-review: no wakeup list');
  if (!review.includes('multica issue wakeup update <ticket> <wakeup-id> --until-pr conflicts --mode continuous --agent-id <seat>'))
    violations.push('code-review: no wakeup update');
  if (!/replaces one rule|replace its whole configuration/.test(review)) violations.push('code-review: update does not replace');
  if (/wakeup create <ticket> --until-pr conflicts --mode continuous/.test(review)) violations.push('code-review: re-arms with wakeup create');
  if (!/survives the PASS into `awaiting_merge`/.test(review)) violations.push('code-review: no surviving condition');
  for (const seat of ['Planner for a spec PR', 'Implementer for a delivery PR', 'Release seat for a release PR'])
    if (!review.includes(seat)) violations.push(`code-review: no ${seat}`);
  for (const phrase of ['A push after a PASS', "delta `H...H'`", 'fresh PASS', 'review column that PASSed it'])
    if (!review.includes(phrase)) violations.push(`code-review: no ${phrase}`);
  for (const phrase of ['merge the base', 'resolve inside `## Touch`', 'rerun the check', 'Lockfile/disjoint hunks', 'changed meaning', 'Behind-but-clean'])
    if (!delivery.includes(phrase)) violations.push(`shared Delivery: no ${phrase}`);
  for (const [path, text] of Object.entries(catalog))
    for (const [phrase, home] of Object.entries(CONFLICT_HOMES))
      if (path !== home && text.includes(phrase)) violations.push(`${path}: second copy of ${phrase}`);
  for (const [key, text] of Object.entries(columns))
    for (const phrase of Object.keys(CONFLICT_HOMES))
      if (text.includes(phrase)) violations.push(`${key}: column restates ${phrase}`);
  return violations;
}

test('the conflicts rule is found and updated in place, never re-created', () => {
  const catalog = ['roles', 'shared', 'skills', 'templates'].flatMap(directory =>
    readdirSync(join(ROOT, directory), { recursive: true })
      .filter(name => /\.(md|json)$/.test(name))
      .map(name => `${directory}/${name}`));
  const contract = {
    shared: read('shared/instructions.md'),
    codeReview: read('skills/code-review/SKILL.md'),
    catalog: Object.fromEntries(catalog.map(path => [path, read(path)])),
    columns: Object.fromEntries(workflow.steps.map(step => [step.status_key, step.instructions ?? ''])),
  };
  assert.deepEqual(mergeableViolations(contract), []);
  // A column that restates the condition is the second copy the contract removes.
  const armedColumn = { ...contract, columns: { ...contract.columns, in_review: `${contract.columns.in_review} --until-pr conflicts` } };
  assert.notDeepEqual(mergeableViolations(armedColumn), []);
  const splitInRole = { ...contract, catalog: { ...contract.catalog, 'roles/implementer.md': `${contract.catalog['roles/implementer.md']} Lockfile/disjoint hunks` } };
  assert.notDeepEqual(mergeableViolations(splitInRole), []);
  // The old create-replaces command is the duplicate the update replaces.
  const rearmed = { ...contract, codeReview: contract.codeReview.replace('multica issue wakeup update <ticket> <wakeup-id> --until-pr conflicts --mode continuous --agent-id <seat>', 'multica issue wakeup create <ticket> --until-pr conflicts --mode continuous --agent-id <seat>') };
  assert.notDeepEqual(mergeableViolations(rearmed), []);
  // Removing the delta re-review breaks the void-PASS contract.
  const fullReReview = { ...contract, codeReview: contract.codeReview.replace('delta `H...H\'`', 'full diff') };
  assert.notDeepEqual(mergeableViolations(fullReReview), []);
});

test('approval is the merge, not an approval comment', () => {
  assert.doesNotMatch(guide, /approval comment/);
  assert.doesNotMatch(guide, /approves the spec and the ticket breakdown/);
  assert.doesNotMatch(read('roles/planner.md'), /approval comment/);
  for (const path of ['skills/to-spec/SKILL.md', 'skills/to-tickets/SKILL.md', 'skills/grilling/SKILL.md'])
    assert.doesNotMatch(read(path), /approval-owner comment/, path);
});

test('the usage guide names every column, the labels and the promotion route', () => {
  for (const key of steps.keys()) assert.ok(guide.includes(`\`${key}\``), `docs/factory.md does not name ${key}`);
  for (const label of ['has-human-implementer', 'has-human-release']) assert.ok(guide.includes(`\`${label}\``), `docs/factory.md does not name ${label}`);
  for (const label of ['human-assigned', 'manual-merge']) assert.ok(!guide.includes(`\`${label}\``), `docs/factory.md still names ${label}`);
  assert.match(guide, /four-row/);
  assert.match(guide, /`skills\/code-review\/`/);
  for (const mode of ['autonomous', 'human']) assert.ok(guide.toLowerCase().includes(mode), `docs/factory.md has no ${mode} mode`);
});

// The guide is what a human and a new repository read, and the trigger recipe is operator
// state, so both are pinned with the routes. A guide that still describes main-only delivery,
// a modes table that loses the two-merge cost, or an unfiltered trigger is the failure class
// this matrix exists to catch.
function guideViolations({ guide: text, apply, workflowFile }) {
  const violations = [];
  for (const [term, pattern] of [
    ['the integration branch', /integration branch/],
    ['the fork at the spec sha', /forks? the integration branch[^.]*from `main` at the spec sha/],
    ['the spec PR base', /targets (it|that branch|the integration branch)/],
    ['the delivery base', /`Branch: <epic-key>`/],
    ['the release child', /release child/],
    ['the release head', /release child: <release-key> → main/],
    ['integration branch cleanup', /Planner deletes the integration branch when it accepts/],
    ['one squash', /one squash/],
    ['integration branch scratch', /integration branch is scratch/],
    ['branch-scoped done', /branch-scoped `done`/],
    ['main-scoped epic acceptance', /`main`-scoped/],
    ['the two-merge has-human-release', /two human merges/],
    ['release order', /### Release order/],
    ['the cancelled-epic sweep', /cancelled-epic sweep/],
    ['the blocker carrier', /`--blocked-by <dependency-epic>`/],
    ['the stage wait', /`via: stage`/],
    ['no manual intra-epic edge', /no manual intra-epic edge/],
    ['the platform floor', /Multica 0\.13\.0 or newer/],
    ['the floor refusal', /refuses a lower version before any plan or write/],
    ['the one topology', /Every grilling produces an epic/],
    ['the one closing question', /one close-and-start question: apply the chosen mode labels and start\s+stage 1/],
    ['the human seat', /human seat the project's workflow binds to the\s+`human`\s+role from the live handler/],
    ['the kickoff record', /records the `human` seat on the epic as a readback/],
    ['the link read-back', /linked pull requests[^.]*moves?\s+only when the PR is listed/],
    ['the kickoff labels step', /kickoff[^.]*labels|labels[^.]*kickoff/i],
    ['the owned create', /stage-1\s+(spec\s+)?child[^.]*project[^.]*planned owner/],
    ['the delivering ticket key', /delivering ticket's, never the epic's/],
    ['the spec child title', /spec child's title[^.]*repeating the epic key/],
    ['the epic state', /`epic_progress`/],
    ['the release lane', /`release_progress`/],
    ['the exit-rule pointer', /`skills\/code-review\/`/],
    ['the promotion pointer', /four-row/],
  ]) if (!pattern.test(text)) violations.push(`docs/factory.md: no ${term}`);
  for (const term of DELETED_TOPOLOGY)
    if (text.includes(term)) violations.push('docs/factory.md: keeps the deleted topology');
  if (/status entry reassigns natively|member handler binds it/.test(text)) violations.push('docs/factory.md: restates the creation rule');
  if (/N \+ 1/.test(text)) violations.push('docs/factory.md: keeps the N + 1 arithmetic');
  if (/single ticket defaults to/.test(text)) violations.push('docs/factory.md: keeps the single-ticket default');
  for (const [term, pattern] of [
    ['integration branch unprotected', /integration branch[^.\n]*unprotected/],
    ['Automatically delete head branches', /Automatically delete head branches/],
    ['Allow auto-merge off', /Allow auto-merge/],
    ['Require branches to be up to date on main', /Require branches to be up to date[^.\n]*`main`/],
    ['the push trigger', /push: branches: \[main\]/],
    ['the pull_request trigger', /pull_request: branches: \[main\]/],
  ]) if (!pattern.test(apply)) violations.push(`docs/apply.md: no ${term}`);
  if (!/push:\s*\n\s*branches: \[main\]/.test(workflowFile)) violations.push('.github/workflows/validate.yml: no push filter');
  if (!/pull_request:\s*\n\s*branches: \[main\]/.test(workflowFile)) violations.push('.github/workflows/validate.yml: no pull_request filter');
  return violations;
}

test('the guide carries the integration topology and the narrowed routes', () => {
  const contract = {
    guide,
    apply: read('docs/apply.md'),
    workflowFile: read('.github/workflows/validate.yml'),
  };
  assert.deepEqual(guideViolations(contract), []);
  // A guide that still describes main-only delivery is the graph the topology replaces.
  const noTopology = { ...contract, guide: contract.guide.replace(/integration branch/g, 'branch') };
  assert.notDeepEqual(guideViolations(noTopology), []);
  // The integration topology must keep its human-merge cost: the spec and the release.
  const noTwoMergeCost = { ...contract, guide: contract.guide.replace(/Under\s+`has-human-release`,\s*one topology costs two human merges[^.]*\./, '') };
  assert.notDeepEqual(guideViolations(noTwoMergeCost), []);
  // A guide that drops the read-back or the one question leaves the human on the old prose.
  assert.notDeepEqual(guideViolations({ ...contract, guide: contract.guide.replace(/linked pull requests[^.]*listed\./, '') }), []);
  assert.notDeepEqual(guideViolations({ ...contract, guide: contract.guide.replace('one close-and-start question: apply the chosen mode labels', 'one question: apply the chosen mode labels') }), []);
  // The reference trigger is the recipe a new repository copies.
  const unfiltered = { ...contract, workflowFile: contract.workflowFile.replace(/\n\s*branches: \[main\]/g, '') };
  assert.notDeepEqual(guideViolations(unfiltered), []);
});
