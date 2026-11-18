# Factory native carriers: one copy per rule

`integration: spec/MIR-227` — forked from `main` at `f865023`. The spec itself is delivered
under this topology, so the record is what a rework and a later reader check against.

Accepted 2026-11-17. Approval is the merge of this spec's pull request into `spec/MIR-227`,
which completes MIR-228 and approves the published set; MIR-227 is the epic — it stays `todo`
until the spec merge, `epic_progress` until the release lands, and the Planner accepts it on
evidence. The decisions below are the answers given in the grilling session that opened the
epic and its later revisions; ADR-0010 to ADR-0015 are their durable records.

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
  the epic's merge label — `manual-merge` until this change renames it `has-human-release` —
  while it holds the merge button. That is the one place a wrong read costs a wrong merge and
  cannot be undone.
- **The one guard called essential has no carrier.** `task.failed` plus the 90m review check
  depends on the Planner remembering to arm a per-issue timer in every review column. The
  ticket the Planner forgets is exactly the ticket nobody watches.
- **The guide is double bookkeeping.** `docs/factory.md` keeps a hand-written column table and
  Mermaid graph that no test parses, so a graph change can leave the guide describing the old
  graph while the workflow moves.
- **The release seat is installed but unclaimed.** The `release` role exists and no workflow
  handler ever selects it; the release procedure lives in one ticket's body, so it has one copy
  and no reader with a contract.

The repository is also inconsistent about templates: `templates/handoff.md` is declared as a
document that the sync never deploys, `shared/instructions.md` carries a different five-line
shape, and each role carries its own. A run reads the shape of whichever copy it finds.

## Solution

Every rule gets exactly one home. If the platform can store or act on the fact, the home is a
**native carrier** — a status, a handler, a stage, an issue link, a wakeup, an autopilot or a
label. Otherwise the home is exactly **one prose copy, in the seat that reads it**. "One
carrier or one reader" is the single acceptance measure for the whole change, and the inventory
in Testing Decisions is how it is measured.

- **The graph carries the seat, and the pull request carries the gate.** Fifteen columns. The
  Planner resolves only who implements — `has-human-implementer` selects the human lane, every
  other delivery starts an agent — and the release seat has its own lane. Who merges is not a
  column: it is the one exit rule in `code-review`, read at the PASS from the PR's base and the
  epic's `has-human-release`. The same rule covers all four review columns, so no lane has a
  twin and every review column declares `awaiting_merge` as its safe advance.
- **The epic has a state.** `epic_progress` records that the slice is approved and in flight;
  the Planner moves the epic there when it promotes the first delivery stage, and to `done` on
  acceptance. It is a state column with no handler, so the move starts no run and cannot
  duplicate the barrier wake.
- **One contract.** The delivery rules and the handoff shape live once in shared instructions;
  each role keeps only its own behaviour, and `code-review` carries the checking method.
- **Two templates and one native handoff.** A ticket is a `Branch:` line plus `## What` /
  `## Acceptance` / `## Touch`; the delivery handoff is the linked pull request, whose body is
  optional. A verdict, finding or sweep note is a `## What` / `## Evidence` / `## Next` comment.
  Everything the platform already stores (the parent, the link) or encodes (the stage edge)
  leaves the body.
- **One sweep.** One hourly catalog autopilot sweeps the four reviewer-handled review columns,
  comments the evidence and moves the ticket to `blocked`. `task.failed` stays per-issue; the
  per-issue 90m timer is deleted.
- **One mergeable rule.** Every linked PR carries one continuous conflicts condition, armed by
  the Reviewer at each review; the seat that owns the work column resolves it, judgement goes to
  the human lane, and a fix voids the PASS so the reviewed head is the merged head.
- **One renderer.** The guide's column table and graph are generated from the workflow file,
  and the suite fails when the document and the workflow differ.
- **One entry rule.** Durable work starts from a ticket or an epic; chat may produce throwaway
  artifacts but never a durable repository write, and the factory starts only when the Planner
  moves the spec child to `spec_progress` from a grilling session.
- **One handoff gate.** Grilling ends on one packet and the user's answer. The epic and its
  spec child may exist inert, but no spec run starts before the answer, and the slice freezes
  when the spec PR opens.
- **One proof.** A drill on a throwaway project, bound to a copy of the new graph, exercises
  every mode and both release exits before the catalog change reaches a live project.

## User Stories

