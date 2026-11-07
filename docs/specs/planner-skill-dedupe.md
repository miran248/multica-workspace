# Planner skill dedupe: retain, merge or retire

Proposed. This revision awaits the approval-owner comment on MIR-121; no catalog edit
happens before it. Decisions are the owner's answers in the MIR-121 grilling thread
(2026-11-07): *retire custom ones in favor of upstream skills*, Q5 (a), Q4 (a).

## Problem Statement

Planner carries fourteen skills for nine jobs. Four pairs compete for the same job —
`spec-drafting` against `to-spec`, `ticket-slicing` against `to-tickets`,
`decision-interview` against `grilling`, and the two dispatcher aliases `grill-me` and
`grill-with-docs` against `grilling` itself — and two of the custom members contradict the
role contract: they publish a spec or a ticket set without the approval-owner comment.
Live dispatch reads descriptions only (every workspace skill reports `config: {}`), so a
short alias with a "relentless interview" description competes with the method it forwards
to; nothing in the catalog, the role prompt or the tests tells the agent which one to load.
One adjacent method, `wayfinder`, is unrunnable as declared: it reads five `wayfinder:*`
labels the catalog never defines. The repo is also carrying local restatements of upstream
methods that the same owner decision retires.

## Solution

One entry per job, and the upstream fork is the survivor in every collision. The custom
entry's unique content — the approval gate, the artifact home, the Multica publication,
the decision ledger — moves into the survivor, and the custom text is deleted in the same
change. The two aliases go: a preset is what the human types, not a method, and
`grilling`'s description already claims the trigger phrases. `wayfinder` stays and the
catalog declares the five labels it reads.

Planner goes from fourteen bound skills to nine, the catalog from twenty-one skills to
sixteen. Every retirement is atomic: directory, manifest entry and template binding in one
change, because the resolver already asserts the three sets are equal.

## User Stories

1. As the approval owner, I want one Planner entry per job, so no run has to guess between two descriptions for the same method.
2. As the approval owner, I want a spec to stop at my approval comment, so no skill can publish approved-looking work behind my back.
3. As the approval owner, I want the ticket breakdown presented as one approval packet, so one comment approves the spec and the tickets.
4. As Planner, I want the ledger discipline inside `grilling`, so a session keeps its settled decisions without a second interview entry.
5. As Planner, I want `to-spec` and `to-tickets` to carry the workspace's gate and artifact contract, so the method I load cannot contradict the role I hold.
6. As Planner, I want `to-tickets` to publish Multica children with parent, stage, assignee and blocking edges, so the child itself is the handoff.
7. As Planner, I want `wayfinder` to read labels the catalog actually declares, so a multi-session effort can start without an operator inventing labels.
8. As a maintainer, I want each retirement to be one atomic change, so `just validate` cannot pass on a binding that outlives its directory.
9. As a maintainer, I want provenance to stay an auditable record, so retiring a fork is a reversible one-file port from the pinned upstream commit.
10. As a maintainer, I want the guardrail test to catch a dead seat name and a duplicate description, so the next duplicate is refused by the suite, not by review.
11. As a maintainer, I want NOTICE, the README and the pinned counts to match the tree, so the catalog has one arithmetic.
12. As a future agent, I want the nine Planner entries to be the only Planner methods, so the catalog stays legible at a glance.

## Implementation Decisions

**D1 — The fork survives, the local restatement is retired.** Each survivor is already the
method at full depth; the custom entry is a shorter restatement of the same job. The
survivor wins because the method, its template and its vocabulary stay upstream-auditable,
and cutting it back to a twelve-line contract is cheaper than rewriting a fork away from
upstream. The rule is applied consistently: all three `own` entries on Planner
(`spec-drafting`, `ticket-slicing`, `decision-interview`) are retired, and so are both
`identical` aliases (D4).

**D2 — The approval gate is the role contract's, and no survivor may contradict it.**
`roles/planner.md` already says one approval-owner comment approves the spec and the
tickets. `to-spec` and `to-tickets` are edited to obey it: a provisional draft in Git, the
exact revision and breakdown presented for the comment, publication only after it. The
publish step is deleted, not ported into another entry.

**D3 — Artifacts keep one home.** The spec is a Git document (`docs/specs/<change>.md`);
Multica owns tickets, approval records and the published graph. `to-spec` never creates the
spec as a tracker issue. `to-tickets` publishes child issues with `--parent`, `--stage` and
`--assignee`; the CLI exposes no dependency object, so blocking edges are a `Blocked by`
section in the child's body. The child's assignee is the handoff — the dead `Coordinator`
line has no successor and is deleted with its entry.

**D4 — A dispatcher alias is a preset, not a method.** `grill-me` is one line that calls
`grilling`; `grill-with-docs` is two lines that call `grilling` and `domain-modeling`.
Both are `identical` upstream, but "prefer upstream" decides survivors among methods, not
presets; on description-only dispatch each adds a competing description and a second load.
Both are retired. `grilling` gains the one composition sentence, and its description keeps
claiming the trigger phrases.

