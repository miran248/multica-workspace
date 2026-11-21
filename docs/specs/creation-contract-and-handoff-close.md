# Creation contract and handoff close

`integration: spec/MIR-264` — forked from `main` at `8c71a62`. The spec itself is delivered
under this topology, so the record is what a rework and a later reader check against.

Accepted 2026-11-21. Approval is the merge of this spec's pull request into `spec/MIR-264`,
which completes MIR-265 and approves the published set; MIR-264 is the epic — it stays `todo`
until the spec merge, `epic_progress` until the release lands, and the Planner accepts it on
evidence. The creation direction is the grilling's answer; the handoff identity and the read-back
answer the spec review. ADR-0017 records the creation decision, ADR-0018 records the PR identity
and the link read-back, and the closing question refines the gate of ADR-0013 and ADR-0016
without changing their durable decisions.

## Problem Statement

**Creation does not name a handler.** Entering a status reassigns an issue to that column's
handler; that is how the Factory dispatches. Creating an issue does not. An agent-created issue
is born with whatever the create call passed, and the call is free to pass nothing: no
`--project`, so the workspace Default workflow accepts the status and hands off to nobody; no
`--assignee`, so even the right column has no planned owner until the first move. At the
grilling, the live workspace showed the shape of the hole: 19 of 256 issues were unassigned, and
every one of them was cancelled, old or a probe; all seven open issues were assigned. The defect
is at creation and outside a project, not in the move that follows.

**The planned owner drifts.** An issue created with the right status but the wrong assignee
looks handled. The MIR-227 release child was created for the release seat and assigned another
seat; nothing at creation or review compared the two. The release lane then had a ticket whose
planned owner was wrong from the first second, and only a later run would notice — if it
noticed. The creation call is the one moment the role is chosen, so it is the one moment the
choice can be checked.

**The handoff packet has no start.** The grilling packet ends on the two mode labels. It never
asks whether to start stage 1, so the start is implicit in "the user answered", and a packet
whose answer is "neither label" reads as if nothing were decided. The skill's own sentence — "a
non-empty frontier is a wayfinder map, not a factory shape, so no epic is opened for it" — says
the opposite of "every grilling produces an epic": the same session can produce no container at
all, and the wayfinder method is dragged into a choice the user never made.

**The kickoff is where creation and the packet meet.** The Planner creates the epic and the
stage-1 spec child, applies the labels, and moves the child. That is the one run in the Factory
that creates a set before any status entry reassigns it, so it is exactly where the planned
owner must be named — and exactly where the packet must say the answer starts the slice.

**The handoff can name the wrong ticket.** The platform links a pull request to the issue whose
key is in its title or branch, or after a closing keyword in its body; a bare body mention links
nothing. A spec PR titled and branched with the epic's key therefore links to the epic, not to
its spec child: the merge completes the epic and leaves the child in `spec_progress` with no
pull request. Nothing read the link back, so only the next human pass found it. PR #2 in the
`multica-sandbox` repository is the instance — its title and branch carried `MIR-178`, the epic,
and `MIR-179`, the spec child it should have delivered, stayed unlinked. The step already said
"linked to this ticket only"; what was missing was the mechanical read.

## Solution

One creation rule, one closing question, and one handoff the platform can prove.

- **Creation names a planned owner.** Every issue an agent creates carries `--project` and
  `--assignee`: the project that binds the Factory graph, and the role promotion will pick.
  Status entry still reassigns natively, so creation only has to be correct until the first
  move. The human lane is the one exception: the catalog is anonymous and cannot name a member,
  so a human-lane child is created unassigned and the promotion's `human_progress` member
  handler binds the member.
- **Two readers, no third copy.** The rule lands once in shared `## Ownership`. The publisher
  (`to-tickets`) pre-flights the whole set before it publishes: every child carries the project
  and its planned owner, and only the human-lane child is unassigned. The `spec_review` PASS
  reads the epic's children before the verdict and fails an ownerless child. Both readers act on
  the shared rule; neither restates it, and no sweep adds a third.
- **One closing question.** The grilling packet ends by asking whether to apply the chosen mode
  labels and start stage 1 — one answer, one yes. When a human mode is chosen, the packet names
  the human seat the project's workflow binds to the `human` role (read the handler; one member
  in this workspace), and the kickoff records that name on the epic as issue state, never in a
  catalog file. The wayfinder sentence becomes one meaning: wayfinder is invoked explicitly and
  never tied to grilling; grilling may answer a decision inside a wayfinder ticket, and that
  answer starts nothing.