1. As the approval owner, I want every rule to have exactly one home, so a change to it is one edit and not a search for stale copies.
2. As the approval owner, I want to read one document and see the whole workflow, so I do not have to reconcile the guide against the workflow file.
3. As the approval owner, I want the label I put on the epic to decide who merges at the PASS, so the merge is checked when it happens and not cached days earlier.
4. As the approval owner, I want no human approval after the spec merge unless an epic label asked for one, so the autonomous epic stays autonomous.
5. As the approval owner, I want the release merge to follow the epic's mode, so a `has-human-release` epic gates the release without a second label.
6. As the Planner, I want the promotion mapping (who implements) written once in my own contract, so promotion is one table lookup and not a negotiation with the Reviewer.
7. As the Planner, I want the stage to be the dependency edge inside an epic, so I stop writing `Blocked by` lists that no platform check reads.
8. As the Planner, I want a `Touch:` list on every ticket, so the diff has a committed scope before implementation begins.
9. As the Planner, I want the slice published before the spec PR leaves `spec_progress`, so the barrier wakes me once and never for a set that changed after approval.
10. As the Planner, I want durable work to always land on a ticket, so a chat session cannot leave an unreviewed repository change behind.
11. As the Planner, I want the factory to start only from a grilling session, so the spec child's move is an explicit trigger and not whatever chat happened to precede it.
12. As the Planner, I want a single hourly sweep to catch the agent reviews I forgot to watch, so no review waits silently on a step that never comes.
13. As the Implementer, I want the delivery rules in the contract I already receive, so I do not have to load a skill I cannot load or read a second copy.
14. As the Implementer, I want the ticket to name my base branch and my allowed `Touch:` paths, so I do not discover the scope from a review finding.
15. As the Reviewer, I want one exit rule read from the PR's base and the epic's label, so I never consult a lane twin or invent a second condition.
16. As the Reviewer, I want the delivery checks and the exit in `code-review`, so the rule I enforce and the method I load are the same copy.
17. As the Reviewer, I want every review column to declare `awaiting_merge` as its safe advance and the merge to be the handled exception, so a missed step lands with the human rather than on `main`.
18. As the Reviewer, I want a ticket that is not an open PR to go back with a record, so I never review or complete a stale link.
19. As the human in a `has-human-release` epic, I want every pull request based on `main` to reach me at `awaiting_merge`, so I keep the boundary merges without holding every branch merge.
20. As the human implementer, I want my delivery to follow the same exit rule as an agent's, so my lane does not change because the epic is gated.
21. As the human implementer, I want my review to be independent of my implementation, so `human_review` is reviewed by the Reviewer, never by me.
22. As a maintainer, I want the fifteen-column graph pinned by the offline matrix, so a column cannot be added without its route and its handler.
23. As a maintainer, I want the guide rendered from the workflow, so a graph change cannot leave the guide behind.
24. As a maintainer, I want the ticket template and the verdict comment to be one shape each, so a handoff is read the same way by every seat.
25. As a maintainer, I want the undeployed handoff document deleted, so there is no declared artifact that nothing deploys.
26. As a maintainer, I want the stale sweep to be one declared autopilot, so a ticket the Planner forgot is still found.
27. As a maintainer, I want `task.failed` to stay per-issue, so a failed run wakes the Planner on the issue it failed on.
28. As a maintainer, I want the drill to prove the graph on a throwaway project, so a wrong assumption costs a drill ticket and not a live sync.
29. As a maintainer, I want a measured inventory of rule to carrier, so "the drift is gone" is a result and not an opinion.
30. As a future agent, I want the catalog to be legible in one pass, so I can hold the whole contract in a fresh context window.
31. As the release agent, I want a lane and a contract in the workflow, so the release procedure has one home and the release ticket carries only its instance.
32. As the approval owner, I want an approved epic to leave `todo` for `epic_progress`, so a slice in flight is not indistinguishable from one that is queued.
33. As the approval owner, I want the grilling-to-factory handoff to be one explicit question, so an epic and a slice never start from a chat as a side effect.
34. As the approval owner, I want a conflicting delivery PR fixed without me watching it, so `main` never sits unmergeable because nobody noticed.
35. As the Reviewer, I want a conflict fix re-reviewed at the delta, so a void PASS is restored without repeating the whole review.

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

**D3 — The lane carries the seat; the exit is read at the PASS.** The graph grows three columns,
not nine: `epic_progress`, `release_progress` and `release_review`. The Planner maps an epic's
labels and the ticket's kind to a lane when it promotes the ticket, and that mapping decides only
who implements:

| Epic labels | Ticket | Lane |
| --- | --- | --- |
| any | spec child | `spec_progress` |
| neither, or `has-human-release` | delivery | `in_progress` |
| `has-human-implementer` | delivery | `human_progress` |
| any | release | `release_progress` |

Who merges is not in the table. It is one exit rule in `code-review`, read at the PASS:

- base is a `spec/<epic>` branch → the Reviewer merges at the reviewed head; the merge completes
  the ticket, so the declared next is not used;
- base is `main` and the epic carries `has-human-release` → the PASS moves the ticket to
  `awaiting_merge`; the human merges;
- base is `main` and the epic carries no label → the Reviewer merges;
- a spec PR always moves to `awaiting_merge` (D4), in every mode.

All four review columns declare `awaiting_merge` as their `next`, so the unattended advance is
the human and the merge is the handled exception. This is the rule the live graph already runs;
the change is that it lives once, in the seat that acts on it, instead of in each review
instruction.

The gate-twin alternative — a lane per mode — was rejected because it caches the mode at
promotion and every later move can lose it. A gate ticket the human bounces to `in_progress`
re-enters `in_review`, whose PASS merges into `main`: the gate is gone and nothing in the graph
records that it was ever there. Reading at the PASS cannot be escaped by a move, because the
review that routes a `main` PR always evaluates the base and the label again.

The ticket's kind is a stage read, never a body marker: on a published slice the release
ticket is the epic's final-stage child — published last, and the only child in its highest
stage — and every other child is a delivery ticket. A `direct-to-main` spec publishes no
release child, so every child it publishes is delivery. A drill epic is not a published slice:
its never-closing diagnostic stage sits above the release on purpose (D17), so the drill's own
table assigns each drill child's kind.