**D5 — `grilling` absorbs the ledger.** The ledger (question, prerequisites, accepted
answer or evidence, remaining uncertainty), the no-reopen rule, and "a completed interview
is distinct from approval" move into `grilling`. The ledger is a discipline inside a round,
not a second method.

**D6 — `wayfinder` stays, and the catalog declares its five labels.** The defect is five
missing label entries, not the method, and it is the only multi-session planning method
Planner has. Catalog label keys are schema-constrained to
`^[a-z0-9]+(?:-[a-z0-9]+)*$`, so a key cannot contain the colon the method reads; keys are
`wayfinder-map` … `wayfinder-task` and the label *names* keep `wayfinder:map` … .
`triage: false` on all five, like the two epic flags: sync matches live labels by name, and
a wayfinder label is a decision, never ordinary triage. All five are created with
`triage: false`, so the generated triage mapping (seven labels) does not change.

**D7 — Every retirement is atomic, and its provenance record is kept.** Deleting a
directory without deleting its manifest entry fails the resolver's set equality, and there
is no unbound shelf to park a method on since MIR-120. The changelog stays untouched:
undeclared skills are retired by absence, and no label is renamed or retired. Cut entries
are reversible one-file ports from `mattpocock/skills@4ae2317`.

**D8 — Two independently verifiable PRs.** The dedupe (retirements, the three survivor
endings, counts, NOTICE, README, guardrail assertions) is one PR because the pinned skill
count and provenance totals change once for all five retirements. The five wayfinder labels
are the second PR: a different surface, independently verifiable, no code path in common.
Neither blocks the other.

**D9 — No method text moves into the role contract.** `roles/planner.md` is at its 130-word
cap and `shared/instructions.md` at 199 of 200, so each survivor carries its own delta. The
brevity tests stay as they are.

## Testing Decisions

Tests assert the catalog contract through the resolver and the sync fixture, never the
bytes of a given file, matching the existing suite.

- **Resolver invariants already decide the retirements.** The bound set equals the manifest
  set and the directories on disk; a bound skill with no directory, and a directory with no
  manifest entry, both refuse offline. The five deletions must therefore be complete.
- **The existing reference scan stays untouched.** Every `Skill tool with "x"` and `` `/x` ``
  reference in any skill body must resolve. The retired entries introduce no reference.
- **Two new assertions extend it.** (a) All descriptions across the bound set are distinct,
  case-insensitively — duplicate descriptions make dispatch a coin flip. (b) No skill body
  names a retired seat (`Coordinator`); the role contracts already have this guard, the
  skills do not.
- **Label coverage is behavioural.** A fresh sync creates fourteen labels by name and
  converges; a same-name update keeps identity; the key→name split is asserted explicitly
  rather than by `name === key`; the "unused undeclared label is retired" fixture uses a
  name the catalog does not declare (it currently uses `wayfinder:map`, which becomes
  declared). The generated triage mapping is unchanged: seven triage labels.
- **Counts are pinned, not inferred.** Bound skills 16, provenance `identical` 2, `fork` 7,
  `rewrite` 4, `own` 3. README and NOTICE state the same arithmetic.
- **Prior art.** `tests/skills.test.js` (manifest, provenance, reference scan, live import),
  `tests/labels.test.js` and `tests/sync.test.js` (label create/update/retire fixtures),
  `tests/brevity.test.js` (caps untouched).

## Acceptance criteria

1. `just validate` exits 0 on the merged tree.
2. `just test` is green; every pinned count reads the post-change value and the two new
   assertions are present.
3. Planner's binding is exactly `grilling`, `research`, `domain-modeling`, `prototype`,
   `to-spec`, `to-tickets`, `codebase-design`, `improve-codebase-architecture`,
   `wayfinder` — nine entries, and the bound/manifest/directory sets are equal.
4. The five retired directories are gone, no manifest entry or binding names them, and no
   skill body references a retired skill.
5. Provenance is `identical` 2, `fork` 7, `rewrite` 4, `own` 3, total 16; NOTICE and the
   README name the same sets and counts.
6. `to-spec` no longer publishes or labels a spec and states the Git home and the
   approval-owner gate; `to-tickets` publishes Multica children with parent, stage, assignee
   and `Blocked by` edges and labels only after approval; `grilling` carries the ledger,
   the no-reopen rule, "interview is not approval" and the `domain-modeling` composition.
7. `grilling`'s design-tree, rounds and frontier text is byte-verbatim; `to-spec`'s seven
   sections, seam check and no-file-paths rule and `to-tickets` steps 1–3 are byte-verbatim.
8. Fourteen issue labels resolve: the seven triage labels and their generated mapping
   unchanged, plus five `wayfinder-*` keys whose names are `wayfinder:*` with
   `triage: false`; a fixture sync creates all fourteen and converges.
9. `roles/`, `shared/instructions.md` and `migrations/changelog.jsonl` are unchanged, and
   the brevity caps still pass (planner 130, shared 199).
10. The two PRs are independent: each one is green alone, and neither touches the other's
    surface.

## Out of Scope