- **The kickoff creates with owner.** The Planner creates the epic and the stage-1 spec child
  with the project and the planned owner, applies the epic labels, records the human seat when a
  human mode was chosen, then moves the spec child to `spec_progress`. The owned create is the
  state the first status entry would have produced anyway; the move is still the dispatch.
- **The PR names its delivering ticket.** A pull request's title and head branch carry the
  delivering ticket's key only — the spec child's for the spec PR, the ticket's own for a
  delivery PR, the release child's for the release PR — never the epic's. The spec child's title
  names the change and does not repeat the epic key. The rule lands once in shared `## Delivery`.
- **The link is read back.** After a run opens a pull request it reads
  `multica issue pull-requests <ticket>` and moves only when the PR is listed. An empty list
  names the operator fix — the key, a URL relink, or the integration — and moves the ticket to
  `blocked`, never a started lane. The rule lands once in shared `## Handoffs`, so every
  PR-opening step is governed by it.
- **One release.** `spec/MIR-264` → `main` as one squash, carried by the final-stage release
  child.

## User Stories

1. As the approval owner, I want every agent-created issue to carry the project it belongs to, so that it enters the Factory graph instead of a workflow that hands off to nobody.
2. As the approval owner, I want every agent-created issue to carry the role that will handle it, so that an issue is never ownerless while it waits for its first move.
3. As the approval owner, I want the planned owner to be the one promotion will pick, so that a release child is created for the release seat and not for a neighbour.
4. As the approval owner, I want the human lane to be the only ownerless create, so that the anonymity rule does not become an excuse for an unowned set.
5. As the approval owner, I want the creation rule to live once, so that a second copy cannot drift from the first.
6. As the approval owner, I want the publisher to check the whole set before it publishes, so that a broken create is refused before the spec PR exists, not discovered after the merge.
7. As the approval owner, I want the spec review to fail an ownerless child, so that the last gate before approval reads the same fact as the publisher.
8. As the approval owner, I want no orphan sweep, so that a defect at creation is fixed at creation instead of hidden by a scan.
9. As the Planner, I want the kickoff to create the epic and the spec child with project and owner, so that the run that creates the set is not the run that leaves it ownerless.
10. As the Planner, I want to apply the epic labels before the spec child moves, so that the mode is set before the spec PR exists.
11. As the Planner, I want the grilling packet to ask one close-and-start question, so that the answer is a single yes and the start is never implied.
12. As the Planner, I want a chosen human mode to name the human seat, so that I know who the workflow's member handler will bind before I create the child.
13. As the Planner, I want the human seat recorded on the epic as issue state, so that the name survives without entering the anonymous catalog.
14. As the Planner, I want wayfinder to be invoked explicitly, so that a grilling with unresolved branches does not open a container the user never asked for.
15. As the Planner, I want grilling to be able to answer a decision inside a wayfinder ticket, so that the two methods compose without starting a factory.
16. As the Implementer, I want the release child's planned owner to be the release seat, so that I never pick up a release as if it were delivery.
17. As the Implementer, I want the creation rule in the shared contract I already render, so that I do not have to load another skill to find it.
18. As the Reviewer, I want the spec PASS to check the published set's owners, so that an ownerless child is a finding at the exact head rather than a surprise at promotion.
19. As the Reviewer, I want the check to name the set's states as well, so that every published child is `backlog` and later stages are higher before I approve it.
20. As a maintainer, I want the caps to stay full, so that the new rule replaces words instead of growing the contract.
21. As a maintainer, I want the offline matrix to pin both readers, so that deleting the pre-flight or the PASS check fails the suite.
22. As a maintainer, I want the guide to describe the creation rule and the closing question, so that the human reads what the seats do.
23. As a maintainer, I want one ADR for the creation decision, so that the human-lane exception and the missing sweep are arguments, not folklore.
24. As a future agent, I want the spec to name its seams and its limits, so that I know what the offline suite can and cannot prove.
25. As the approval owner, I want the PR title and head branch to carry the delivering ticket's key only, so that a merge completes the ticket that holds the work, never the epic.
26. As the Planner, I want the ticket's linked pull requests read back before the move, so that a started lane never holds a ticket the platform does not link.
27. As the Planner, I want an empty read-back to name the operator fix and park the ticket in `blocked`, so that the miss is visible at once rather than at the next human pass.
28. As a maintainer, I want the key rule in the shared delivery contract and the read-back in the shared handoff contract, so that every PR-opening step carries one copy of each.
29. As a maintainer, I want one ADR for the handoff identity, so that the mechanical check is a recorded choice rather than a step instruction.

## Implementation Decisions