`has-human-release` keeps the scope `manual-merge` has today: it gates every pull request whose
base is `main`; the spec approval is the human merge in every mode (D4). A ticket PR into
`spec/<epic>` is Reviewer-merged in every mode, because the human already approved the set and
the branch is scratch. The release child belongs to the release seat in every mode:
`has-human-implementer` changes who implements delivery, not who releases. Because the label is
read at each PASS, a label added after promotion applies at the next review; the epic's mode is
still set before the spec merge when the whole slice is to share it.

The epic also has a state. It leaves `todo` when the slice starts: the Planner moves it to
`epic_progress` in the run that promotes the first delivery stage, and to `done` on acceptance.
`epic_progress` has no handler, so the move starts no run and cannot duplicate the barrier wake
that already fires when a stage closes.

The promotion run also arms the barrier that holds its stage: one
`--until-children-done --stage N` condition on the epic, replaced rather than duplicated on the
next promotion, so exactly one live barrier sits on the frontier stage. A stage that closes and
wakes nobody is a defect of the run, not of the graph; the release reads the invariant back as
one live barrier on the frontier.

**D4 — The spec approval is always the human merge.** `spec_review` keeps one exit: PASS leaves
the pull request open and moves the spec child to `awaiting_merge`; the human merge approves the
spec, the proposed breakdown and the published set, in every mode including autonomous. No
column may merge a spec PR, and no instruction may enable auto-merge. The spec PR is the one
review the exit rule sends to `awaiting_merge` regardless of its base or the epic's labels; it
is stated once, beside the exit rule in `code-review`, and not repeated in the column.

**D5 — Naming.** `epic_progress` is the epic's state; `release_progress` and `release_review`
are the release seat's work and review columns. There are no `_gate` columns: a lane that
differs from its twin only by its exit is a transition, not a state, and the platform already
gives each column one transition. The four review columns are named for the work they review —
`spec_review`, `in_review`, `human_review`, `release_review` — and each declares
`awaiting_merge` as its next.

The epic labels are `has-human-implementer` (renamed from `human-assigned`) and
`has-human-release` (renamed from `manual-merge`). `has-` states a property of the epic's
delivery, so the two flags compose and read as one policy: the epic has a human implementer, a
human release, or both. `uses-` would name a tool or an actor the epic employs and reads as a
per-run choice, not an epic property. Both renames are migration-ledger events, so the live
labels keep their ids and their issues; the new names are the names in the catalog, the review
instructions, the guide and the tests. The drill creates its own copies of both names and
deletes them before the release, so the ledger never sees two live labels with one meaning.

**D6 — Two templates and no repeated state.** A ticket body is a `Branch:` line followed by
`## What`, `## Acceptance` and `## Touch`; the line is present only for an integration spec and
its absence means `main`. The delivery handoff is the linked pull request, not a comment: the
platform already carries the link, the head, the checks and the merge state, so the body is
optional and an empty body is not a finding. A verdict, finding or sweep note is one comment —
`## What`, `## Evidence` and `## Next` — and a finding stays one `Evidence` bullet in the form
`P2 — file:line: trigger; consequence; fix`. The parent is native (`--parent`,
`issue children`) and leaves the body. `Blocked by` leaves the body too: an intra-epic
dependency is the stage, a cross-epic one is an `--until-issue` condition, and a ticket that
cannot start is `blocked` with the reason on the record rather than a list nobody parses. The
caps move with the shape: a comment is at most 10 rendered lines and 1 KB, a findings list 1 KB,
a decision packet 800 bytes, shared instructions 340 words, and each role 130 words.

**D7 — One contract, one checker.** `shared/instructions.md` carries a `## Delivery` section
(one PR per ticket, base, `Touch:`, commit and PR title shape, squash, no self-merge, no
auto-merge) and a `## Handoffs` section (the linked PR as the delivery handoff, the three-heading
verdict comment, the move-last order, the caps). Each role keeps only its seat's behaviour, and
`code-review` gains the delivery checklist, so the rule the Reviewer enforces and the method the
Reviewer loads are the same copy. The per-ticket scope stays in the ticket's `## Touch`; the
per-ticket base stays in its `Branch:` line. The Implementer reads the shared contract because
every role already renders it.

**D8 — Planner always tickets; chat writes nothing durable.** Any request that will change
repository or platform state becomes an epic (more than one ticket) or a regular ticket (one
ticket) before the change starts; a pure question or a read-only scan stays in chat. A scan or
a prototype may write a throwaway artifact — a report, a scratch directory — but a durable
repository file (a glossary term, an ADR, code) rides in the ticket that acts on the scan. The
Planner never implements in chat.

**D9 — Grilling is the factory entry.** An epic may be created from any session, but the
factory starts only after the handoff gate (D19): the Planner moves the spec child to
`spec_progress`, or, when the grilling session is the spec run, writes the spec there. A small
task is a regular ticket with no grilling and no spec child. This keeps
`improve-codebase-architecture` and `prototype` useful in chat without reopening D8.

**D10 — The slice floor.** A ticket delivers one observable behaviour, one pull request and one
green head. A stage may hold several tickets only when they are independently mergeable and
their `Touch:` sets are disjoint; any ordering need is a later stage. The floor stays
behavioural: a chunk smaller than one verifiable behaviour cannot be reviewed or merged.