- The three remaining local contracts outside Planner — `agent-retro` (general),
  `module-design` and `pr-writing` (implementer) — including the cross-seat `module-design`
  / `codebase-design` collision. They follow in a separate ticket, opened as a sibling
  (MIR-122), under their own grilling, spec and approval.
- The seat roster, role prompts, shared instructions, workflows and autopilots are
  unchanged.
- The upstream pin does not advance; it stays `4ae2317` and no cut entry is re-imported.
- Live deployment: the merge reaches every workspace at its next scheduled sync; that
  read-back is the sync's own journal, not a ticket in this slice.

## Further Notes

- Why the aliases go while "prefer upstream" holds: the rule selects the method among
  colliding methods. An alias is not a second method; it is a preset that forwards to one,
  and after the merge `grilling` is the only place the trigger language belongs.
- Retiring a fork is reversible: the pinned commit still holds the file set, and `NOTICE`
  records the derivation. Provenance is a record, not a dependency.
- There is no usage evidence and none is invented: skill records expose no usage field and
  runs do not record skill calls. These decisions are contract and intent.
- The exact-path change set is an appendix rather than an implementation decision because
  the deliverable here *is* the repository's declared layout; the to-spec rule against file
  paths protects product specs from going stale, and does not apply to the layout itself.

## Appendix: exact change set

| Path | Change |
| --- | --- |
| `skills/spec-drafting/`, `skills/ticket-slicing/`, `skills/decision-interview/` | delete the directory (one `SKILL.md` each, no `agents/` files) |
| `skills/grill-me/`, `skills/grill-with-docs/` | delete the directory (`SKILL.md` and `agents/openai.yaml` each) |
| `skills/manifest.json` | remove the five entries; 16 entries: identical 2, fork 7, rewrite 4, own 3 |
| `templates/default.json` → `agents.planner.skills` | 14 → 9, in the order listed in acceptance 3 |
| `templates/default.json` → `labels` | add `wayfinder-map` / `wayfinder-research` / `wayfinder-prototype` / `wayfinder-grilling` / `wayfinder-task`, names `wayfinder:map` etc., `triage: false`, colors `#6366f1` / `#14b8a6` / `#a855f7` / `#ec4899` / `#64748b`; descriptions: map "Wayfinder map: the destination and the decisions-so-far index for a multi-session effort", research "Wayfinder ticket: investigation that resolves a decision", prototype "Wayfinder ticket: a throwaway prototype that resolves a decision", grilling "Wayfinder ticket: a live interview that resolves a decision", task "Wayfinder ticket: an execution task carried inside the map" |
| `skills/to-spec/SKILL.md` | description loses the tracker-publish clause; step 3 writes `docs/specs/<change>.md`, keeps the draft provisional, presents the exact revision and breakdown for the approval-owner comment, and hands the approved revision to `to-tickets`; no tracker issue is created. The seven sections, the seam check and the no-file-paths rule are byte-verbatim |
| `skills/to-tickets/SKILL.md` | description names Multica publication after approval; step 4 becomes the approval packet; step 5 publishes child issues with `--parent`, `--stage`, `--assignee`, `Blocked by` sections and the post-approval `ready-for-agent` label, and the local-file / GitHub / Linear branches and the local template are deleted. Steps 1–3 and the issue template are byte-verbatim |
| `skills/grilling/SKILL.md` | one ledger/no-reopen paragraph and one "interview is not approval" + `domain-modeling` composition paragraph; the design-tree, rounds and frontier text is byte-verbatim |
| `NOTICE` | `identical` line drops to `codebase-design, prototype`; local-contracts line drops to `agent-retro, module-design, pr-writing`; `fork` line unchanged |
| `README.md:62` | "twenty-one bound methods" → "sixteen bound methods" |
| `tests/skills.test.js` | bound 21 → 16 (twice); provenance counts → identical 2, fork 7, rewrite 4, own 3; add description-uniqueness and no-retired-seat assertions |
| `tests/labels.test.js` | label-class title seven triage + seven flags; key list gains five; `name === key` becomes an explicit key→name map; four `9`s → 14; the undeclared-label fixture moves off `wayfinder:map` |
| `tests/sync.test.js` | `f.state.labels.length` 9 → 14 |
| `migrations/changelog.jsonl` | unchanged: no skill rename, no label retire |

## Ticket breakdown (proposed; created only after the approval-owner comment)

| Stage | Ticket | Outcome | One PR |
| --- | --- | --- | --- |
| 1 | Retire the duplicates and align the survivors with the Planner gate | Planner binds the nine survivors; five directories, their manifest entries and bindings are gone; `to-spec`, `to-tickets` and `grilling` carry the moved contract; counts, NOTICE, README and the guardrail assertions match; `just validate && just test` green | yes |
| 1 | Declare the five wayfinder labels | The catalog declares `wayfinder-map` … `wayfinder-task` with the `wayfinder:*` names and `triage: false`; the label and sync fixtures converge at fourteen; `just validate && just test` green | yes |

Both are unimplemented until the approval-owner comment on MIR-121. Implementation and
review follow the normal loop: implementer to `in_review`, reviewer accepts the exact head
and merges on PASS, MIR-121 accepts when both children close.