**D1 — Creation names a planned owner.** Every issue an agent creates carries `--project` and
`--assignee`: the project that binds the Factory graph, and the role promotion will pick. A
regular ticket's planned owner is the Implementer, a spec child's the Planner, a release child's
the Release seat, and a delivery child's the Implementer unless the epic carries
`has-human-implementer`. Status entry still reassigns natively, so the created owner only has to
be right until the first move; the create call names it and the promotion does not repair it.

**D2 — The human lane is the exception.** The catalog is anonymous and workspace-independent:
it cannot name a member, and a member is not a role. A human-lane child is created unassigned,
and the native `human_progress` member handler binds the member at promotion. The publisher and
the spec review allow exactly that one unassigned child; any other unassigned child is a defect.

**D3 — Two readers, no third copy.** The rule lives once in shared `## Ownership`. The publisher
pre-flights the whole set before it publishes: every child carries the project and its planned
owner, and only the human-lane child is unassigned; a missing one fails the publish. The
`spec_review` PASS reads the published set — every child the spec run published — before the
verdict: every published child is in `backlog`, owned, and later stages higher; an ownerless
child is a blocking finding. Neither reader restates the rule; both act on the shared copy, and
no column instruction, role or skill carries a second copy.

**D4 — One closing question.** The grilling packet ends on one question: apply the chosen mode
labels and start stage 1. The labels and the start are one answer, and the packet offers no
shape field and no second yes. The mode labels stay the last field. When a human mode is chosen
the packet names the human seat the project's workflow binds to the `human` role; the route is
read from the handler, one member in this workspace.

**D5 — Wayfinder is explicit.** The sentence is rewritten to one meaning: wayfinder is invoked
explicitly and never tied to grilling; grilling may answer a decision inside a wayfinder ticket,
and that answer starts nothing. "Every grilling produces an epic" stays the only shape, and a
non-empty frontier no longer selects a container.

**D6 — The human seat is issue state.** The seat a human mode names is recorded by the kickoff
on the epic as issue state — the kickoff comment — not in a catalog file. The catalog has no
member field and must not gain one: a member id would break both the anonymity test and the
workspace-independent catalog. The live workflow's `human` handler is the binding; the epic's
record is its human-readable trail.

**D7 — Caps are replaced, not added.** Shared is full at 340 words and the Planner is full at
130, so each ticket replaces words rather than appending. The suite's brevity test is the
check: a change that adds a sentence without removing one fails before review.

**D8 — No orphan sweep.** The live counts show no accumulated orphans — every unassigned issue
is cancelled, old or a probe — so the defect is creation, not rest. A sweep would be a third
reader for a symptom the create call prevents, and it would repair an ownerless issue only after
the set was approved. Rejected: the sweep.

**D9 — The kickoff creates with owner.** The Planner creates the epic and the stage-1 spec
child with the project and the planned owner, applies the epic labels, records the human seat
when a human mode was chosen, then moves the spec child to `spec_progress`. The move stays the
dispatch; the owned create is the state the first status entry would have produced anyway. The
Planner's contract carries the route, not the shared rule.

**D10 — The ADRs and the amended records.** ADR-0017 records the creation decision: the planned
owner at create, the human-lane exception, the two readers and the rejected sweep. ADR-0018
records the handoff identity: the delivering ticket's key and the link read-back. The closing
question needs no new ADR: it refines the gate of ADR-0013 and ADR-0016 — the answer already
starts the factory — and corrects a sentence that fought their decision; ADR-0013 and ADR-0016
are not edited. The glossary gains `planned owner` and `delivering ticket`, and restates the
handoff with its link and read-back, the handoff gate and the wayfinder meaning; the guide's
kickoff, Planner and handoff sections are amended in the delivery tickets.

**D11 — One release.** `spec/MIR-264` → `main` as one squash, carried by the final-stage release
child. The spec, the ADRs and the glossary land with this PR; the release re-verifies them at the
integrated head.

**D12 — The PR names its delivering ticket.** A pull request's title and head branch carry the
delivering ticket's key only — the spec child's for the spec PR, the ticket's own for a delivery
PR, the release child's for the release PR — never the epic's. The platform links by a routable
key in the title or branch, or one after a closing keyword in the body; a bare body mention
links nothing, and a wrong key links the wrong ticket. The spec child's title names the change
and does not repeat the epic key. The rule lives once in shared `## Delivery`; no role, skill or
column instruction restates it.