**D11 — No human gate after the spec merge unless a label selects one.** An autonomous epic
runs to the release without another human decision. `has-human-release` is the label that adds a
human merge gate; `has-human-implementer` selects human implementation. The implementer is
resolved to a lane at promotion; the merge gate is read at each PASS in the one exit rule in
`code-review` (D3), never cached in a lane and never restated in a column. Silence is not
approval; a bare `approve` clears the gate it names.

**D12 — One sweep, one event.** The catalog declares a `stale-sweep` autopilot: hourly, planner
role, `run_only`, reading the four reviewer-handled review columns — `spec_review`, `in_review`,
`human_review`, `release_review` — dating each ticket from `issue timeline`, and for a ticket
older than two hours posting a `## What` / `## Evidence` / `## Next` comment with the age and the
last actor, then moving it to `blocked` for triage. Human-handled columns (`human_progress`,
`awaiting_merge`) are never swept: they wait indefinitely for the human, and no agent may
un-gate a human step. Triage of a swept ticket restores the lane it held before `blocked` in its
timeline; a second sweep on the same ticket leaves it `blocked` for the human rather than
re-entering the loop. The sweep never
mentions anyone, never closes or cancels a ticket and never runs on `blocked`. `task.failed`
stays a per-issue event the Planner registers, because the platform knows that fact exactly; the
per-issue 90m timer is deleted, and the cancelled-epic sweep stays as `--until-status cancelled`
on the epic. No wake is registered on `comment.created`.

**D13 — The guide renders from the workflow.** A renderer writes the column table and the
Mermaid graph in `docs/factory.md` between markers from the workflow file, and the existing
suite fails when the document differs. The promotion table, the exit rule and the prose stay
authored — they are rules, not a projection of the graph — but every status key they name must
resolve. A hand edit inside a generated block is a test failure, not a review finding.

**D14 — The deletions and the renames.** The undeployed `templates/handoff.md` and its
`documents` declaration are deleted with the resolver's document list. The role copies of the
delivery and handoff rules are deleted once shared carries them. The hand-written column table
and Mermaid graph are deleted once the renderer writes them. `## Parent` and `Blocked by` leave
the ticket template. The 90m timer leaves the Planner's contract. The `manual-merge` label is
renamed `has-human-release` and `human-assigned` is renamed `has-human-implementer`, each by a
migration-ledger event, not recreated: existing epics keep their labels by id, and the catalog,
the review instructions, the guide and the tests carry the new names. The `awaiting_merge`
instruction names no label — it merges or sends the ticket back to the author's lane — and the
one label read lives in `code-review`'s exit rule, with the spec-approval exception stated once
beside it (D4). The `blocked` instruction stops naming a `Blocked by` section: a swept ticket returns to the lane
its timeline records, and any other ticket uses the stage or the `--until-issue` condition. The
release seat's contract gains the release procedure once the release lane owns it; the
`production:` body phrase and its deploy-time second approval in `roles/release.md` are left as
they are, and production promotion stays out of scope. ADR-0005, ADR-0006, ADR-0008 and
ADR-0009 are not edited: where this spec changes their consequence it does so through a new
ADR — ADR-0012 supersedes the 90m-check clauses of ADR-0005 and ADR-0006, and ADR-0014
supersedes the gate-lane decision of ADR-0011.

**D15 — The drill.** Before any catalog change reaches a live project, a throwaway Multica
project and a disposable repository are bound to a copy of the new workflow — a separately
named workflow object built from the graph in this spec, never the live `Factory`. It runs one
drill epic per mode (D17), with each child routed by the D3 promotion table and the exit rule,
one ticket left stale in an agent review column, one moved across the graph, and a release child
in each merge mode so both release exits are exercised. Evidence is `issue timeline` for each
ticket and each drill epic: the status and assignee changes, the label-driven landing at
`awaiting_merge`, the merge that completes it, one Planner wake per closing stage, and the
sweep's rule applied by hand to the stale ticket (the autopilot does not exist until the
release). The copy, the project, the epics, the tickets and the pull requests are archived or
deleted when the drill is green, and the drill's result gates the release: the release child
does not open before the drill records green.

The drill ran on the gate-twin graph before this revision. Its gate-lane evidence is historical
and is not re-run: the lanes it proved are the lanes being deleted, and the exit at the PASS is
the live graph's existing behaviour, already exercised on live epics. The member handler,
one-run-per-move and the barrier wake it proved carry over unchanged.

**D16 — Release and sync.** The release child merges the current `main` in, resolves, runs
`just validate` and `just test`, and opens `spec/MIR-227` → `main`. The release procedure
applies the catalog before the sync — the fifteen columns, the release lanes, the epic state,
the sweep and the `manual-merge` → `has-human-release` and `human-assigned` →
`has-human-implementer` renames. There is no in-flight move: no ticket lands in a new lane,
because the new lanes are a state and a seat, not a gate; a ticket already in `in_review` or
`human_review` at the sync is gated by the exit rule at its next PASS, and a ticket already past
review is completed by the human merge. It reads back fifteen columns, both labels, the sweep
autopilot and its hourly trigger, the release seat's handler, the rendered guide and exactly one
live barrier on the epic's frontier stage. The epic is
accepted only after the release squash is on `main` at the merged sha and the readback agrees;
the release child's `done` is branch-scoped until then.

