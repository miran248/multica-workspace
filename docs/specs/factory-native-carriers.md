# Factory native carriers: one copy per rule

`integration: spec/MIR-227` — forked from `main` at `f865023`. The spec itself is delivered
under this topology, so the record is what a rework and a later reader check against.

Accepted 2026-11-17. Approval is the merge of this spec's pull request into `spec/MIR-227`,
which completes MIR-228 and approves the published set; MIR-227 is the epic and stays `todo`
until the release lands and the Planner accepts it on evidence. The decisions below are the
answers given in the grilling session that opened the epic; ADR-0010, ADR-0011 and ADR-0012
are their durable records.

## Problem Statement

The Factory contract is prose, and every rule is written more than once. A column's step
instruction restates the role contract, the role restates the shared rule, the guide restates
the graph, and the ticket template restates the handoff. Nothing in the platform reads a
comment's headings, a `Touch:` list, a pull-request base or a commit subject: only a
fresh-context agent that happened to read the right copy does.

The costs are concrete.

- **Drift is silent.** A rule that changes in one copy keeps living in the others, and a run
  obeys whichever copy it read. The run reports success; the rule is broken.
- **Several rules have no reader at all.** `Touch:`, the commit subject, one-ticket-one-PR,
  the PR base and squash-merge are checked by nobody but the Reviewer, and no product-repo CI
  will check them either (that decision is out of scope by choice). Their only possible home
  is the seat that acts on the rule.
- **The label read lands on the irreversible action.** The Reviewer is instructed to branch on
  `manual-merge` while it holds the merge button. That is the one place a wrong read costs a
  wrong merge and cannot be undone.
- **The one guard called essential has no carrier.** `task.failed` plus the 90m review check
  depends on the Planner remembering to arm a per-issue timer in every review column. The
  ticket the Planner forgets is exactly the ticket nobody watches.
- **The guide is double bookkeeping.** `docs/factory.md` keeps a hand-written column table and
  Mermaid graph that no test parses, so a graph change can leave the guide describing the old
  graph while the workflow moves.

The repository is also inconsistent about templates: `templates/handoff.md` is declared as a
document that the sync never deploys, `shared/instructions.md` carries a different five-line
shape, and each role carries its own. A run reads the shape of whichever copy it finds.

## Solution

Every rule gets exactly one home. If the platform can store or act on the fact, the home is a
**native carrier** — a status, a handler, a stage, an issue link, a wakeup, an autopilot or a
label. Otherwise the home is exactly **one prose copy, in the seat that reads it**. "One
carrier or one reader" is the single acceptance measure for the whole change, and the inventory
in Testing Decisions is how it is measured.

- **The graph carries the mode.** Fifteen columns. `manual-merge` and `human-assigned` select a
  lane when the Planner promotes a ticket, and two gate lanes end in the human's merge. A
  Reviewer never reads a label; each review column declares its own exit.
- **One contract.** The delivery rules and the handoff shape live once in shared instructions;
  each role keeps only its own behaviour, and `code-review` carries the checking method.
- **Two templates.** A ticket is a `Branch:` line plus `## What` / `## Acceptance` / `## Touch`;
  a comment is `## What` / `## Evidence` / `## Next`. Everything the platform already stores
  (the parent) or encodes (the stage edge) leaves the body.
- **One sweep.** One hourly catalog autopilot sweeps stale review columns, comments the
  evidence and moves the ticket to `blocked`. `task.failed` stays per-issue; the per-issue 90m
  timer is deleted.
- **One renderer.** The guide's column table and graph are generated from the workflow file,
  and the suite fails when the document and the workflow differ.
- **One entry rule.** Durable work starts from a ticket or an epic; chat may produce throwaway
  artifacts but never a durable repository write, and the factory starts only when the Planner
  moves the spec child to `spec_progress` from a grilling session.
- **One proof.** A drill on a throwaway project, bound to a copy of the new graph, exercises
  every mode before the catalog change reaches a live project.

