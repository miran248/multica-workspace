# Glossary

The vocabulary this catalog uses. Terms are defined once, in the sense the code uses them;
when an issue, spec or commit names a concept, it uses the term here rather than a synonym.

## Catalog

**catalog** — `templates/default.json` plus the assets it names (roles, shared instructions,
labels, document paths, one autopilot). It is the only deployable unit; `just validate`
refuses anything but `default`.

**role** — one of the five seats: `general`, `planner`, `implementer`, `reviewer`, `release`.
A role's behavior is `roles/<role>.md`; the shared rules are `shared/instructions.md`.

**shared instructions** — `shared/instructions.md`, the contract every role renders. Capped
at 200 words by the suite.

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
(`runtime list`) and the checkout's `origin`. An ambiguous binding refuses the run.

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

**handoff** — the comment that records the work, followed by the status move that assigns the
issue to the new column's handler and starts that handler's run. The comment goes first and the
move last, so the next run can read the record; the move is what dispatches it. Nothing advances
a ticket when a run ends; the handler makes the next move. A member handler is assigned and runs
nothing.

**factory mode** — the epic-level choice of who implements and who merges, encoded by the
`human-assigned` and `manual-merge` labels before the spec is approved. With neither label the
epic is autonomous. `human-assigned` without `manual-merge` is human implementation with agent
merge; `manual-merge` alone is agent implementation with a human merge; both are human
implementation and merge.

**spec child** — the epic's stage-1 child that carries the spec pull request, including the
proposed breakdown. Its merge is the approval of both: the workspace PR rule completes the
child, which wakes the Planner to slice. The spec PR is never linked to the epic.

**proposed breakdown** — the ticket list and blocking edges carried by the spec pull request.
It is reviewed with the spec, and the merge that approves the spec approves the breakdown;
nothing is published from it before that merge.

**human lane** — the human's columns: `human_progress` for implementation, `human_review` for
the Reviewer's verdict on it, and `awaiting_merge` for the merge that approves a spec or
completes a `manual-merge` delivery. Violet; `human_progress` and `awaiting_merge` are
member-handled, so entering them assigns the human and starts no run.

**declared status** — a custom status a workflow step creates through `new_status`, including
its name, category, icon and colour. Sync creates a missing one with the workflow write,
repairs a present one through `multica issue-status`, and reads every declared field back.
