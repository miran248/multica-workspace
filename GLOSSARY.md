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