## User Stories

1. As the approval owner, I want every rule to have exactly one home, so a change to it is one edit and not a search for stale copies.
2. As the approval owner, I want to read one document and see the whole workflow, so I do not have to reconcile the guide against the workflow file.
3. As the approval owner, I want the mode I put on the epic to decide who merges before work starts, so a merge cannot depend on a reviewer's reading of a label.
4. As the approval owner, I want no human approval after the spec merge unless an epic label asked for one, so the autonomous epic stays autonomous.
5. As the approval owner, I want a second approval for a production release to be a label, so it is visible on the epic instead of buried in a ticket body.
6. As the Planner, I want the mode-to-lane mapping written once in my own contract, so promotion is one table lookup and not a negotiation with the Reviewer.
7. As the Planner, I want the stage to be the dependency edge inside an epic, so I stop writing `Blocked by` lists that no platform check reads.
8. As the Planner, I want a `Touch:` list on every ticket, so the diff has a committed scope before implementation begins.
9. As the Planner, I want the slice published before the spec PR leaves `spec_progress`, so the barrier wakes me once and never for a set that changed after approval.
10. As the Planner, I want durable work to always land on a ticket, so a chat session cannot leave an unreviewed repository change behind.
11. As the Planner, I want the factory to start only from a grilling session, so the spec child's move is an explicit trigger and not whatever chat happened to precede it.
12. As the Planner, I want a single hourly sweep to catch the reviews I forgot to watch, so no ticket waits silently on a merge that never comes.
13. As the Implementer, I want the delivery rules in the contract I already receive, so I do not have to load a skill I cannot load or read a second copy.
14. As the Implementer, I want the ticket to name my base branch and my allowed `Touch:` paths, so I do not discover the scope from a review finding.
15. As the Reviewer, I want each review column to declare its exit, so I never decide a merge by reading a mode label.
16. As the Reviewer, I want the delivery checks in `code-review`, so the rule I enforce and the method I load are the same copy.
17. As the Reviewer, I want a gate column to name `awaiting_merge` and a normal column to merge, so the ticket's column is the whole instruction.
18. As the Reviewer, I want a ticket that is not an open PR to go back with a record, so I never review or complete a stale link.
19. As the human in a `manual-merge` epic, I want every pull request based on `main` to reach me at `awaiting_merge`, so I keep the boundary merges without holding every branch merge.
20. As the human implementer, I want the gate lane to exist without a second status read, so my own delivery also ends at my merge when the epic asks for it.
21. As the human implementer, I want my review to be independent of my implementation, so `human_review` and its gate twin are reviewed by the Reviewer, never by me.
22. As a maintainer, I want the 15-column graph pinned by the offline matrix, so a column cannot be added without its route and its handler.
23. As a maintainer, I want the guide rendered from the workflow, so a graph change cannot leave the guide behind.
24. As a maintainer, I want the ticket and comment templates to be one shape each, so a handoff is read the same way by every seat.
25. As a maintainer, I want the undeployed handoff document deleted, so there is no declared artifact that nothing deploys.
26. As a maintainer, I want the stale sweep to be one declared autopilot, so a ticket the Planner forgot is still found.
27. As a maintainer, I want `task.failed` to stay per-issue, so a failed run wakes the Planner on the issue it failed on.
28. As a maintainer, I want the drill to prove the graph on a throwaway project, so a wrong assumption costs a drill ticket and not a live sync.
29. As a maintainer, I want a measured inventory of rule to carrier, so "the drift is gone" is a result and not an opinion.
30. As a future agent, I want the catalog to be legible in one pass, so I can hold the whole contract in a fresh context window.

## Implementation Decisions

**D1 — One carrier or one reader.** A catalog rule is enforced either by a native construct
(status, handler, stage, link, wakeup, autopilot, label) or by exactly one prose copy in the
seat that reads it. A second copy is a defect, and the acceptance measure below names every
rule and its one home. Prose that a seat needs in order to start is a third category: a
dispatch instruction may name a route, but it may not restate the rule that route enforces.

