# Glossary

The vocabulary this catalog uses. Terms are defined once, in the sense the code uses them;
when an issue, spec or commit names a concept, it uses the term here rather than a synonym.

## Catalog

**catalog** — `templates/default.json` plus the assets it names (roles, shared instructions,
labels, skill bindings, the `config-sync` and `stale-sweep` autopilots). It is the only
deployable unit; `just validate` refuses anything but `default`.

**role** — one of the five seats: `general`, `planner`, `implementer`, `reviewer`, `release`.
A role's behavior is `roles/<role>.md`; the shared rules are `shared/instructions.md`.

**shared instructions** — `shared/instructions.md`, the contract every role renders. Capped
by the suite; the caps table in `README.md` is the one home.

**skill binding** — the single role a skill attaches to, declared only in
`templates/default.json`. There is no second role field to drift.

**logical id** — a skill's stable name: the `skills/<logical-id>/` directory and the
manifest's `logical_id`. Sync matches live skills by this name; nothing else identifies one.

**provenance status** — the auditable record in `skills/manifest.json` of where a skill came
from. One of `identical`, `fork`, `rewrite`, `own`. A record, not an enforced byte identity:
Git is the pin, and the skill directory is its file set.

- **identical** — recorded as the pinned upstream file unchanged.
- **fork** — upstream-derived with local edits; the manifest names the upstream skill.
- **rewrite** — local text written from an upstream method; the manifest names that method.
- **own** — no upstream; the catalog's own contract. Carries no `upstream` field.

**upstream pin** — `mattpocock/skills@4ae2317`, the provenance record for every non-`own`
skill. It is not a dependency: nothing fetches it, and a skill is a local file set.

## Sync

**consumer workspace** — a live workspace the catalog is synced into. The same catalog
applies unchanged to any number of them.

**live binding** — what a run resolves at start and never stores: the workspace id, name,
slug and owners (`multica workspace get`, `member list`), the single online Dsh runtime
(`runtime list`), the checkout's `origin` and the app origin. An ambiguous binding refuses the
run.

**workspace url** — `app_url` + `identity.workspace_slug`, rendered once at sync as
`{{workspace_url}}` and the base of every issue reference an agent writes. `app_url` is
operator state: it defaults to `https://multica.ai` and overrides with `--app-url` /
`MULTICA_APP_URL`. Git holds the parameter, never the resolved value.

**sync** — reconcile live objects to the catalog by name: match → update, archived agent →
restore, absent → create. Read-only over Git.

**plan** — the operations and checks a run computes against live state, hashed as
`plan_hash`. `--dry-run` prints it and writes nothing.

**operation** — a planned write: create, update, set or delete.

**check** — a plan entry for an object already matching the catalog. A plan with no operations
and only checks is converged.

**converged** — `status: configured`: zero operations. Git and the workspace are unchanged.

**retirement** — deleting a live object whose declared name is absent from the catalog.
Never inferred from a rename; it is the absence, and it is guarded.

**guard** — the four refusals that block a retirement: an agent that owns open issues, a label
in use, a project-bound workflow, and an autopilot without an explicit retire event in
`migrations/changelog.jsonl`.

**journal** — the untracked record of an applied run, under `.local/config-sync/`
(`CONFIG_SYNC_STATE` moves it). A retry re-plans from live state rather than replaying it.

**lock** — the per-workspace file that stops two concurrent runs; a second run reports the
holder.

**shared hash** — the hash of the resolved catalog bytes a run would import. The readback
covers the same bytes, so the hash names exactly what was deployed.

**sync control** — the `config-sync` autopilot that runs the daily sync. Operator state: a
sync refreshes its title, prompt and assignee only; `just schedule` creates it when missing
and ensures exactly one enabled schedule trigger.

**project workflow** — the `Factory` workflow bound to every live project: an ordered set of
statuses where entering a column hands the issue to that column's handler. Catalog issues
outside a project fall back to the workspace default workflow, whose columns hand off to
nobody.

## Factory

**delivering ticket** — the ticket whose pull request carries the work: the spec child for the
spec PR, the ticket itself for a delivery PR, the release child for the release PR. Its key is
the only key in the PR title and head branch; the epic's key never appears there, and the spec
child's title does not repeat the epic key.