MIR-227 carries neither `has-human-implementer` nor `has-human-release`, so this epic's release
is Reviewer-merged.

**D17 — The drill runs one epic per mode.** The two labels compose into four modes —
autonomous, `has-human-release`, `has-human-implementer`, and both — and the drill creates one
drill epic per mode on the one throwaway project and the one copy workflow, each carrying its
labels (none for autonomous) before its child is promoted. The four modes exercise both
implementation lanes and both exits: the autonomous epic's delivery PR is Reviewer-merged, the
`has-human-release` epic's delivery PR lands at `awaiting_merge`, and the human epics start in
`human_progress`. The Planner drives the drill — it builds the copy, binds the throwaway
project, and promotes every stage through the D3 table — so the mapping is exercised, not
bypassed; the human lanes and their merges are the only steps the human owns. The autonomous
epic also carries the stale ticket in a final stage that never closes, the in-flight ticket
beside its first delivery, and a release child so the normal release exit is exercised; the
`has-human-release` epic carries a release child so the gated release exit is exercised. Each
epic moves `todo` → `epic_progress` at its first promotion, so the state column is exercised
too. The drill creates `has-human-implementer` and `has-human-release` for its epics and
deletes both when the drill is archived, before the release renames, so the ledger never sees
both names live. Because the drill's diagnostic stage is above the release, the drill's table is
what names each drill child's kind: a release child there is a fixture fact, not the published
slice's stage read.

**D18 — Acceptance.** The epic closes when the inventory below has one home per rule, the
offline matrix pins the fifteen columns and four review exits, the templates and the rendered
guide are present, the sweep and `task.failed` are the only review-time guards, the mergeable
rule has fired once in the probe, the drill is green on the epic, and the live workspace reads
back the graph, both labels, the autopilot, the release seat, the guide and one barrier on the
frontier stage.

**D19 — The factory start is an explicit gate.** Grilling creates nothing on its own: it may
write a throwaway artifact, but the epic, spec and tickets come from the handoff, not from the
conversation. If the user asks for the epic before the graph is settled, the Planner may open
the epic in `todo` and its stage-1 spec child inert in `backlog` once the destination is named —
`todo` dispatches nobody, so the container is not the start, and the epic stays `todo` until the
slice starts. No spec run begins and no slice is written until the user answers one
handoff packet: the destination, the shape (a single ticket, an epic + spec child, or a wayfinder
map when the frontier is not actually empty), the mode labels, and the proposed slice outline.
The answer is the yes that starts the factory: the Planner then moves the spec child to
`spec_progress` or, in the chat, begins the spec run. The spec run publishes the whole slice in
`backlog` and opens the PR; the set is frozen when the PR opens, and a later addition is a spec
revision on the same head, never an incremental ticket on an approved set. An epic opened before
the destination is settled is rejected: it is inert, and the durable container for unresolved
decisions is a wayfinder map. A small task is a regular ticket and skips the gate (D9); a pure
question stays in chat.

No platform construct can require the answer before an issue exists or a run starts. The gate is
one prose copy in `skills/grilling`, the seat that reads it; the Planner contract names the route
and does not restate it. The mechanical half is the freeze: the merge approves the set, and the
stage barrier re-evaluates whenever the child set changes.

**D20 — A delivery PR is kept mergeable by one condition.** Every ticket whose PR is linked
carries one continuous `--until-pr conflicts` condition (GitHub only), registered with
`multica issue wakeup create` and `--mode continuous`; the command replaces the configuration, so
re-arming does not duplicate it. The Reviewer arms it at every review — the only seat that runs
in every lane between PR open and merge — and it survives the PASS into `awaiting_merge`. It is
an agent condition: the Planner for a spec PR, the Implementer for a delivery PR — including one
the human authored, since a member is not a wakeup target — and the Release seat for a release
PR.

When it fires, that seat merges the base, resolves inside `## Touch`, reruns the check that
covers the diff and pushes. The split is judgement, not lane: a base merge, a lockfile or
disjoint hunks is mechanical and the Implementer resolves it; when both sides changed the
meaning of the same lines, no agent resolves — it comments the conflict and moves the ticket to
`human_progress`, on every lane, and the human resolves and moves it to the review column that
owns the work: `human_review` for a delivery, `release_review` for a release, `spec_review` for a
spec. Behind-but-clean is not a conflict and the condition never fires on it: the merge still
works, and branch protection that requires an up-to-date head is one `gh pr update-branch`, left
manual.

A push changes the head, so it voids the PASS. The resolver moves the ticket to the review
column that PASSed it — every review column's `next` is `awaiting_merge`, so the timeline names
it — and the Reviewer re-reviews the delta `H...H'` plus the delivery facts at `H'`; a fresh PASS
returns it to `awaiting_merge`, and a blocking finding sends it back to the work column. The
resolution contract is one paragraph in shared `## Delivery`; the arming, the void PASS and the
delta re-review are one copy in `code-review`. No column instruction restates either, and no new
noun is introduced: `guard` stays the retirement refusal.

## Testing Decisions

The suite tests the catalog through the resolver and the sync fixture, never the bytes of a
given file. The highest existing seam is the workflow file: `tests/factory-workflow.test.js`
already loads it through `resolve()` and pins it against the guide, so the graph is tested once,
at that seam, and the route table extends rather than duplicates it.