**D13 — The link is read back.** After a run opens a pull request it reads
`multica issue pull-requests <ticket>` and moves only when the PR is listed. An empty list is not
a transient: the run comments the operator fix — the title/branch key, a URL relink
(`multica issue pull-requests link`), or the repository integration — and moves the ticket to
`blocked`; a started lane is never left holding an unlinked PR. The rule lives once in shared
`## Handoffs`, so every PR-opening step inherits it, and no role, skill or column instruction
restates it. The read is the platform's link table, not a branch-name guess or a GitHub search.

## Testing Decisions

The seam is the existing offline matrix, not a new module: `tests/contracts.test.js` pins the
authored shapes, `tests/factory-workflow.test.js` pins the routes, the spec-run matrix and the
guide, `tests/brevity.test.js` pins the caps and `tests/docs.test.js` reads the spec and ADR
headers. The tests assert external behaviour — the contract a run renders and the guide a human
reads — never the bytes of a ticket body or an internal helper.

- **The creation rule is pinned where it is read.** `tests/contracts.test.js` asserts the shared
  `## Ownership` states the create's project and planned owner, the human-lane exception and
  that status entry still reassigns; it asserts the publisher carries the pre-flight and the
  reviewer's method carries the spec PASS set read. `tests/factory-workflow.test.js` pins the
  kickoff route in the Planner contract and the guide's description.
- **The closing question is pinned by shape and meaning.** `tests/contracts.test.js` asserts the
  packet keeps its three fields and ends on one close-and-start question, and that the wayfinder
  sentence carries only the explicit-invocation meaning. `tests/factory-workflow.test.js`
  asserts the Planner applies the labels before the move, creates both issues with project and
  owner, and records the human seat; the guide names the same.
- **The key rule is pinned where it is read.** `tests/contracts.test.js` asserts the shared
  `## Delivery` states the delivering ticket's key in the title and head branch, never the
  epic's, and that the spec child's title repeats neither; the existing "no role repeats a
  delivery rule" scan grows the key rule. `tests/factory-workflow.test.js` pins the guide's
  commits prose.
- **The read-back is pinned where it is read.** `tests/contracts.test.js` asserts the shared
  `## Handoffs` states the `multica issue pull-requests` read before the move, the operator fix
  and the `blocked` move; the existing "linked PR is the delivery handoff" and "empty body is not
  a finding" pins stay green. `tests/factory-workflow.test.js` pins the guide's handoff prose.
- **Absence is pinned.** The create rule appears once, in shared; the key rule and the read-back
  likewise, and the publisher and the PASS name their checks without restating them; no column
  instruction, role or skill carries a second copy; the old "wayfinder map, not a factory shape"
  sentence fails the scan.
- **Negative fixtures.** A shared contract without the create rule, a shared Delivery without the
  key rule, a shared Handoffs without the read-back, a publisher without the pre-flight, a spec
  PASS without the set read, a labels-only packet, a kickoff without an owner, and a
  reintroduced wayfinder-map sentence each fail the suite.
- **The caps prove replacement.** `tests/brevity.test.js` stays unchanged and green at 340 and
  130; a sentence added without a removal fails it.
- **Prior art.** `tests/contracts.test.js` (authored shapes), `tests/factory-workflow.test.js`
  (routes, the spec-run matrix and the guide), `tests/config.test.js` (the shared contract
  reaches every role), `tests/brevity.test.js` (caps), `tests/docs.test.js` (specs and ADRs),
  `tests/skills.test.js` (bindings).
- **What the suite cannot prove.** The platform's create defaults and the member handler's
  binding are live facts, not catalog facts. The first observation is this epic's own kickoff:
  MIR-264 and MIR-265 were created with a project and the Planner as planned owner. The next
  human-mode epic carries the recorded seat. The suite also cannot prove the create call passed
  the *right* role — only the publisher's read and the spec PASS can catch a wrong one. The link
  trigger and the link table are live facts as well: the read-back names them, and this PR's own
  listing is the first observation.

## Out of Scope

- **An orphan sweep.** No scan, autopilot or repair ticket for the 19 unassigned issues; they
  are cancelled, old or probes, and the leak is at creation.
- **Per-status agents and a mode-dependent graph.** Roles stay the rule carriers; the promotion
  mapping is unchanged.
- **The triage category in the packet.** The packet asks only the two mode labels; the category
  is triage's business.
- **The LBB case.** Out of scope by the settled grilling answer.
- **Platform changes.** `issue create` defaults, the status-entry reassignment and the member
  handler's binding are the platform's; this slice uses them as they are.
- **The Factory graph.** No column, handler, stage or label is added, renamed or removed.
- **The wayfinder method.** Only the sentence tying it to grilling is rewritten; its map and
  ticket mechanics stay.
- **Production promotion.** The release procedure and the deploy-time `production:` approval in
  `roles/release.md` are unchanged.