**handoff** — the linked pull request that records the work, followed by the status move that
assigns the issue to the new column's handler and starts that handler's run. The PR's title and
head branch carry the delivering ticket's key, never the epic's; the link is read back
(`multica issue pull-requests`) and the move waits until the PR is listed. The link goes first
and the move last, so the next run can read the work; the move is what dispatches it. An empty
read is the operator's fix and a `blocked` move, never a started lane. The PR body is optional,
and an empty body is not a finding. Nothing advances a ticket when a run ends; the handler makes
the next move. A member handler is assigned and runs nothing.

**handoff gate** — the one question that ends grilling and starts the factory. The Planner
presents the destination and the proposed slice outline, and ends on one question: apply the
chosen mode labels and start stage 1. The labels are `has-human-implementer`,
`has-human-release`, or neither, and they stay the last field; a human mode reads the one human
seat from the workflow's `human` handler and records it on the epic as a readback. Every grilling
produces an epic, so there is no shape field: a single ticket is the smallest epic. Wayfinder is
invoked explicitly and never tied to grilling; grilling may answer a decision inside a wayfinder
ticket, and that answer starts nothing. The epic is created in `backlog` with its stage-1 spec
child inert in `backlog`; the answer is the yes that starts the spec run, and the kickoff moves
the epic to `epic_progress` and the child to `spec_progress`. The change window is the reslice
window, and the slice freezes at the first started child. One prose copy in `skills/grilling`; the
Planner contract names the route.

**planned owner** — the assignee an issue carries from creation: the role promotion will pick,
paired with `--project` at create time. Status entry still reassigns natively, so the planned
owner only has to be right until the first move. Every agent-created issue carries one, and the
Planner is the fallback when the catalog cannot name the seat. The human lane's planned owner is
the live human seat — the member the workflow's `human` handler binds — read at create time; no
ticket is unassigned, and the `human_progress` member handler still binds the member at promotion.
One rule in shared `## Ownership`, read by the publisher's pre-flight and the `spec_review` PASS,
with no human-lane exemption.

**factory mode** — the epic-level choice of who implements, encoded by the
`has-human-implementer` label before the spec run. With neither label the epic is autonomous;
`has-human-implementer` selects the human lane at promotion. `has-human-release` is not a mode
or a promotion input: it is the merge gate the one exit rule in `code-review` reads at each PASS,
from the PR's base and the epic's label. The release child is always the release seat's. Both
labels are the renamed `human-assigned` and `manual-merge`; both are migration-ledger events, so
existing epics keep their labels and their history.

**carrier** — the one home of a rule: a **native carrier** the platform stores or acts on (a
status, a handler, a stage, an issue link, a wakeup, an autopilot or a label), or exactly one
prose copy in the seat that reads the rule. A second copy is a defect; a declared document that
no sync deploys is not a carrier. The rule inventory in the accepted spec is the measured form.

**release lane** — the `release` seat's columns: `release_progress` for the release PR and
`release_review` for the Reviewer's verdict on it. A FAIL returns to `release_progress`; a PASS
applies the exit rule in `code-review`, merging at the reviewed head or landing at
`awaiting_merge` when the base is `main` and the epic carries `has-human-release`. The procedure
lives once in `roles/release.md`; the release ticket carries only its instance.

**stale sweep** — the hourly `stale-sweep` autopilot. It dates a ticket in one of the
reviewer-handled review columns — `spec_review`, `in_review`, `human_review`, `release_review` —
from `issue timeline`, and past two hours comments the age and moves it to `blocked` for triage.
Human-handled columns (`human_progress`, `awaiting_merge`) are never swept: a human merge waits
indefinitely. It replaces the per-issue 90m timer; `task.failed` stays a per-issue wake.

**drill** — a throwaway project and a disposable repository bound to a copy of a workflow, used
to prove a graph change on the platform before the catalog reaches a live project. One drill
epic per mode, one ticket in each lane, both release exits, the epic state, a stale ticket and an
in-flight move, each with its `issue timeline` evidence; the copy, the epics and the project are
archived when it is green.

**spec child** — the epic's stage-1 child that carries the spec pull request, including the
proposed breakdown and the published slice. The PR is headed by the spec child's key and targets
the spec's integration branch. Its merge approves the spec, the breakdown and the set: the
workspace PR rule completes the child, which wakes the Planner to promote the slice. The spec
PR is never linked to the epic.

**integration branch** — the epic's key, forked from `main` at the spec sha, and the base of the
spec PR and of every delivery PR in that spec. It is scratch: unprotected, it deploys nothing,
and the Planner deletes it when it accepts the epic. It is never a pull request's head.

**release branch** — the release child's key, forked from the integration branch at the release
head and the head of the release PR into `main`. The release PR is the only path from the slice's
integration branch to `main`, and the epic's key never heads it.