**D2 — No product-repo CI.** The git-resident rules — commit subject, pull-request base,
`Touch:` ⊆ diff, one ticket one PR, squash-merge — are checked by the Reviewer from
`code-review`. `just validate` and `just test` validate the catalog, never agent behaviour. A
repository's own CI stays whatever it was: this change adds no workflow and no check to any
product repository.

**D3 — The mode selects the lane at promotion.** The graph grows three columns and the Planner
maps an epic's labels, plus the ticket's base, to a lane when it promotes the ticket. A
Reviewer never reads a label. The mapping is one table in the Planner's contract:

| Epic labels | Ticket base | Implementation | Review | A PASS lands |
| --- | --- | --- | --- | --- |
| neither | any | `in_progress` | `in_review` | merged by the Reviewer |
| `manual-merge` | `spec/<epic>` | `in_progress` | `in_review` | merged by the Reviewer |
| `manual-merge` | `main` | `in_progress_gate` | `in_review_gate` | `awaiting_merge` |
| `human-assigned` | any | `human_progress` | `human_review` | merged by the Reviewer |
| `human-assigned` + `manual-merge` | `spec/<epic>` | `human_progress` | `human_review` | merged by the Reviewer |
| `human-assigned` + `manual-merge` | `main` | `human_progress` | `human_review_gate` | `awaiting_merge` |
| `production` | `main` | `in_progress_gate` | `in_review_gate` | `awaiting_merge` |

`manual-merge` keeps the scope it has today: it gates the spec approval and every pull request
whose base is `main`. A ticket PR into `spec/<epic>` is Reviewer-merged in every mode, because
the human already approved the set and the branch is scratch. `production` overrides the mode
for the release child only, so the second approval is a label on the epic rather than a body
phrase in one ticket. The two gate review columns are the only columns whose PASS moves to
`awaiting_merge`; the two normal review columns merge on PASS and declare no advance.

**D4 — The spec approval is always the human merge.** `spec_review` keeps one exit: PASS leaves
the pull request open and moves the spec child to `awaiting_merge`; the human merge approves the
spec, the proposed breakdown and the published set, in every mode including autonomous. No
column may merge a spec PR, and no instruction may enable auto-merge.

**D5 — Naming.** The gate columns are `in_progress_gate`, `in_review_gate` and
`human_review_gate`. `_gate` names the exit, not the actor: it reads as "this lane ends at the
human gate" and it does not collide with the `manual-merge` label. `_manual` was rejected
because it names the actor and duplicates the label's spelling.

**D6 — Two templates and no repeated state.** A ticket body is a `Branch:` line followed by
`## What`, `## Acceptance` and `## Touch`; the line is present only for an integration spec and
its absence means `main`. A comment is `## What`, `## Evidence` and `## Next`; the five-line
handoff becomes the content under those headings, and a finding stays one `Evidence` bullet in
the form `P2 — file:line: trigger; consequence; fix`. The parent is native (`--parent`,
`issue children`) and leaves the body. `Blocked by` leaves the body too: an intra-epic
dependency is the stage, a cross-epic one is an `--until-issue` condition, and a ticket that
cannot start is `blocked` with the reason on the record rather than a list nobody parses. The
caps move with the shape: a comment is at most 10 rendered lines and 1 KB, a findings list 1 KB,
a decision packet 800 bytes, shared instructions 340 words, and each role 130 words.

**D7 — One contract, one checker.** `shared/instructions.md` carries a `## Delivery` section
(one PR per ticket, base, `Touch:`, commit and PR title shape, squash, no self-merge, no
auto-merge) and a `## Handoffs` section (the three-heading comment, the comment-before-move
order, the caps). Each role keeps only its seat's behaviour, and `code-review` gains the
delivery checklist, so the rule the Reviewer enforces and the method the Reviewer loads are the
same copy. The per-ticket scope stays in the ticket's `## Touch`; the per-ticket base stays in
its `Branch:` line. The Implementer reads the shared contract because every role already
renders it.

