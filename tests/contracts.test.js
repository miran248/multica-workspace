import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJSON, resolve } from '../scripts/config.js';
import { catalogFiles, catalogText, fixture, read } from './support/helpers.js';

// Two shapes, each authored once: a ticket body from to-tickets, a comment from the shared
// contract. Everything else either names the shape or carries its own rule.
const ticket = /<issue-template>([\s\S]*?)<\/issue-template>/.exec(read('skills/to-tickets/SKILL.md'))[1];

test('a ticket body is Branch: plus What, Acceptance and Touch', () => {
  assert.match(ticket, /^Branch: <epic-key>/m);
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
const CREATION_RULE = ['Every ticket has its planned owner', '`--project`', "the planned owner's `--assignee`", 'status entry reassigns natively', 'Planner is the fallback', 'the human lane\'s planned owner is the live `human` seat', 'none unassigned'];
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
    catalog: { ...contract.catalog, 'roles/implementer.md': `${contract.catalog['roles/implementer.md']} Create with \`--project\` and the planned owner's \`--assignee\`; status entry reassigns natively.` },
  };
  assert.notDeepEqual(ownershipViolations(roleCopy), []);
  // A shared contract without the create rule is no rule at all.
  const noRule = { ...contract, shared: contract.shared.replace(/^- Every ticket has[\s\S]*?none unassigned\.$/m, '') };
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
  if (!/no child is unassigned/.test(tickets)) violations.push('to-tickets: an unassigned child is not checked');
  if (!/`--project`/.test(tickets)) violations.push('to-tickets: the create call omits the project');
  if (!/shared\s+`## Ownership`/.test(review)) violations.push('code-review: does not act on shared Ownership');
  if (!/exact head/.test(pass)) violations.push('code-review: the set is not read at the exact head');
  if (!/`backlog`/.test(pass)) violations.push('code-review: the set states are not read');
  if (!/stage higher/.test(pass)) violations.push('code-review: the stage order is not read');
  if (!/ownerless/.test(pass)) violations.push('code-review: an ownerless child is not a blocking finding');
  if (!/human lane's planned owner is the live/.test(pass)) violations.push('code-review: the human lane owner is not the live seat');
  if (/human-lane child may be unassigned/.test(pass)) violations.push('code-review: the human lane is exempted from the owner read');
  return violations;
}

test('the publisher pre-flights the set and the spec PASS reads it', () => {
  const contract = { tickets: read('skills/to-tickets/SKILL.md'), review: read('skills/code-review/SKILL.md') };
  assert.deepEqual(readerViolations(contract), []);
  const noPreflight = { ...contract, tickets: contract.tickets.replace(/^\*\*Pre-flight[\s\S]*?publish part of it\.\n\n/m, '') };
  assert.notDeepEqual(readerViolations(noPreflight), []);
  const noSetRead = { ...contract, review: contract.review.replace(/^## The spec PASS set read\n\n[\s\S]*?\n\n## /m, '## ') };
  assert.notDeepEqual(readerViolations(noSetRead), []);
  // A set read that exempts the human lane leaves the one ownerless child unchecked.
  const exception = { ...contract, review: contract.review.replace("the human lane's planned owner is the live\n`human` seat, so any ownerless child", 'the one human-lane child may be unassigned; any other ownerless child') };
  assert.notDeepEqual(readerViolations(exception), []);
  // A publish instruction without the project creates an issue outside the Factory graph.
  const noProject = { ...contract, tickets: contract.tickets.replace('with `--project`, ', 'with ') };
  assert.notDeepEqual(readerViolations(noProject), []);
});

// The head and rework rules have one home: shared `## Delivery`. The integration branch is the
// epic's key, every PR head is the delivering ticket's key, and a rewrite is leased, never a
// mandated force-push. The guide describes the key without copying the rule.
const HEAD_RULE = ["The integration branch is the epic's key", "every PR head is the delivering ticket's key", 'the epic never heads a PR', 'holds no link'];
const REWORK_RULE = ['A rework commits to the same head', 'only when they must not remain', '--force-with-lease=<remote-ref>:<expected-sha>', 'never `--force`, `-f`, `--mirror`, `+`, `main` or integration branch'];
const RULE = [...HEAD_RULE, ...REWORK_RULE];

function keyViolations({ shared, guide, catalog }) {
  const violations = [];
  const delivery = /^## Delivery\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';
  for (const phrase of RULE)
    if (!delivery.includes(phrase)) violations.push(`shared Delivery: no ${phrase}`);
  if (!/never heads a PR/.test(delivery)) violations.push('shared Delivery: no head rule');
  if (/force-push the same head/i.test(delivery)) violations.push('shared Delivery: mandates a force-push rework');
  const commits = /^## Commits\n\n([\s\S]*?)\n\n## /m.exec(guide)?.[1] ?? '';
  if (!/delivering ticket/.test(commits)) violations.push('docs/factory.md: the commits prose does not name the delivering ticket');
  if (!/never the epic/.test(commits)) violations.push('docs/factory.md: the commits prose allows the epic key');
  // The workflow's spec_progress instruction carries its instance, not the base and the lease;
  // shared Delivery is the one contract copy, and no other carrier restates the rule.
  for (const [path, text] of Object.entries(catalog))
    if (path !== 'shared/instructions.md')
      for (const phrase of RULE)
        if (text.includes(phrase)) violations.push(`${path}: second copy of ${phrase}`);
  return violations;
}

test('the head and rework rules live once in shared Delivery and the guide describes the key', () => {
  const contract = { shared: read('shared/instructions.md'), guide: read('docs/factory.md'), catalog: catalogText() };
  assert.deepEqual(keyViolations(contract), []);
  // The epic's key in the head rule is the defect the rule exists to prevent.
  const epicHead = { ...contract, shared: contract.shared.replace("every PR head is the delivering ticket's key", "every PR head is the epic's key") };
  assert.notDeepEqual(keyViolations(epicHead), []);
  // A mandated force-push is the old default the additive rework replaces.
  const force = { ...contract, shared: contract.shared.replace('A rework commits to the same head', 'A rework force-pushes the same head') };
  assert.notDeepEqual(keyViolations(force), []);
  // A skill that restates the rule is the second copy.
  const skillCopy = {
    ...contract,
    catalog: { ...contract.catalog, 'skills/to-tickets/SKILL.md': `${contract.catalog['skills/to-tickets/SKILL.md']} The integration branch is the epic's key.` },
  };
  assert.notDeepEqual(keyViolations(skillCopy), []);
  // A column that restates the lease is the second copy the workflow carrier removes.
  const columnCopy = {
    ...contract,
    catalog: { ...contract.catalog, 'templates/workflows/factory.json': `${contract.catalog['templates/workflows/factory.json']} ${REWORK_RULE[2]}` },
  };
  assert.notDeepEqual(keyViolations(columnCopy), []);
  // A guide that never names the key leaves the human reading the old subject alone.
  const silentGuide = { ...contract, guide: contract.guide.replace(/The key is the delivering ticket's[^.]*\./, '') };
  assert.notDeepEqual(keyViolations(silentGuide), []);
});

// The cap rewrite must not trade a rule for a word: these are the meanings a trimmed draft
// dropped, and each has a pin so the next rewrite cannot lose it silently.
const RESTORED = ['GitHub appends `(#N)`', 'own PR head, after a fetch', 'Report configured/verified/pending/deployed', 'link every ticket', 'self-merge, auto-merge', 'an open blocker starts nothing', 'stop for the human lane'];

function restoredMissing(shared) {
  return RESTORED.filter(phrase => !shared.includes(phrase));
}

test('the shared contract keeps the rules and qualifiers its cap rewrite restores', () => {
  const shared = read('shared/instructions.md');
  assert.deepEqual(restoredMissing(shared), []);
  // Dropping the quantifier or the human-lane stop is the regression this pin catches.
  assert.deepEqual(restoredMissing(shared.replace('link every ticket', 'link tickets')), ['link every ticket']);
  assert.deepEqual(restoredMissing(shared.replace('stop for the human lane', 'human')), ['stop for the human lane']);
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
  if (!/readback/.test(grilling)) violations.push('grilling: the seat is not a readback');
  if (/per-epic choice/.test(grilling) && !/never a per-epic choice/.test(grilling))
    violations.push('grilling: the seat is a per-epic choice');
  if (!/opens in `backlog`/.test(grilling)) violations.push('grilling: the epic does not open in backlog');
  if (/opens in `todo`/.test(grilling)) violations.push('grilling: the epic opens in todo');
  if (!/invoked explicitly and never tied to grilling/.test(grilling))
    violations.push('grilling: wayfinder is not the explicit-invocation method');
  if (!/answer starts nothing/.test(grilling)) violations.push('grilling: an answer inside a wayfinder ticket starts something');
  if (/wayfinder map, not a factory shape/.test(grilling)) violations.push('grilling: a non-empty frontier selects a wayfinder map');
  if (/\*\*Shape\*\*/.test(grilling)) violations.push('grilling: the packet carries a shape field');
  if (!/reslice window/.test(grilling)) violations.push('grilling: the change window is not named');
  if (!/freezes at the first started child/.test(grilling)) violations.push('grilling: the freeze is not the first started child');
  if (/freezes when the spec PR opens/.test(grilling)) violations.push('grilling: the slice freezes when the spec PR opens');
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
  assert.match(grilling, /The slice stays changeable inside the reslice window/);
  assert.match(grilling, /freezes at the first started child/);
  assert.doesNotMatch(grilling, /freezes when the spec PR opens/);
  // The old sentence is the one failure the corrected pin exists for: a slice that freezes on
  // the spec PR instead of the first started child rejects the reslice window.
  assert.notDeepEqual(gateViolations(grilling.replace('freezes at the first started child', 'freezes when the spec PR opens')), []);
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
  if (!/`blocked` move/.test(handoffs)) violations.push('shared Handoffs: an empty read does not move to blocked');
  if (!/Linked PR is the handoff/.test(handoffs)) violations.push('shared Handoffs: the linked PR is not the handoff');
  if (!/empty body not a finding/.test(handoffs)) violations.push('shared Handoffs: an empty body became a finding');
  if (!/linked pull requests[^.]*moves?\s+only when the PR is listed/.test(guide))
    violations.push('docs/factory.md: the handoff section does not describe the read-back');
  // The unlink subcommand is a different operation from the read-back; strip it before the scan.
  const readBackOnly = text => text.replace(/multica issue pull-requests\s+unlink/g, '');
  for (const [path, text] of Object.entries(catalog))
    if (path !== 'shared/instructions.md' && readBackOnly(text).includes('multica issue pull-requests'))
      violations.push(`${path}: second copy of the read-back`);
  if (readBackOnly(guide).includes('multica issue pull-requests')) violations.push('docs/factory.md: second copy of the read-back');
  return violations;
}

test('the linked PR is read back before the move, once in shared Handoffs', () => {
  const contract = { shared: read('shared/instructions.md'), guide: read('docs/factory.md'), catalog: catalogText() };
  assert.deepEqual(readBackViolations(contract), []);
  // A contract that assumes the link is the defect the read-back exists to catch.
  const noReadBack = {
    ...contract,
    shared: contract.shared.replace(/^- Linked PR is the handoff:.*$/m, '- Linked PR is the handoff.'),
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

// One open PR per delivering ticket is the link invariant: stated once in shared `## Delivery`,
// read by the code-review check before the verdict, and never restated in a role or skill.
const LINK_RULE = ['one open PR per delivering ticket'];

function linkViolations({ shared, review, catalog }) {
  const violations = [];
  const delivery = /^## Delivery\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';
  for (const phrase of LINK_RULE) if (!new RegExp(phrase, 'i').test(delivery)) violations.push(`shared Delivery: no ${phrase}`);
  const checks = /## Delivery checks\n\n([\s\S]*?)\n\n## /.exec(review)?.[1] ?? '';
  if (!/linked pull requests before the verdict/.test(checks)) violations.push('code-review: no linked-PR read before the verdict');
  if (!/second open link/.test(checks)) violations.push('code-review: a second open link is not a blocking finding');
  if (!/linked to a ticket it does not deliver/.test(checks)) violations.push('code-review: a wrong-ticket link is not a blocking finding');
  if (!/[Bb]locking finding/.test(checks)) violations.push('code-review: the link breach is not a blocking finding');
  for (const [path, text] of Object.entries(catalog))
    if (path !== 'shared/instructions.md' && path !== 'skills/code-review/SKILL.md')
      for (const phrase of LINK_RULE)
        if (new RegExp(phrase, 'i').test(text)) violations.push(`${path}: second copy of ${phrase}`);
  return violations;
}

test('the one-open-PR rule lives once in shared Delivery and code-review reads the links', () => {
  const contract = { shared: read('shared/instructions.md'), review: read('skills/code-review/SKILL.md'), catalog: catalogText() };
  assert.deepEqual(linkViolations(contract), []);
  // A Delivery without the open count is the rule's absence.
  const noRule = { ...contract, shared: contract.shared.replace(/one open PR per delivering ticket/i, 'one PR per ticket') };
  assert.notDeepEqual(linkViolations(noRule), []);
  // A review that never reads the links cannot fail a second one.
  const noRead = { ...contract, review: contract.review.replace('Read the ticket\'s linked pull requests before the verdict', 'Review the pull request') };
  assert.notDeepEqual(linkViolations(noRead), []);
  // A skill that restates the rule is the second copy.
  const skillCopy = {
    ...contract,
    catalog: { ...contract.catalog, 'skills/to-tickets/SKILL.md': `${contract.catalog['skills/to-tickets/SKILL.md']} Keep one open PR per delivering ticket.` },
  };
  assert.notDeepEqual(linkViolations(skillCopy), []);
});

// The guide is what the human and the seats read: it names the change window, the freeze and
// the live-data rule, and it sends the operator to the unlink command the CLI provides.
const LIVE_DATA = ['records the rule, the named exceptions and the expected snapshot', 'acceptance is the\nexecuted set'];

function guideViolationsForChange({ guide, glossary }) {
  const violations = [];
  for (const term of ['reslice window', 'revision PR', 'fresh PASS', 'freeze', 'new epic', 'superseded'])
    if (!guide.includes(term)) violations.push(`docs/factory.md: no ${term}`);
  for (const phrase of LIVE_DATA) if (!guide.includes(phrase)) violations.push(`docs/factory.md: no ${phrase}`);
  if (!/multica issue pull-requests\s+unlink/.test(guide)) violations.push('docs/factory.md: no unlink command');
  if (/There is no CLI unlink/.test(guide)) violations.push('docs/factory.md: keeps the stale no-unlink line');
  if (!/actor who closes the PR owns the unlink/.test(guide)) violations.push('docs/factory.md: no owner for the unlink');
  if (!/A close is not a workflow event/.test(guide)) violations.push('docs/factory.md: a close became a workflow event');
  for (const adr of ['0019', '0020', '0021'])
    if (!guide.includes(`adr/${adr}-`)) violations.push(`docs/factory.md: no ADR-${adr} link`);
  for (const term of ['reslice window', 'frozen slice', 'revision PR', 'superseded', 'expected snapshot', 'executed set', 'started child'])
    if (!glossary.includes(term)) violations.push(`GLOSSARY.md: no ${term}`);
  if (!/freezes at the first started child/.test(glossary)) violations.push('GLOSSARY.md: the handoff gate does not freeze at the first started child');
  if (/freezes when the spec PR opens/.test(glossary)) violations.push('GLOSSARY.md: the handoff gate keeps the old freeze sentence');
  return violations;
}

test('the guide and the glossary name the change window, the freeze and the live-data rule', () => {
  const contract = { guide: read('docs/factory.md'), glossary: read('GLOSSARY.md') };
  assert.deepEqual(guideViolationsForChange(contract), []);
  // A guide that keeps the manual unlink sends the operator to a page the CLI replaces.
  assert.notDeepEqual(guideViolationsForChange({
    ...contract,
    guide: contract.guide.replace(/multica issue pull-requests\s+unlink/g, 'the issue page'),
  }), []);
  // A guide without the freeze leaves a running slice open to amendment.
  assert.notDeepEqual(guideViolationsForChange({ ...contract, guide: contract.guide.replace(/freeze/g, 'gate') }), []);
  // The glossary's handoff gate was the second home of the old freeze sentence.
  assert.notDeepEqual(guideViolationsForChange({
    ...contract,
    glossary: `${contract.glossary}\nThe slice freezes when the spec PR opens.`,
  }), []);
});

test('the stale freeze sentence and the stale no-unlink line fail a scan of every live carrier', () => {
  const surfaces = [
    ...catalogFiles(),
    'docs/factory.md',
    'GLOSSARY.md',
    'README.md',
    'AGENTS.md',
  ];
  for (const path of surfaces) {
    const text = read(path);
    assert.doesNotMatch(text, /freezes when the spec PR opens/, `${path} keeps the old freeze sentence`);
    assert.doesNotMatch(text, /There is no CLI unlink/, `${path} keeps the stale no-unlink line`);
    assert.doesNotMatch(text, /no child after the spec PR opens/i, `${path} keeps the stale child-set cut`);
  }
});

test('the catalog declares no document and a declared document must have a file', t => {
  const catalog = readJSON(join(ROOT, 'templates/default.json'));
  assert.deepEqual(catalog.documents, {});
  const f = fixture(t);
  const path = join(f.root, 'templates/default.json');
  writeFileSync(path, JSON.stringify({ ...catalog, documents: { missing: 'templates/missing.md' } }));
  assert.throws(() => resolve(f.binding, f.root), /ENOENT|missing\.md/);
});

// The live text links every ticket. Shared `## Ownership` names the three places and the
// catalog's anonymity; the review's existing link check reads them and fails a bare key on
// Standards. The catalog's own Markdown keeps bare keys and never a workspace URL.
const LIVE_TEXT = ['PR bod', 'proposed breakdown', 'spec comment'];

function liveTextViolations({ shared, review, tickets, catalog }) {
  const violations = [];
  const ownership = /^## Ownership\n([\s\S]*?)\n## /m.exec(shared)?.[1] ?? '';
  for (const phrase of LIVE_TEXT) if (!ownership.includes(phrase)) violations.push(`shared Ownership: no ${phrase}`);
  if (!/workspace URL/i.test(ownership)) violations.push('shared Ownership: no workspace URL');
  if (!/anonymous/.test(ownership)) violations.push('shared Ownership: the catalog is not anonymous');
  if (!/bare keys/.test(ownership)) violations.push('shared Ownership: the catalog may carry a URL');
  const checks = /## Delivery checks\n\n([\s\S]*?)\n\n## /.exec(review)?.[1] ?? '';
  for (const phrase of LIVE_TEXT) if (!checks.includes(phrase)) violations.push(`code-review: does not read ${phrase}`);
  if (!/bare ticket key/.test(checks)) violations.push('code-review: a bare key does not fail');
  if (!/Standards/.test(checks)) violations.push('code-review: a bare key is not a Standards finding');
  if (!/workspace URL/.test(tickets) || !/bare key/.test(tickets)) violations.push('to-tickets: the template does not point at the live-text rule');
  for (const [path, text] of Object.entries(catalog))
    if (path !== 'shared/instructions.md' && text.includes('{{workspace_url}}')) violations.push(`${path}: a catalog file embeds a workspace URL`);
  return violations;
}

test('the live text links every ticket and the review reads the three places', () => {
  const contract = { shared: read('shared/instructions.md'), review: read('skills/code-review/SKILL.md'), tickets: read('skills/to-tickets/SKILL.md'), catalog: catalogText() };
  assert.deepEqual(liveTextViolations(contract), []);
  // A shared rule that omits the comments leaves the spec text unreviewed.
  assert.notDeepEqual(liveTextViolations({ ...contract, shared: contract.shared.replace('spec comments', 'comments') }), []);
  // A review that stops at the PR body lets a bare key through the other two places.
  assert.notDeepEqual(liveTextViolations({ ...contract, review: contract.review.replace(', the proposed breakdown and spec comments', '') }), []);
  // A template without the pointer leaves every published body without the read.
  assert.notDeepEqual(liveTextViolations({ ...contract, tickets: contract.tickets.replace('workspace URL, never a bare key', 'key') }), []);
  // A catalog file that embeds the live base breaks the anonymity rule.
  assert.notDeepEqual(liveTextViolations({
    ...contract,
    catalog: { ...contract.catalog, 'roles/release.md': `${contract.catalog['roles/release.md']} {{workspace_url}}` },
  }), []);
});

// One conflicts rule per ticket: `wakeup list` finds it and `wakeup update` replaces it. A second
// `wakeup create` re-arms a duplicate, which the platform adds rather than replaces.
function conflictViolations({ review, catalog }) {
  const violations = [];
  if (!/wakeup list <ticket>/.test(review)) violations.push('code-review: no wakeup list');
  if (!/wakeup update <ticket> <wakeup-id> --until-pr conflicts --mode continuous/.test(review)) violations.push('code-review: no wakeup update');
  if (!/update.*replaces one rule|update replaces one rule/s.test(review)) violations.push('code-review: update does not replace');
  if (!/create.*only when no rule exists/s.test(review)) violations.push('code-review: create is not the absent-rule case');
  if (/wakeup create <ticket> --until-pr conflicts --mode continuous/.test(review)) violations.push('code-review: re-arms with wakeup create');
  for (const [path, text] of Object.entries(catalog))
    if (path !== 'skills/code-review/SKILL.md' && /wakeup (create|update) <ticket>( <wakeup-id>)? --until-pr conflicts/.test(text))
      violations.push(`${path}: second conflicts arming`);
  return violations;
}

test('the conflicts rule is found and updated in place, never re-created', () => {
  const contract = { review: read('skills/code-review/SKILL.md'), catalog: catalogText() };
  assert.deepEqual(conflictViolations(contract), []);
  // The old create-replaces sentence is the duplicate the update replaces.
  assert.notDeepEqual(conflictViolations({
    ...contract,
    review: contract.review.replace('wakeup update <ticket> <wakeup-id> --until-pr conflicts --mode continuous', 'wakeup create <ticket> --until-pr conflicts --mode continuous'),
  }), []);
  // A second arming copy in another carrier is the duplicate rule.
  assert.notDeepEqual(conflictViolations({
    ...contract,
    catalog: { ...contract.catalog, 'roles/reviewer.md': `${contract.catalog['roles/reviewer.md']} wakeup update <ticket> <wakeup-id> --until-pr conflicts --mode continuous` },
  }), []);
});

// The glossary carries the changed terms, the new rewrite/lease entry and the corrected handoff
// gate: the epic opens in `backlog`, the seat is a readback, and the release is a merge on main.
function glossaryViolations(glossary) {
  const violations = [];
  for (const term of ['integration branch', 'release branch', 'slice release', 'planned owner', 'epic_progress', 'rewrite/lease'])
    if (!glossary.includes(`**${term}**`)) violations.push(`GLOSSARY.md: no ${term} term`);
  if (!/epic's key, forked from `main`/.test(glossary)) violations.push('GLOSSARY.md: the integration branch is not the epic key');
  if (!/release child's key, forked from the integration branch/.test(glossary)) violations.push('GLOSSARY.md: the release branch is not the release child key');
  if (!/created in\n?`backlog`/.test(glossary)) violations.push('GLOSSARY.md: the epic is not created in backlog');
  if (!/readback/.test(glossary)) violations.push('GLOSSARY.md: the seat is not a readback');
  if (/created in `todo`/.test(glossary)) violations.push('GLOSSARY.md: the epic is created in todo');
  if (!/never an\n?open-head query/.test(glossary)) violations.push('GLOSSARY.md: the slice release still serializes');
  return violations;
}

test('the glossary carries the changed terms and the corrected handoff gate', () => {
  const glossary = read('GLOSSARY.md');
  assert.deepEqual(glossaryViolations(glossary), []);
  // An old epic-`todo` entry is the stale handoff gate.
  assert.notDeepEqual(glossaryViolations(glossary.replace('created in `backlog`', 'created in `todo`')), []);
  // A missing rewrite/lease entry leaves the rewrite rule unnamed.
  assert.notDeepEqual(glossaryViolations(glossary.replace('**rewrite/lease**', '**rewrite**')), []);
});

// The release lane is the whole-slice gate: the release branch is the release child's key, the
// order gate is the up-to-date requirement plus `mergeStateStatus` against `main`, and a package
// release is outside the factory. The retired condition, the old prefix query and the park are
// the negatives.
const RELEASE_LANE = ["release branch is the release child's key", 'up-to-date requirement', 'mergeStateStatus', 'against `main`', 'package release', 'outside the factory'];

function releaseLaneViolations({ release, catalog }) {
  const violations = [];
  const text = release.replace(/\s+/g, ' ');
  for (const phrase of RELEASE_LANE) if (!text.includes(phrase)) violations.push(`roles/release.md: no ${phrase}`);
  if (/--until-issue|`ended`/.test(text)) violations.push('roles/release.md: keeps the retired condition');
  if (/spec\/\*|gh pr list --base main/.test(text)) violations.push('roles/release.md: keeps the serialization query');
  for (const [path, body] of Object.entries(catalog))
    if (path !== 'roles/release.md' && body.includes("release branch is the release child's key"))
      violations.push(`${path}: second release-branch rule`);
  return violations;
}

test('the release contract names the release branch, the up-to-date order gate and the package boundary', () => {
  const contract = { release: read('roles/release.md'), catalog: catalogText() };
  assert.deepEqual(releaseLaneViolations(contract), []);
  // A release contract without the release branch is the old prefix head.
  assert.notDeepEqual(releaseLaneViolations({ ...contract, release: contract.release.replace("release branch is the release child's key", 'release branch is the integration branch') }), []);
  // A contract that keeps the retired condition parks a release the platform already wakes.
  assert.notDeepEqual(releaseLaneViolations({ ...contract, release: `${contract.release} A remaining \`--until-issue\` reads \`ended\`.` }), []);
  // A prefix query is the serialization the lane removes.
  assert.notDeepEqual(releaseLaneViolations({ ...contract, release: `${contract.release} gh pr list --base main` }), []);
  // A second carrier of the release-branch rule is the duplicate the contract removes.
  assert.notDeepEqual(releaseLaneViolations({
    ...contract,
    catalog: { ...contract.catalog, 'roles/planner.md': `${contract.catalog['roles/planner.md']} The release branch is the release child's key.` },
  }), []);
});