- **The graph matrix is the contract.** Every column resolves a handler, a legal edge and an
  instruction naming its exit; the four review columns each declare `awaiting_merge` as their
  next and their own back status; `epic_progress` and the two queue columns resolve `none` as
  their handler.
- **The label is read once.** A scan of the catalog finds `has-human-release` and
  `has-human-implementer` only where they are acted on: the Planner's promotion table and the
  one exit rule in `code-review`. No column instruction carries a second copy; the same scan over
  every instruction fails on the per-issue 90m timer and on `comment.created`.
- **The Planner's mapping is pinned.** The four-row table above is asserted against the
  Planner's contract, so a lane cannot be added or renamed in one place only.
- **The rendered guide agrees with the workflow.** The renderer is idempotent; a test renders
  into memory and diffs the document, and a hand edit inside a marker block fails it. This is
  the only test that reads `docs/factory.md` as a generated artifact; the prose around the
  blocks stays a review concern.
- **The templates are pinned by shape.** The ticket template names the `Branch:` line and the
  three sections; the verdict comment names the three headings; a delivery handoff is the linked
  PR and its body is optional; the cap table and the brevity test agree on 340 words, 130 words,
  10 lines and 1 KB.
- **The sweep is a declared object.** `just validate` resolves the autopilot, its cron, its role
  and its prompt; the prompt names only the four reviewer-handled columns; the sync fixture
  creates it and reads back exactly one enabled hourly trigger; a drift fixture refuses a second
  trigger, matching the existing control's behaviour.
- **The mergeable rule is pinned by copy, then proved once.** A scan finds the conflicts
  condition once, in `skills/code-review/`, and the resolution contract once, in shared
  `## Delivery`; no column instruction carries either. The platform mechanic — the condition
  fires on a conflicting head, the fix voids the PASS, the re-review covers the delta — cannot be
  proved offline: one live probe at the new ticket's stage links a PR in a disposable repository,
  pushes a conflicting base, watches the condition fire, resolves, bounces and re-reviews, and
  cleans up. It is not a release gate; the first real conflict after release is the live
  acceptance.
- **The barrier is a run fact.** The suite pins the promotion step in the Planner contract; the
  live check is the release readback of exactly one live barrier on the frontier stage. A
  promoted stage with no barrier is a review finding on the promotion run, not a documentation
  gap.
- **The deletions and the renames are complete.** The resolver fails on a declared document with
  no file, so the `documents` deletion, the role copies and the hand-written blocks each fail
  loudly if half done. The two label renames are pinned by the migration resolver: a ledger event
  that leaves both names live fails, and two events that rename one label fail.
- **The handoff gate is a run rule.** The grilling skill carries the packet's four fields and
  the answer-before-spec-run order; the Planner contract names the route and does not restate
  it. The suite pins neither as a platform behaviour — there is no native gate — so the live
  check is a Planner run: with an empty frontier it ends on the packet and creates or starts
  nothing before the answer. The drill proves the graph, not a chat gate.
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
| who implements a delivery | epic labels, resolved by the Planner at promotion |
| ticket kind (delivery or release) | a published slice's stage: its final-stage child is the release; a `direct-to-main` spec has none; a drill's table names its kinds |
| who implements a release | the release seat's lane (`release_progress`) |
| who merges a delivery PR | the exit rule in `code-review`, read at the PASS from the PR's base and the epic's label |
| who merges the spec PR | `spec_review` to `awaiting_merge` |
| epic state | `epic_progress`, moved by the Planner |
| release procedure | `roles/release.md`, read by the release seat |
| when the factory starts | the handoff answer in the grilling skill, then the spec child's move to `spec_progress` |
| order inside an epic | the child's stage |
| the next stage's barrier | the promotion run, per D3 |
| dependency between epics | `--until-issue` |
| parent | `--parent`, `issue children` |
| pull-request base | the ticket's `Branch:` line |
| diff scope | the ticket's `## Touch` |
| commit and PR shape | shared `## Delivery`; checked by `code-review` |
| delivery handoff | the linked pull request; checked by `code-review` |
| verdict and finding shape | shared `## Handoffs` |
| stale review | the `stale-sweep` autopilot |
| keeping a linked PR mergeable | the continuous `--until-pr conflicts` condition, armed by `code-review` |
| conflict resolution | shared `## Delivery`; judgement lands on the human lane |
| failed run | the per-issue `task.failed` wake |
| cancelled epic | `--until-status cancelled` |
| column graph and its presentation | the workflow file; the guide is rendered from it |
| approvals after the spec | the exit rule in `code-review`, read at each PASS |
| issue references | shared `## Ownership` |
| brevity | the caps table in `README.md`, enforced by review |

## Acceptance

1. `just validate` and `just test` are green on the released `main`.
2. `multica workflow get Factory` resolves fifteen columns including `human_progress`,
   `release_progress`, `release_review` and `epic_progress`; the four review columns declare
   `awaiting_merge` as their next, and the exit rule — base, label and the spec-approval
   exception — lives once in `code-review`; no column instruction carries a second copy and
   `epic_progress` resolves no handler.
3. `docs/factory.md`'s column table and graph are rendered from the workflow, and the test fails
   on a hand edit inside a generated block.