**D8 — Planner always tickets; chat writes nothing durable.** Any request that will change
repository or platform state becomes an epic (more than one ticket) or a regular ticket (one
ticket) before the change starts; a pure question or a read-only scan stays in chat. A scan or
a prototype may write a throwaway artifact — a report, a scratch directory — but a durable
repository file (a glossary term, an ADR, code) rides in the ticket that acts on the scan. The
Planner never implements in chat.

**D9 — Grilling is the factory entry.** An epic may be created from any session, but the
factory starts when the Planner moves the spec child to `spec_progress`, and that only happens
from a grilling session. A small task is a regular ticket with no grilling and no spec child.
This keeps `improve-codebase-architecture` and `prototype` useful in chat without reopening D8.

**D10 — The slice floor.** A ticket delivers one observable behaviour, one pull request and one
green head. A stage may hold several tickets only when they are independently mergeable and
their `Touch:` sets are disjoint; any ordering need is a later stage. The floor stays
behavioural: a chunk smaller than one verifiable behaviour cannot be reviewed or merged.

**D11 — No human gate after the spec merge unless a label selects one.** An autonomous epic
runs to the release without another human decision. `manual-merge`, `human-assigned` and
`production` are the labels that add a gate, and each adds it by selecting a lane at promotion,
never by a conditional inside a step instruction. Silence is not approval; a bare `approve`
clears the gate it names.

**D12 — One sweep, one event.** The catalog declares a `stale-sweep` autopilot: hourly, planner
role, `run_only`, reading `spec_review`, `in_review`, `in_review_gate`, `human_review`,
`human_review_gate` and `awaiting_merge`, dating each ticket from `issue timeline`, and for a
ticket older than the threshold posting a `## What` / `## Evidence` / `## Next` comment with the
age and the last actor, then moving it to `blocked` for its normal triage. The threshold is two
hours in a review column and 24 hours at `awaiting_merge`, because the first is an agent's own
step and the second is a human's. The sweep never mentions anyone, never closes a ticket and
never runs on `blocked`. `task.failed` stays a per-issue event the Planner registers, because
the platform knows that fact exactly; the per-issue 90m timer is deleted, and the cancelled-epic
sweep stays as `--until-status cancelled` on the epic. No wake is registered on
`comment.created`.

**D13 — The guide renders from the workflow.** A renderer writes the column table and the
Mermaid graph in `docs/factory.md` between markers from the workflow file, and the existing
suite fails when the document differs. The mode matrix and the prose stay authored — they are
rules, not a projection of the graph — but every status key they name must resolve. A hand edit
inside a generated block is a test failure, not a review finding.

**D14 — The deletions.** The undeployed `templates/handoff.md` and its `documents` declaration
are deleted with the resolver's document list. The role copies of the delivery and handoff
rules are deleted once shared carries them. The hand-written column table and Mermaid graph are
deleted once the renderer writes them. `## Parent` and `Blocked by` leave the ticket template.
The 90m timer leaves the Planner's contract. The `production:` body phrase leaves
`roles/release.md`, and the label selects the gate instead. ADR-0005, ADR-0008 and ADR-0009 are
not edited: where this spec changes their consequence it does so through a new ADR.

**D15 — The drill.** Before any catalog change reaches a live project, a throwaway Multica
project and a disposable repository are bound to a copy of the new workflow — a separately
named workflow object built from the graph in this spec, never the live `Factory`. It runs one
drill epic per mode (D17), with one ticket left stale in a review column and one moved across the
graph. Evidence is `issue timeline` for each ticket and each drill epic: the status and assignee
changes, the gate lane landing at `awaiting_merge`, the merge that completes it, one Planner wake
per closing stage, and the sweep's rule applied by hand to the stale ticket (the autopilot does
not exist until the release). The copy, the project, the epics, the tickets and the pull requests
are archived or deleted when the drill is green, and the drill's result gates the release: the
release child does not open before the drill records green.

