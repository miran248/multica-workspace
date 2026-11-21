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
const catalogFiles = () => ['roles', 'shared', 'skills', 'templates'].flatMap(directory =>
  readdirSync(join(ROOT, directory), { recursive: true })
    .filter(name => /\.(md|json)$/.test(name))
    .map(name => `${directory}/${name}`));
const catalogText = () => Object.fromEntries(catalogFiles().map(path => [path, read(path)]));

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
    for (const phrase of ['Branch:', 'Touch:', 'Conventional Commits', 'squash', 'auto-merge', 'one PR', 'delivering ticket', 'head branch'])
      assert.ok(!text.includes(phrase), `roles/${name} repeats ${phrase}`);
  }
});

// A create names the project and the role promotion will pick, once, in shared `## Ownership`.
// The publisher and the spec PASS act on that copy; a role, skill or column carrying the rule
// again is the third copy the contract removes.
const CREATION_RULE = ['`--project`', "the planned owner's `--assignee`", 'status entry still reassigns natively', 'member handler binds it'];
// A create command that passes a flag uses the rule; a file carrying two or more of its
// sentences restates it.
const ruleCopy = text => CREATION_RULE.filter(phrase => text.includes(phrase));

function ownershipViolations({ shared, catalog }) {
  const violations = [];
  const ownership = /^## Ownership\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';
  for (const phrase of CREATION_RULE)
    if (!ownership.includes(phrase)) violations.push(`shared Ownership: no ${phrase}`);
  for (const [path, text] of Object.entries(catalog)) {
    const copies = path === 'shared/instructions.md' ? [] : ruleCopy(text);
    if (copies.length > 1) violations.push(`${path}: second copy of ${copies.join(', ')}`);
  }
  return violations;
}

test('the creation rule lives once in shared Ownership', () => {
  const contract = { shared: read('shared/instructions.md'), catalog: catalogText() };
  assert.deepEqual(ownershipViolations(contract), []);
  // A role that restates the create rule is the second copy the contract removes.
  const roleCopy = {
    ...contract,
    catalog: { ...contract.catalog, 'roles/implementer.md': `${contract.catalog['roles/implementer.md']} Create with \`--project\`; status entry still reassigns natively.` },
  };
  assert.notDeepEqual(ownershipViolations(roleCopy), []);
  // A shared contract without the create rule is no rule at all.
  const noRule = { ...contract, shared: contract.shared.replace(/^- Create with[\s\S]*?binds it\.$/m, '') };
  assert.notDeepEqual(ownershipViolations(noRule), []);
});

// The publisher checks the whole set before it publishes; the spec PASS reads the published
// set at the exact head. Both act on shared `## Ownership` and neither restates it.
function readerViolations({ tickets, review }) {
  const violations = [];
  const pass = /^## The spec PASS set read\n\n([\s\S]*?)\n\n## /m.exec(review)?.[1] ?? '';
  if (!/pre-flight/i.test(tickets)) violations.push('to-tickets: no pre-flight');
  if (!/shared\s+`## Ownership`/.test(tickets)) violations.push('to-tickets: does not act on shared Ownership');
  if (!/project and its planned owner/.test(tickets)) violations.push('to-tickets: the project and planned owner are not checked');
  if (!/fails the publish/.test(tickets)) violations.push('to-tickets: a broken child does not fail the publish');
  if (!/unassigned/.test(tickets)) violations.push('to-tickets: the unassigned child is not checked');
  if (!/`--project`/.test(tickets)) violations.push('to-tickets: the create call omits the project');
  if (!/shared\s+`## Ownership`/.test(review)) violations.push('code-review: does not act on shared Ownership');
  if (!/exact head/.test(pass)) violations.push('code-review: the set is not read at the exact head');
  if (!/`backlog`/.test(pass)) violations.push('code-review: the set states are not read');
  if (!/stage higher/.test(pass)) violations.push('code-review: the stage order is not read');
  if (!/ownerless/.test(pass)) violations.push('code-review: an ownerless child is not a blocking finding');
  if (!/human-lane child may be unassigned/.test(pass)) violations.push('code-review: the human-lane child is not excepted');
  return violations;
}