4. The rule inventory above resolves to one home per rule; no role repeats a shared section and
   no step instruction restates a role rule.
5. A ticket body carries `Branch:` and the three sections; a delivery handoff is the linked PR
   and its body is optional; a verdict comment carries the three headings; the cap table states
   340 words, 130 words, 10 lines and 1 KB.
6. The `stale-sweep` autopilot is declared, hourly, planner-owned, and the sync fixture reads
   back exactly one enabled trigger; it reads only the four reviewer-handled columns,
   `human_progress` and `awaiting_merge` are untouched, no per-issue 90m
   timer remains and `task.failed` does.
7. `templates/handoff.md`, its `documents` declaration, the hand-written column table and graph,
   `## Parent` and `Blocked by` are gone from the catalog, and both `manual-merge` and
   `human-assigned` are renamed with their live issues still attached.
8. The drill records green on the epic: one drill epic per mode, both release exits, the stale
   ticket, the in-flight move and the epic state, each with its `issue timeline` evidence, and
   each drill epic shows one Planner wake per closing stage.
9. The release squash is on `main` at the merged sha, and the live workspace reads back the
   fifteen columns, both labels, the autopilot, the release seat's handler, the rendered guide
   and exactly one live barrier on the epic's frontier stage.
10. No product repository gained a CI check, and no live identifier, owner or consumer URL
    entered the catalog.
11. The grilling skill carries the handoff packet and the answer-before-spec-run rule once; the
    Planner contract names the route; a Planner run with an empty frontier starts no spec run
    and writes no slice before the answer.
12. The conflicts condition is declared once in `code-review` and the resolution contract once in
    shared; a conflicting head wakes the seat that owns the work column, a fix voids the PASS,
    the re-review covers `H...H'`, and a judgement conflict lands in `human_progress` on every
    lane.
13. The live probe has fired the condition once in a disposable repository — a linked PR, a
    conflicting base push, a resolution, a void PASS and a clean re-review — and its evidence is
    on the stage-5 ticket. The first real conflict after release is the live acceptance.

## Out of Scope

- **Product-repository CI.** No check is added to any consumer repository; the delivery rules stay Reviewer-enforced (D2). The release topology's spec-level CI is unchanged.
- **Platform constructs the platform cannot read.** Custom properties, issue metadata, saved views and MCP servers are not used to carry any rule here; the grilling rejected the codegraph MCP on cost and the rest as decoration. The mode stays a label, the base stays a body line, and the dependency stays a stage or a condition.
- **The `direct-to-main` topology itself.** Its escape hatch, its single-ticket default and its per-ticket CI are unchanged; this spec only changes who merges its PRs, through the exit rule.
- **Production promotion approval.** The `production:` body phrase in `roles/release.md` and its deploy-time second approval are unchanged; the release lane this spec adds is the PR into `main`, not the deployment. A label-selected production approval, if wanted, is a separate spec with its own carrier.
- **The sandbox project and the `msbx` epic.** MIR-178's work is unaffected: there is no in-flight move, and a ticket in a review column is gated by the exit rule at its next PASS.
- **Status rollback.** No status is deleted or renamed; the change is additive.
- **Human approval UX, member onboarding and the web application.** The only human-facing surface here is the label that selects the exit and the member handler that waits.
- **The upstream skill pins.** No skill is re-imported or retired; the four skills edited here are local forks and keep their provenance.

## Proposed breakdown

Published in `backlog` by the spec run, under the epic, and revised on the same head when the
conflict rule landed: stage 5 is new and the renderer and the release moved down one. Serial
tickets have distinct stages; stage 2 is the only parallel stage, because the drill and the
contracts have disjoint surfaces.

| Stage | Ticket | Assignee | Blocked by | Delivers |
| --- | --- | --- | --- | --- |
| 1 | Spec: factory native carriers and one copy per rule | Planner | — | This document, the published set, and the spec PR into `spec/MIR-227`; its merge approves both. |
| 2 | Drill the fifteen-column graph on a throwaway project | Planner | Stage 1 | The graph proved on the platform: one drill epic per mode (D17), both release exits, the epic state, the stale ticket and the in-flight move, with `issue timeline` evidence, on a copy workflow and a disposable project; archived when green. The Planner builds the copy, binds the project and promotes every stage through the D3 table; only the human lanes and merges are the human's. Gates the release. |
| 2 | One delivery and handoff contract in shared | Implementer | Stage 1 | The delivery rules and the three-heading handoff live once in shared; the grilling handoff gate lands once in the grilling skill with the Planner contract naming the route; the role copies, the undeployed handoff document and its declaration are deleted; `code-review` carries the checking method and the exit rule; the ticket template drops parent and blockers; the caps match. |
| 3 | Declare the gate-free graph and the review exit rule | Implementer | Stage 2 | The three new columns, the four review exits, the one exit rule in `code-review`, the release seat, the epic state and the two label renames with their ledger events; the Planner's four-row mapping; the offline matrix pins all of it. |
| 4 | Replace the per-issue timer with one hourly stale sweep | Implementer | Stage 3 | The `stale-sweep` autopilot with its hourly trigger, prompt and two-hour threshold over the four reviewer-handled columns; `human_progress` and `awaiting_merge` are never swept; lane-aware triage; `task.failed` stays; the 90m registration is deleted from the contract and the instructions. |
| 5 | Keep delivery PRs mergeable | Implementer | Stage 4 | The continuous conflicts condition armed at every review; the mechanical/judgement split and the `human_progress` landing in shared `## Delivery`; the void PASS, the review-column bounce and the delta re-review in `code-review`; the human-lane route in `human_progress`; the offline pin and one live probe in a disposable repository. |
| 6 | Render the Factory guide from the workflow | Implementer | Stages 3, 4 | The column table and graph generated between markers from the workflow file, the promotion table and the exit rule updated for the release lanes, and the test that fails when a hand edit drifts. |
| 7 | Release `spec/MIR-227` to `main` | Release | Stages 2–6 | The release PR, the applied catalog, the readback of fifteen columns, both labels, the release seat, the sweep and the one live barrier, and the evidence the Planner accepts the epic on. |