**D16 — Release and the in-flight check.** The release child merges the current `main` in,
resolves, runs `just validate` and `just test`, and opens `spec/MIR-227` → `main`. Before the
sync, it lists every open issue in `in_review` or `human_review` whose epic carries
`manual-merge` or `production` and whose pull request has a `main` base, and moves each to the
matching gate lane with a comment — MIR-179 is the known case at spec time. Then the release run
applies the catalog and reads back fifteen columns, the sweep autopilot and its hourly trigger.
The epic is accepted only after the release squash is on `main` at the merged sha and the
readback agrees; the release child's `done` is branch-scoped until then.

`production` is applied to the epic before the release child is promoted, not before the spec
approval: the catalog declares the label in stage 3, so a workspace gains it only with the
release sync. At the stage-5 barrier the Planner creates it from that declaration
(`multica label create`) when the workspace does not yet carry it, applies it when the approval
owner has chosen production, and promotes the release child only then — the gate lane is read at
that promotion. Without the label the release child takes its normal lane; MIR-227 carries none,
so this epic's release is Reviewer-merged.

**D17 — The drill runs one epic per mode.** The mode is an epic label, and an epic carries one
mode: a single drill epic cannot promote its children into four lanes, so the drill that gates
the release would prove one route and assume three. The drill therefore creates four drill epics
on the one throwaway project and the one copy workflow — autonomous, `manual-merge`,
`human-assigned`, and `human-assigned` + `manual-merge` — each carrying its mode's labels (none
for autonomous) before its child is promoted, and each child landing in the lane its mode
selects. The stale ticket and the in-flight move sit under the autonomous epic, because neither
depends on the mode. `production` is not a drill epic: it selects the same gate lane for a
release child (D3) and is pinned by the offline mapping.

**D18 — Acceptance.** The epic closes when the inventory below has one home per rule, the
offline matrix pins the fifteen columns and four review exits, the templates and the rendered
guide are present, the sweep and `task.failed` are the only review-time guards, the drill is
green on the epic, and the live workspace reads back the graph, the autopilot and the guide.

## Testing Decisions

The suite tests the catalog through the resolver and the sync fixture, never the bytes of a
given file. The highest existing seam is the workflow file: `tests/factory-workflow.test.js`
already loads it through `resolve()` and pins it against the guide, so the graph is tested once,
at that seam, and the route table extends rather than duplicates it.

- **The graph matrix is the contract.** Every column resolves a handler, a legal edge and an
  instruction naming its exit; each of the four review columns declares its own exit and its own
  back status; the two gate reviews name `awaiting_merge`; the two normal reviews declare no
  advance; `spec_review` always names `awaiting_merge`.
- **No review instruction reads a mode label.** A scan over the four review instructions fails
  on `manual-merge`, `human-assigned` or `production`; the same scan over every instruction
  fails on the per-issue 90m timer and on `comment.created`.
- **The Planner's mapping is pinned.** The seven-row table above is asserted against the
  Planner's contract, so a lane cannot be added or renamed in one place only.
- **The rendered guide agrees with the workflow.** The renderer is idempotent; a test renders
  into memory and diffs the document, and a hand edit inside a marker block fails it. This is
  the only test that reads `docs/factory.md` as a generated artifact; the prose around the
  blocks stays a review concern.
- **The templates are pinned by shape.** The ticket template names the `Branch:` line and the
  three sections; the comment template names the three headings; the cap table and the brevity
  test agree on 340 words, 130 words, 10 lines and 1 KB.
- **The sweep is a declared object.** `just validate` resolves the autopilot, its cron, its role
  and its prompt; the sync fixture creates it and reads back exactly one enabled hourly trigger;
  a drift fixture refuses a second trigger, matching the existing control's behaviour.