**slice release** — the final-stage child and the one squash that carries the whole slice onto
`main`. The release PR is its pre-merge gate; release order is the Reviewer's `mergeStateStatus`
read, with the repository's up-to-date requirement as the expected operator state, never an
open-head query or a park. A package release such as release-please is outside the factory and is
not the slice release.

**rewrite/lease** — a rework adds a commit to the same head; a rewrite replaces the head only when
the commits themselves must not remain, on your own PR head, after a fetch, with
`git push --force-with-lease=<remote-ref>:<expected-sha>`, and never with `--force`, `-f`,
`--mirror`, a `+` refspec, `main` or the integration branch. The lease, not a review, is what
stops a rewrite from replacing a head another run pushed in between.

**ticket kind** — delivery or release, the Planner's second promotion input beside the epic's
labels. It is a stage read, not a body marker: the final-stage child is the release ticket and
every other child is delivery; a drill epic's kinds are its own table's, since its diagnostic
stage sits above the release.

**release child** — the final-stage child of a published slice, handled by the release seat in
`release_progress` and reviewed at `release_review`. Its pull request is the release branch →
`main` and merges as one squash commit on `main`; its `done` is the only proof the spec is
released. It is linked to itself only, never to the epic.

**epic_progress** — the epic's state from the kickoff: slice under way. The epic is created in
`backlog` and moved here when the kickoff starts the stage-1 spec child; it stays here until the
Planner's acceptance moves it to `done` on the release evidence. It has no handler, so neither
move dispatches a run.

**branch-scoped `done`** — a child's `done` means delivered and reviewed on the integration
branch; the epic's `done` means the release squash is on `main`, and only the Planner's acceptance
grants it.

**proposed breakdown** — the ticket list and blocking edges carried by the spec pull request.
It is reviewed with the spec, and the merge that approves the spec approves the breakdown. The
spec run publishes the children in `backlog` before the merge that approves them, so the set is
final when that merge is reviewed; the merge is what starts them. A revision PR carries a
revised set, and its own merge approves that set.

**started child** — a child in any status but `backlog`, `todo`, `done` or `cancelled`. The first
started child after the spec merge closes the reslice window and latches the freeze. `done` is
not a started status, but a done child proves the freeze had already started; `blocked` is
started, because the child was promoted and the set was committed to execution.

**reslice window** — the one period a change is made in place: while the spec pull request is
unmerged, or after its approval merge while no child has started. The Planner adds a commit to
the open pull request's head — its number, link and body survive — or, only when the commits
themselves must not remain, leases a rewrite of that head; once the merge has landed the Planner
opens one revision PR on the same spec child, rewrites the child set and bodies, and returns the
child to `spec_review` for a fresh PASS. No second spec PR is open at once, and the window closes
at the first started child.

**frozen slice** — a slice whose spec has merged and whose first child has started. The freeze is
a latch: once true it holds for the rest of the slice's life. A real change is a new epic; the
old epic runs to its release, the new epic owns the change, and the affected acceptance is
recorded as superseded and cited.

**revision PR** — the spec pull request that carries a reslice after the approval merge while the
slice is idle. It targets the integration branch, is reviewed at `spec_review`, and its merge
re-approves the revised spec and set; it reopens the same spec child and is not a second epic.

**superseded** — an acceptance criterion the old epic no longer carries because a later epic owns
the change. It is recorded and cited in the old epic's acceptance, never silently dropped; the
old epic can still close on the criteria it kept.

**expected snapshot** — the live state an approved spec declares that acceptance should find:
names, counts and shape, recorded as an expectation, not as a claim that live state is current at
read time.

**executed set** — the set the delivering run actually observed when it ran the acceptance,
reported on the ticket with the commit SHA and the evidence. The release verifies it against the
expected snapshot; a delta is reported, never inferred or quietly absorbed.

**human lane** — the human's columns: `human_progress` for implementation, `human_review` for
the Reviewer's verdict, and `awaiting_merge` for the human merge that approves a spec or
completes a `has-human-release` delivery. Every review declares `awaiting_merge` as its next, so
the unattended advance is the human; the PASS applies the exit rule. Violet; `human_progress`
and `awaiting_merge` are member-handled, so entering them assigns the human and starts no run.

**declared status** — a custom status a workflow step creates through `new_status`, including
its name, category, icon and colour. Sync creates a missing one with the workflow write,
repairs a present one through `multica issue-status`, and reads every declared field back.