## Further Notes

- **Why the exit is read at the merge, not cached in a lane.** The live graph read the label at
  the PASS and it worked. The spec tried to remove that read by making the mode a column at
  promotion, but a cached mode is correct only if nobody moves the ticket afterwards, and the
  graph lets anyone move it: a gated ticket bounced to `in_progress` returns through `in_review`,
  whose PASS merges into `main`, and nothing records that the gate was ever applied. The read at
  the PASS is one copy in `code-review`, evaluated at the action, and cannot be escaped by a
  move. The cost — a wrong read lands on the merge — is bounded by the rule's own facts: the base
  is on the PR, the label is one call away, and every review column's declared next is
  `awaiting_merge`, so a missed step lands with the human rather than on `main`.
- **Why there is no gate twin.** A lane that differs from its twin only by its exit is a
  transition, not a state, and the platform already gives each column one `next` and one `back`.
  Encoding the exit as a column therefore doubles the lane to express a rule the column cannot
  branch on, and every promotion, bounce and sweep then has to pick the right twin. Two lanes for
  two authors is the honest boundary; a twin per mode is not.
- **Why the boundary scope survives.** `has-human-release` still gates only the PRs whose base
  is `main`; the spec approval is the human merge in every mode (D4). The alternative — every
  ticket PR waits for the human — was rejected because the human already approved the set at the
  spec merge and the integration branch is scratch; it would add N human merges for no new
  decision.
- **Why the release seat gets a lane.** The role existed with no handler selecting it, so its
  procedure lived in the release ticket's body and only that ticket's assignee ever read it. A
  release lane with its own review, whose back target is the release author, gives the procedure
  a contract and the release PR one exit; folding the release into `in_progress` would send a
  review FAIL back to the Implementer's lane and leave the release procedure with no seat that
  reads it.
- **Why the epic gets a state.** An approved epic in `todo` is indistinguishable from one nobody
  has started. `epic_progress` is a state column with no handler, so it changes what the board
  says without adding a dispatch the barrier wake already performs.
- **Why the start is gated, and not the container.** An epic is inert, so opening it early
  is visibility, not work; the spec run is the first durable behaviour, and the slice it
  publishes is what the merge approves. Gating the run rather than the container keeps the
  "epic ASAP" convenience without letting a chat commit to a slice. The platform cannot require
  the answer, so the gate is one copy in the grilling skill, and the freeze at the PR is the
  mechanical half.
- **Why the sweep moves rather than pings.** A stale ticket is a triage problem, and `blocked`
  is the column that owns triage. A mention would start a run and duplicate the dispatch the
  status move already performs.
- **Why one threshold, and no human columns.** Two hours catches a review whose agent run ended
  without a move. Human-handled columns are not swept at all: a merge the owner has not reached
  is not a stalled step, and no agent should un-gate it by moving it to `blocked`. One threshold
  means one rule for the reviewer and the autopilot, not two.
- **Why a conflict is a condition and not a bot.** The platform already stores the fact — a
  linked PR's head has conflicts — so the rule is one continuous condition on the ticket, not a
  scan of every open PR. A scan would need a second autopilot, would re-derive the link every
  hour and would duplicate the sweep's shape; the condition costs one registration per review and
  fires when the fact changes.
- **Why a void PASS goes back through review.** The PASS is head-scoped, so a fix at
  `awaiting_merge` is a new head and merging it would put an unreviewed commit into `main` under
  a PASS that never saw it. The review column is the only carrier that re-reads the delivery
  facts at the new head; the delta bounds the re-review to what the fix changed.
- **Why the drill is before the catalog edits.** A wrong assumption about a member handler or
  the barrier wake is cheap to fix in a throwaway project and expensive to discover after a
  live sync. The drill copies the graph from this spec, so it tests the design, not the file.
- **Why the PR carries the handoff.** A status move carries no payload, but the platform carries
  the link, the head, the checks and the merge state natively, so a second written handoff on the
  ticket duplicated that and is deleted. The PR body stays optional: the diff is the record, and
  a note is for what the diff cannot say — a limit, a judgment call, a review question. An empty
  body is not a finding, or the requirement simply moves from the comment to the body.
- **What "the drift is gone" does not claim.** One copy does not make an agent obey it. The
  measure is structural — one home per rule, one reader — and the drill plus review are the
  behavioural check. A rule that the platform cannot read stays prose by design, and the
  inventory names it as such.