- **The integration repair.** When the read-back is empty the run names the operator fix and
  blocks; diagnosing the GitHub installation, its binding or its event delivery is the
  operator's.
- **Editing the accepted records.** ADR-0013, ADR-0016 and the accepted specs are not edited;
  this spec is the later record.

## Proposed breakdown

The spec run publishes every child but stage 1 in `backlog`, under the epic, in stage order; the
final-stage release child is created last and is the only path to `main`. Stage 1 is this ticket,
whose spec PR carries this breakdown. Stages 2 and 3 are serial because the handoff close
consumes the publisher and both edit the shared contract, the guide and the test files.

| Stage | Ticket | Assignee | Delivers |
| --- | --- | --- | --- |
| 1 | MIR-265 — Spec: creation contract and handoff close | Planner | This document, ADR-0017 and ADR-0018, the glossary terms, the published set and the spec PR into `spec/MIR-264`; its merge approves both. |
| 2 | MIR-266 — Name the owner at creation and the ticket on the PR | Implementer | The shared `## Ownership` rule, the shared `## Delivery` key rule, the publisher's pre-flight, the spec PASS's set read, the guide's creation and commits prose, and the offline pins; caps replaced. |
| 3 | MIR-267 — One closing question and the verified handoff | Implementer | The grilling packet's one question and the human seat, the wayfinder meaning, the Planner's owned kickoff, the shared `## Handoffs` read-back, the guide's handoff prose, and the offline pins; caps replaced. |
| 4 | MIR-268 — Release `spec/MIR-264` to `main` | Release | The release PR as one squash, the applied catalog readback, the key rule and the read-back at the integrated head, and the evidence the Planner accepts the epic on. |

## Further Notes

**Why the publisher and the PASS are the two readers.** The publisher is the only seat that
creates the whole set in one run, and the spec PASS is the only review that sees the set before
approval. Creation is where the defect lives; the two moments where the set is complete are the
only places to read it. A sweep would read it a third time, after the fact, and would need its
own route back to an owner — a repair the create call can make unnecessary.

**Why the human lane is created unassigned.** The catalog is anonymous and workspace-independent
by construction: no live member id, email or name may enter it. The human lane therefore cannot
name its own owner, and creating the child with a role assignee would be a lie the promotion
would have to repair. The native `human_progress` member handler already binds the member on
entry, so the unassigned create is not a hole — it is the one case where the platform's own
binding is the owner.

**Why one question, and not two.** Two questions — "apply these labels?" and "start stage 1?"
— can be answered differently, and the answer to the first already implies the second in the
current contract: the labels exist to shape the slice the start begins. One yes makes the start
explicit, keeps the mode labels last, and removes the reading in which "neither label" means
"no decision".

**Why the wayfinder sentence was wrong.** It made a non-empty grilling frontier select a
container the user never asked for, and it put the wayfinder method on the path of every
unsettled grilling. Wayfinder is a method a human invokes when a decision map is the right
shape; grilling may resolve one decision inside such a map, and that answer is the map's, not a
factory start. The corrected sentence keeps both skills usable and neither implied.

**Why the closing question has no ADR.** ADR-0013 and ADR-0016 already decide that the grilling
answer starts the factory and that every grilling produces an epic. The closing question makes
the start explicit and deletes a sentence that contradicted the decision; it adds no durable
architecture. A second ADR would record a wording correction as if it were a new choice, and
the ADR layer is for choices. The handoff identity is different: it adds a mechanical check the
step did not have, and ADR-0018 records that choice.

**Why one carrier each.** The key rule is a delivery-shape rule, so it sits in shared
`## Delivery` beside the base and the squash. The read-back is a handoff rule, so it sits in
shared `## Handoffs` beside the linked PR. Every role renders shared, so every PR-opening step
reads both without a role or a column instruction carrying a second copy — the same one-home
test as the base rule.

**The first live instance.** This slice is the first run under the rules it writes: the kickoff
created MIR-264 and MIR-265 with the project and the Planner as planned owner; the spec run
published the slice in `backlog` and moved only the stage-1 child; and this PR carries MIR-265 in
its title and head branch and was read back on MIR-265 before the review move. The next
human-mode epic is the first observation of the seat record. Both are recorded on the epic, not
in this repository.

**Reversibility.** Nothing here is a platform feature. The creation arguments are additive; the
packet's closing question is a sentence; the wayfinder correction restores a distinction the
catalog already declares; the key rule and the read-back are one line each in shared. A spec that
wants the old shape would need a new spec and a new ADR, which is the point of the record.
