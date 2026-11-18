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
const guide = readFileSync(join(ROOT, 'docs/factory.md'), 'utf8');
const read = path => readFileSync(join(ROOT, path), 'utf8');

// The only edges the graph declares. Everything else the instructions carry is checked here
// as a route table: the target must be a real column, and the column must name it.
const ROUTES = {
  epic_progress: ['todo', 'done'],
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
  const rows = planner.split('\n').filter(line => /^\|/.test(line)).filter(line => !/^\| ---/.test(line)).slice(1);
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

test('the sweep is the only stale-review guard and the 90m timer is gone', () => {
  const catalog = ['roles', 'shared', 'skills', 'templates'].flatMap(directory =>
    readdirSync(join(ROOT, directory), { recursive: true })
      .filter(name => /\.(md|json)$/.test(name))
      .map(name => `${directory}/${name}`));
  for (const path of catalog) {
    assert.doesNotMatch(read(path), /\b90m\b|90-minute|90 minute/i, `${path} still registers the 90m timer`);
    assert.doesNotMatch(read(path), /comment\.created/, `${path} registers a comment.created wake`);
  }
  const planner = read('roles/planner.md');
  assert.match(planner, /`task\.failed` per issue/);
  assert.match(planner, /--until-status cancelled/);
  assert.match(planner, /one `--until-children-done --stage N` barrier per promotion/);
  assert.match(planner, /replaced not duplicated/);
});

test('the guide carries the sweep, its threshold, its move and the human columns it skips', () => {
  const section = /### The stale sweep\n\n([\s\S]*?)\n\n### /.exec(guide)?.[1] ?? '';
  for (const column of REVIEWS) assert.ok(section.includes(`\`${column}\``), `the sweep section does not read ${column}`);
  assert.match(section, /two or more hours/);
  assert.match(section, /moves to `blocked`/);
  assert.match(section, /`human_progress`/);
  assert.match(section, /`awaiting_merge`/);
  assert.match(section, /first live run is the acceptance/);
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
  assert.match(handoff, /The linked PR is the delivery handoff/);
  assert.match(handoff, /empty body is not a finding/);
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
  assert.match(planner, /the wake promotes/);
  const tickets = read('skills/to-tickets/SKILL.md');
  assert.match(tickets, /before the spec PR leaves `spec_progress`/);
  assert.match(tickets, /--status backlog/);
  assert.match(tickets, /never the spec child/);
  assert.doesNotMatch(tickets, /After the spec child is done/);
  assert.doesNotMatch(tickets, /only the frontier is `todo`/);
  const step = steps.get('spec_progress').instructions;
  assert.match(step, /Publish the whole slice/);
  assert.match(step, /create nothing after it/);
  assert.match(step, /reconcile the existing children/);
  assert.match(guide, /Publishing before the child closes/);
  assert.match(guide, /No child is created after the merge/);
  const adr = read('docs/adr/0007-publish-the-slice-in-the-spec-run.md');
  assert.match(adr, /One barrier wake per epic/);
});

// The spec run is the only place the topology is chosen and published. A main-only spec
// run, or a delivery body with no base, is a contract failure, not a wording preference.
function specRunViolations({ planner, step, tickets, specSkill }) {
  const violations = [];
  for (const [name, text] of [['roles/planner.md', planner], ['spec_progress', step]]) {
    if (!/forks? `spec\/<epic>` from `main`/i.test(text)) violations.push(`${name}: no fork from main`);
    if (!/(spec PR|the PR) targets (it|that branch)/.test(text)) violations.push(`${name}: spec PR is not targeted at the branch`);
    if (!/gh pr list --base main --state open/.test(text)) violations.push(`${name}: no release query`);
    if (!/`spec\/\*`/.test(text)) violations.push(`${name}: release query does not filter spec/*`);
    if (!/--until-issue <release>/.test(text)) violations.push(`${name}: release query does not park on the release`);
    if (!/direct-to-main/.test(text)) violations.push(`${name}: no direct-to-main escape hatch`);
  }
  if (!/force-push/.test(step)) violations.push('spec_progress: a rework does not force-push');
  if (!/epic-cancelled/.test(step)) violations.push('spec_progress: no cancelled-epic sweep');
  if (!/--until-status cancelled/.test(planner)) violations.push('roles/planner.md: no cancelled-epic condition');
  if (!/never `main`/.test(step)) violations.push('spec_progress: an integration spec may target main');
  if (!/`Branch: spec\/<epic>`/.test(step)) violations.push('spec_progress: no Branch line');
  if (!/final-stage release child/.test(step)) violations.push('spec_progress: no final-stage release child');
  if (!/final-stage child is release/.test(planner)) violations.push('roles/planner.md: no release-kind read');
  if (!/records `integration: spec\/<epic>`/.test(step)) violations.push('spec_progress: no integration record');
  if (!/`integration: none`/.test(step)) violations.push('spec_progress: no direct-to-main record');
  if (!/single-ticket breakdown defaults to `direct-to-main`/.test(step)) violations.push('spec_progress: no single-ticket default');
  if (!/integration: spec\/<epic/.test(specSkill)) violations.push('to-spec: no integration record');
  if (!/integration: none/.test(specSkill)) violations.push('to-spec: no direct-to-main record');
  if (!/single ticket defaults to `direct-to-main`/.test(specSkill)) violations.push('to-spec: no single-ticket default');
  if (!/forks that branch from `main` at the spec sha/.test(specSkill) || !/targets its approval PR at `spec\/<epic-key>`/.test(specSkill))
    violations.push('to-spec: approval PR is not targeted at the recorded branch');
  const body = /<issue-template>([\s\S]*?)<\/issue-template>/.exec(tickets)?.[1] ?? '';
  if (!/^Branch: spec\/<epic-key>/m.test(body)) violations.push('to-tickets: no Branch line in the ticket template');
  if (!/absence means `main`/.test(tickets)) violations.push('to-tickets: no main default');
  if (!/release child is the final publication: created last, in `backlog`, in the final stage/.test(tickets))
    violations.push('to-tickets: release child is not last, backlog and final stage');
  for (const clause of ['release procedure', 'base/source branch', 'included children', '`Touch:` union', 'Create no child after the spec PR opens'])
    if (!tickets.includes(clause)) violations.push(`to-tickets: missing ${clause}`);
  return violations;
}

test('the spec run forks, records and targets the integration branch', () => {
  const contract = {
    planner: read('roles/planner.md'),
    step: steps.get('spec_progress').instructions,
    tickets: read('skills/to-tickets/SKILL.md'),
    specSkill: read('skills/to-spec/SKILL.md'),
  };
  assert.deepEqual(specRunViolations(contract), []);
  // The two failures the matrix exists to catch: a spec PR on main, and a body with no base.
  const mainOnly = { ...contract, step: contract.step.replace(/forks `spec\/<epic>`/, 'targets the spec PR at `main`') };
  assert.notDeepEqual(specRunViolations(mainOnly), []);
  const noBase = { ...contract, tickets: contract.tickets.replace(/^Branch: spec\/<epic-key>.*$/m, '') };
  assert.notDeepEqual(specRunViolations(noBase), []);
});

// The delivery contract lives once in shared; the columns carry only their own route and the
// review columns point at the one exit rule. A column that restates the base or the label
// read, or a reviewer that names a column exit, is the failure this matrix catches.
function deliveryViolations({ shared, implementer, reviewer, inProgress, humanProgress, inReview, humanReview, releaseReview, awaitingMerge, codeReview }) {
  const violations = [];
  if (!/`Branch:`/.test(shared)) violations.push('shared: no body-derived branch');
  if (!/absen[ct]e? means `main`/.test(shared)) violations.push('shared: main is not the default base');
  if (!/(branch from it|PR into it)/.test(shared)) violations.push('shared: the PR is not targeted at the base');
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
    ['the integration branch', /`spec\/<epic>`/],
    ['the fork at the spec sha', /forks? `spec\/<epic>` from `main` at the spec sha/],
    ['the spec PR base', /spec PR targets (it|that branch)/],
    ['the delivery base', /`Branch: spec\/<epic>`/],
    ['the release child', /release child/],
    ['one squash', /one squash/],
    ['spec scratch', /`spec\/\*`[^.]*scratch/],
    ['branch-scoped done', /branch-scoped `done`/],
    ['main-scoped epic acceptance', /`main`-scoped/],
    ['the two-merge has-human-release', /two human merges/],
    ['the direct-to-main N + 1', /N \+ 1/],
    ['release serialization', /serializ/i],
    ['the cancelled-epic sweep', /cancelled-epic sweep/],
    ['the stale sweep', /### The stale sweep/],
    ['direct-to-main', /direct-to-main/],
    ['the single-ticket default', /single-ticket/],
    ['the modes table two-merge row', /^\| `spec\/<epic>` \| 2 —/m],
    ['the epic state', /`epic_progress`/],
    ['the release lane', /`release_progress`/],
    ['the exit-rule pointer', /`skills\/code-review\/`/],
    ['the promotion pointer', /four-row/],
  ]) if (!pattern.test(text)) violations.push(`docs/factory.md: no ${term}`);
  for (const [term, pattern] of [
    ['`spec/*` unprotected', /`spec\/\*`[^.\n]*unprotected/],
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
  const noTopology = { ...contract, guide: contract.guide.replace(/`spec\/<epic>`/g, '`main`') };
  assert.notDeepEqual(guideViolations(noTopology), []);
  // The modes table must keep the integration human-merge cost: the spec and the release.
  const noTwoMergeRow = { ...contract, guide: contract.guide.replace(/^\| `spec\/<epic>` \| 2 —.*$/m, '') };
  assert.notDeepEqual(guideViolations(noTwoMergeRow), []);
  // The reference trigger is the recipe a new repository copies.
  const unfiltered = { ...contract, workflowFile: contract.workflowFile.replace(/\n\s*branches: \[main\]/g, '') };
  assert.notDeepEqual(guideViolations(unfiltered), []);
});