test('the publisher pre-flights the set and the spec PASS reads it', () => {
  const contract = { tickets: read('skills/to-tickets/SKILL.md'), review: read('skills/code-review/SKILL.md') };
  assert.deepEqual(readerViolations(contract), []);
  const noPreflight = { ...contract, tickets: contract.tickets.replace(/^\*\*Pre-flight[\s\S]*?publish part of it\.\n\n/m, '') };
  assert.notDeepEqual(readerViolations(noPreflight), []);
  const noSetRead = { ...contract, review: contract.review.replace(/^## The spec PASS set read\n\n[\s\S]*?\n\n## /m, '## ') };
  assert.notDeepEqual(readerViolations(noSetRead), []);
  // A set read that blocks every unassigned child fails a valid human-mode set.
  const noException = { ...contract, review: contract.review.replace('; the one human-lane child may be unassigned,', ',') };
  assert.notDeepEqual(readerViolations(noException), []);
  // A publish instruction without the project creates an issue outside the Factory graph.
  const noProject = { ...contract, tickets: contract.tickets.replace('with `--project`, ', 'with ') };
  assert.notDeepEqual(readerViolations(noProject), []);
});

// The delivering ticket's key is in the title and the head branch, never the epic's; the rule
// has one home, and the guide describes it without copying it.
const KEY_RULE = ["delivering ticket's key only", "never the epic's"];

function keyViolations({ shared, guide, catalog }) {
  const violations = [];
  const delivery = /^## Delivery\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';
  for (const phrase of KEY_RULE)
    if (!delivery.includes(phrase)) violations.push(`shared Delivery: no ${phrase}`);
  if (!/head branch/.test(delivery)) violations.push('shared Delivery: no head branch');
  if (!/spec child's title omits it/.test(delivery)) violations.push('shared Delivery: no spec child title rule');
  const commits = /^## Commits\n\n([\s\S]*?)\n\n## /m.exec(guide)?.[1] ?? '';
  if (!/delivering ticket/.test(commits)) violations.push('docs/factory.md: the commits prose does not name the delivering ticket');
  if (!/never the epic/.test(commits)) violations.push('docs/factory.md: the commits prose allows the epic key');
  for (const [path, text] of Object.entries(catalog))
    if (path !== 'shared/instructions.md')
      for (const phrase of KEY_RULE)
        if (text.includes(phrase)) violations.push(`${path}: second copy of ${phrase}`);
  return violations;
}

test('the key rule lives once in shared Delivery and the guide describes it', () => {
  const contract = { shared: read('shared/instructions.md'), guide: read('docs/factory.md'), catalog: catalogText() };
  assert.deepEqual(keyViolations(contract), []);
  // The epic's key in the rule is the defect the rule exists to prevent.
  const epicKey = { ...contract, shared: contract.shared.replace("delivering ticket's key only", "epic's key only") };
  assert.notDeepEqual(keyViolations(epicKey), []);
  // A skill that restates the rule is the second copy.
  const skillCopy = {
    ...contract,
    catalog: { ...contract.catalog, 'skills/to-tickets/SKILL.md': `${contract.catalog['skills/to-tickets/SKILL.md']} The head branch carries the delivering ticket's key only.` },
  };
  assert.notDeepEqual(keyViolations(skillCopy), []);
  // A guide that never names the key leaves the human reading the old subject alone.
  const silentGuide = { ...contract, guide: contract.guide.replace(/The key is the delivering ticket's[^.]*\./, '') };
  assert.notDeepEqual(keyViolations(silentGuide), []);
});

test('code-review names the five delivery checks', () => {
  const review = read('skills/code-review/SKILL.md');
  const section = /## Delivery checks\n\n([\s\S]*?)\n\n## /.exec(review)?.[1] ?? '';
  assert.equal([...section.matchAll(/^\d+\. /gm)].length, 5);
});

// The gate closes on one question: the labels and the start are one yes, the labels stay the
// last field, a human mode names the live `human` seat, and wayfinder is a separate explicit
// method. A packet that only asks the labels never starts the factory.
const PACKET = ['Destination', 'Slice outline', 'Mode labels'];

function gateViolations(grilling) {
  const violations = [];
  const fields = [...grilling.matchAll(/^- \*\*(.+?)\*\*/gm)].map(([, field]) => field);
  if (fields.join() !== PACKET.join()) violations.push('grilling: the packet fields are not Destination, Slice outline, Mode labels');
  if (!/which of `has-human-implementer` and `has-human-release` to apply to the epic before the kickoff, or neither/.test(grilling))
    violations.push('grilling: the labels field does not name the modes');
  if (!/one close-and-start question: apply the chosen labels and start stage 1/.test(grilling))
    violations.push('grilling: the packet does not end on one close-and-start question');
  if (!/labels stay the last field/.test(grilling)) violations.push('grilling: the labels field is not last');
  if (!/human seat[^.]*`human` role[^.]*handler/.test(grilling))
    violations.push('grilling: a human mode does not name the seat read from the handler');
  if (!/invoked explicitly and never tied to grilling/.test(grilling))
    violations.push('grilling: wayfinder is not the explicit-invocation method');
  if (!/answer starts nothing/.test(grilling)) violations.push('grilling: an answer inside a wayfinder ticket starts something');
  if (/wayfinder map, not a factory shape/.test(grilling)) violations.push('grilling: a non-empty frontier selects a wayfinder map');
  if (/\*\*Shape\*\*/.test(grilling)) violations.push('grilling: the packet carries a shape field');
  return violations;
}

test('grilling ends on one close-and-start question and creates nothing first', () => {
  const grilling = read('skills/grilling/SKILL.md');
  assert.deepEqual(gateViolations(grilling), []);
  // A packet that only asks the labels never starts the factory.
  const labelsOnly = grilling.replace('one close-and-start question: apply the chosen labels and start stage 1', 'the labels question');
  assert.notDeepEqual(gateViolations(labelsOnly), []);
  // The sentence that let a frontier select a container the user never asked for.
  assert.notDeepEqual(gateViolations(`${grilling} A non-empty frontier is a wayfinder map, not a factory shape.`), []);
  // A wayfinder tied back to every grilling is the defect the sentence corrects.
  assert.notDeepEqual(gateViolations(grilling.replace('invoked explicitly and never tied to grilling', 'invoked whenever the frontier is non-empty')), []);
  assert.match(grilling, /no epic, spec or ticket is a side effect/);
  assert.match(grilling, /No spec run starts and no slice is written before the user answers/);
  assert.match(grilling, /The slice freezes when the spec PR opens/);
});

// The link is proved, not assumed: shared `## Handoffs` states the read-back after the PR opens,
// the operator fix and the blocked move; no role, skill or column instruction restates it.
const READ_BACK = ['multica issue pull-requests', 'operator fix', 'started lane'];

function readBackViolations({ shared, guide, catalog }) {
  const violations = [];
  const handoffs = /^## Handoffs\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';
  for (const phrase of READ_BACK) if (!handoffs.includes(phrase)) violations.push(`shared Handoffs: no ${phrase}`);
  if (!/read `multica issue pull-requests <ticket>` after opening/.test(handoffs))
    violations.push('shared Handoffs: the link is not read after the PR opens');
  if (!/move or merge[^.]*only when listed/.test(handoffs)) violations.push('shared Handoffs: the move does not wait for the listing');
  if (!/move to `blocked`/.test(handoffs)) violations.push('shared Handoffs: an empty read does not move to blocked');
  if (!/The linked PR is the delivery handoff/.test(handoffs)) violations.push('shared Handoffs: the linked PR is not the handoff');
  if (!/empty body is not a finding/.test(handoffs)) violations.push('shared Handoffs: an empty body became a finding');
  if (!/linked pull requests[^.]*moves?\s+only when the PR is listed/.test(guide))
    violations.push('docs/factory.md: the handoff section does not describe the read-back');
  for (const [path, text] of Object.entries(catalog))
    if (path !== 'shared/instructions.md' && text.includes('multica issue pull-requests'))
      violations.push(`${path}: second copy of the read-back`);
  if (guide.includes('multica issue pull-requests')) violations.push('docs/factory.md: second copy of the read-back');
  return violations;
}

test('the linked PR is read back before the move, once in shared Handoffs', () => {
  const contract = { shared: read('shared/instructions.md'), guide: read('docs/factory.md'), catalog: catalogText() };
  assert.deepEqual(readBackViolations(contract), []);
  // A contract that assumes the link is the defect the read-back exists to catch.
  const noReadBack = {
    ...contract,
    shared: contract.shared.replace(/^- The linked PR is the delivery handoff:.*$/m, '- The linked PR is the delivery handoff.'),
  };
  assert.notDeepEqual(readBackViolations(noReadBack), []);
  // A role that repeats the read-back is the third copy the contract removes.
  const restated = {
    ...contract,
    catalog: {
      ...contract.catalog,
      'roles/implementer.md': `${contract.catalog['roles/implementer.md']} Read \`multica issue pull-requests <ticket>\` before the move.`,
    },
  };
  assert.notDeepEqual(readBackViolations(restated), []);
  // A guide that never describes the read-back leaves the human with the old assumption.
  const silentGuide = { ...contract, guide: contract.guide.replace(/linked pull requests[^.]*listed\./, '') };
  assert.notDeepEqual(readBackViolations(silentGuide), []);
});

test('the catalog declares no document and a declared document must have a file', t => {
  const catalog = readJSON(join(ROOT, 'templates/default.json'));
  assert.deepEqual(catalog.documents, {});
  const f = fixture(t);
  const path = join(f.root, 'templates/default.json');
  writeFileSync(path, JSON.stringify({ ...catalog, documents: { missing: 'templates/missing.md' } }));
  assert.throws(() => resolve(f.binding, f.root), /ENOENT|missing\.md/);
});