- **The deletions are complete.** The resolver fails on a declared document with no file, so the
  `documents` deletion, the role copies and the hand-written blocks each fail loudly if half
  done.
- **Prior art.** `tests/factory-workflow.test.js` (routes and modes), `tests/config.test.js`
  (resolver invariants), `tests/schedule.test.js` (autopilot trigger readback),
  `tests/docs.test.js` (knowledge layer and spec headers), `tests/brevity.test.js` (caps),
  `tests/anonymity.test.js` (no live identity in the catalog).
- **The live acceptance is the drill, not the suite.** The suite cannot prove the platform's
  handoff, the member handler or the barrier wake; D15's drill is that proof, and its evidence
  lives on the epic, never in this repository.

### Rule inventory

The measured form of D1. Every rule below appears once, at the home named; a second prose copy
is the defect the review looks for.

| Rule | One home |
| --- | --- |
| who implements a ticket | epic labels, resolved by the Planner at promotion |
| who merges a delivery PR | the ticket's lane (four review columns) |
| who merges the spec PR | `spec_review` to `awaiting_merge` |
| when the factory starts | the spec child's move to `spec_progress` |
| order inside an epic | the child's stage |
| dependency between epics | `--until-issue` |
| parent | `--parent`, `issue children` |
| pull-request base | the ticket's `Branch:` line |
| diff scope | the ticket's `## Touch` |
| commit and PR shape | shared `## Delivery`; checked by `code-review` |
| comment shape and order | shared `## Handoffs` |
| stale review | the `stale-sweep` autopilot |
| failed run | the per-issue `task.failed` wake |
| cancelled epic | `--until-status cancelled` |
| column graph and its presentation | the workflow file; the guide is rendered from it |
| approvals after the spec | epic labels, resolved to lanes at promotion |
| issue references | shared `## Ownership` |
| brevity | the caps table in `README.md`, enforced by review |

## Acceptance

1. `just validate` and `just test` are green on the released `main`.
2. `multica workflow get Factory` resolves fifteen columns, four review columns with their exits, and the three gate lanes; no review instruction names a mode label.
3. `docs/factory.md`'s column table and graph are rendered from the workflow, and the test fails on a hand edit inside a generated block.
4. The rule inventory above resolves to one home per rule; no role repeats a shared section and no step instruction restates a role rule.
5. A ticket body carries `Branch:` and the three sections; a comment carries the three headings; the cap table states 340 words, 130 words, 10 lines and 1 KB.
6. The `stale-sweep` autopilot is declared, hourly, planner-owned, and the sync fixture reads back exactly one enabled trigger; no per-issue 90m timer remains and `task.failed` does.
7. `templates/handoff.md`, its `documents` declaration, the hand-written column table and graph, `## Parent` and `Blocked by` are gone from the catalog.
8. The drill records green on the epic: one drill epic per mode, the gate lane, the stale ticket and the in-flight move, each with its `issue timeline` evidence, and each drill epic shows one Planner wake per closing stage.
9. The release squash is on `main` at the merged sha, and the live workspace reads back the fifteen columns, the autopilot and the rendered guide.
10. No product repository gained a CI check, and no live identifier, owner or consumer URL entered the catalog.

## Out of Scope

- **Product-repository CI.** No check is added to any consumer repository; the delivery rules stay Reviewer-enforced (D2). The release topology's spec-level CI is unchanged.
- **Platform constructs the platform cannot read.** Custom properties, issue metadata, saved views and MCP servers are not used to carry any rule here; the grilling rejected the codegraph MCP on cost and the rest as decoration. The mode stays a label, the base stays a body line, and the dependency stays a stage or a condition.
- **The `direct-to-main` topology itself.** Its escape hatch, its single-ticket default and its per-ticket CI are unchanged; this spec only routes its PRs through the gate lanes.
- **The sandbox project and the `msbx` epic.** MIR-178's work is unaffected except for the one in-flight move D16 names.
- **Status rollback.** No status is deleted or renamed; the change is additive.
- **Human approval UX, member onboarding and the web application.** The only human-facing surface here is the label that selects a lane.
- **The upstream skill pins.** No skill is re-imported or retired; the three skills edited here are local forks and keep their provenance.

## Proposed breakdown

Published in `backlog` by the spec run, under the epic. Serial tickets have distinct stages;
stage 2 is the only parallel stage, because the drill and the contracts have disjoint surfaces.

| Stage | Ticket | Assignee | Blocked by | Delivers |
| --- | --- | --- | --- | --- |
| 1 | Spec: factory native carriers and one copy per rule | Planner | — | This document, the published set, and the spec PR into `spec/MIR-227`; its merge approves both. |
| 2 | Drill the fifteen-column graph on a throwaway project | Human | Stage 1 | The graph proved on the platform: one drill epic per mode (D17), both gate lanes, the stale ticket and the in-flight move, with `issue timeline` evidence, on a copy workflow and a disposable project; archived when green. Gates the release. |
| 2 | One delivery and handoff contract in shared | Implementer | Stage 1 | The delivery rules and the three-heading handoff live once in shared; the role copies, the undeployed handoff document and its declaration are deleted; `code-review` carries the checking method; the ticket template drops parent and blockers; the caps match. |
| 3 | Declare the fifteen-column graph and the Planner's lane mapping | Implementer | Stage 2 | The three gate columns, the four review exits, the label-free review instructions and the `production` label; the Planner's seven-row mapping and its release-barrier `production` application; the offline matrix pins all of it. |
| 4 | Replace the per-issue timer with one hourly stale sweep | Implementer | Stage 3 | The `stale-sweep` autopilot with its hourly trigger, prompt and thresholds; `task.failed` stays; the 90m registration is deleted from the contract and the instructions. |
| 5 | Render the Factory guide from the workflow | Implementer | Stages 3, 4 | The column table and graph generated between markers from the workflow file, the mode matrix updated for the gate lanes, and the test that fails when a hand edit drifts. |
| 6 | Release `spec/MIR-227` to `main` | Implementer | Stages 2–5 | The release PR, the in-flight move, the applied catalog, the readback of fifteen columns and the sweep, and the evidence the Planner accepts the epic on. |

## Further Notes

- **Why the mode moves to promotion.** The Reviewer was the only seat that read the label, and
  it read it at the merge. The Planner already resolves `human-assigned` at promotion, so the
  same place can resolve `manual-merge` and `production`; the read happens once, before work
  starts, and a wrong lane is visible on the board instead of silent in a merge.
- **Why the boundary scope survives.** `manual-merge` still gates only the spec approval and the
  PRs whose base is `main`. The alternative — every ticket PR waits for the human — was
  rejected because the human already approved the set at the spec merge and the integration
  branch is scratch; it would add N human merges for no new decision.
- **Why the sweep moves rather than pings.** A stale ticket is a triage problem, and `blocked`
  is the column that owns triage. A mention would start a run and duplicate the dispatch the
  status move already performs.
- **Why two thresholds.** Two hours catches a review whose agent run ended without a move; 24
  hours distinguishes that from a human merge the owner simply has not reached yet. One number
  for both would either block human merges hourly or leave agent reviews unwatched for a day.
- **Why the drill is before the catalog edits.** A wrong assumption about a member handler or
  the barrier wake is cheap to fix in a throwaway project and expensive to discover after a
  live sync. The drill copies the graph from this spec, so it tests the design, not the file.
- **What "the drift is gone" does not claim.** One copy does not make an agent obey it. The
  measure is structural — one home per rule, one reader — and the drill plus review are the
  behavioural check. A rule that the platform cannot read stays prose by design, and the
  inventory names it as such.
