# Catalog skill cleanup: retire the last three local contracts

Proposed. This revision awaits the approval-owner comment on MIR-122; no catalog edit
happens before it. The decisions are the owner's answer in the MIR-122 grilling thread
(2026-11-07): *same thing as in other ticket, retire custom skills in favor of upstream
skills* — the rule MIR-121 settled, applied to all three entries here, which is Q1 (a),
Q2 (a) and Q3 (a) of round 1.

## Problem Statement

General and implementer carry the catalog's last three `own` entries: `agent-retro`,
`module-design` and `pr-writing`. Each is a shorter restatement of a method the catalog
already vendors from `mattpocock/skills@4ae2317` — `retro`, `codebase-design` and `pr` —
so two rules for one job survive in the repo. Live dispatch reads descriptions only, so
nothing tells a run which of the two to load. MIR-121 removed Planner's three `own`
entries and the two presets; these three are what is left, and leaving them keeps two
rules in one repo.

Three facts make the retirement nontrivial. `module-design` is a cross-seat restatement:
`codebase-design` is already bound to Planner, `improve-codebase-architecture` (Planner)
calls it, and one role per skill forbids a second binding. The role caps are full, so
moved content has no free seat line except the implementer's. And each retirement moves
the pinned provenance arithmetic, `NOTICE`, the README and the test fixtures.

## Solution

Delete the three local contracts and let the upstream method be the survivor in each
case. `retro` replaces `agent-retro` on general and `pr` replaces `pr-writing` on
implementer, each as a fork carrying one local delta for the content that is genuinely
this workspace's: the admission and policy gate, and the Multica ownership contract. Both
are vendored with their upstream support files. `module-design` gets no replacement
binding — the method is `codebase-design`, which stays on Planner — and the two checks the
implementer contract was missing move into the contract itself.

The catalog goes from sixteen bound skills to fifteen, `own` from three to zero: two
`identical`, nine `fork`, four `rewrite`. Every retirement is atomic — directory, manifest
entry and template binding in one change — because the resolver asserts the three sets are
equal.

## User Stories

1. As the approval owner, I want every catalog skill to be upstream-derived, so there is one rule per job in the repo.
2. As General, I want `retro` to carry the admission and policy gate in the method I load, so a retrospective cannot expand access or approve its own proposals.
3. As General, I want the retrospective description to exclude ordinary requests and generic session retros, so dispatch does not offer it for the wrong job.
4. As implementer, I want `pr` to write the PR body at upstream depth and also the review, parent and production handoff, so one skill covers the handoff the ticket actually needs.
5. As implementer, I want the PR contract to require criterion-to-evidence coverage and a fresh revision on every head change, so a review fix cannot inherit the old verdict.
6. As implementer, I want caller burden and locality of change named in my contract, so the module checks survive the retirement without a second method.
7. As a maintainer, I want each fork's local delta to be one visible section, so a future upstream bump can be read as a diff rather than a rewrite.
8. As a maintainer, I want the provenance counts, `NOTICE` and the README to agree with the tree, so the catalog has one arithmetic.
9. As a maintainer, I want a test that refuses a `own` entry, so a local contract cannot quietly reappear.
10. As a future agent, I want the three retired ids to be gone from every binding, directory and body, so no run loads a skill that no longer exists.

## Implementation Decisions

**D1 — Retire the local entry; keep the upstream method.** All three `own` entries go in
this change. `retro` and `pr` are bound in their places as forks; `module-design` gets no
replacement binding. The deep-module method is `codebase-design`, which stays on Planner:
MIR-121 decision A put it there, and `improve-codebase-architecture` — bound to Planner —
calls it at `skills/improve-codebase-architecture/SKILL.md:13` and `:71` and cites
`/codebase-design` three more times in its HTML report, so moving the binding leaves the
Planner's architecture method calling a skill its seat does not hold. The one-role rule
(`scripts/config.js:236`) forbids binding it to both seats.

**D2 — `pr` is a fork with one Multica handoff delta.** Upstream's template, sections and
guidance stay byte-verbatim. The delta is the description (it must also route the review,
parent and production handoff) and one closing section carrying what the local entry
uniquely held: the originating ticket or spec and the exact head, criterion-to-evidence
coverage, checks run and not run, risks, blockers and next owner, the revision re-review
rule, delivery to the required destination, and "notification is not approval or
deployment evidence". Upstream's `metadata.credits` block and the vendored `CREDITS.md`
replace the local attribution paragraph; `agents/openai.yaml` is vendored with the body.

`handoff` does not cover this half and is not bound: it compacts a conversation into a
temporary file for a fresh agent, while the decision handoff is the five-line
`templates/handoff.md` (already the catalog's `documents.handoff`), the Multica artifacts
and the status move, which `shared/instructions.md` owns.

**D3 — `retro` is a fork with the workspace gate in its body.** The admission and policy
gate is a constraint on how the method runs, not generic workspace behaviour, and neither
contract has the words: `roles/general.md` is at 121/130 and carries the loop's routing,
`shared/instructions.md` is at 199/200. So the gate stays with the method. Upstream's
step 1 calls `writing-for-agents`, which this catalog does not vendor, and step 2 searches
raw session logs, which the gate forbids; both are replaced by the admitted evidence
index. The prose pointer to `writing-for-agents` in the References section is dropped for
the same reason — the reference scan sees only `Skill tool with "x"` and `/x`, so nothing
would catch a dead prose pointer. The description excludes ordinary General requests and
generic session retrospectives, which keeps its boundary with the General contract's
routing.

**D4 — The caps hold with one seat line.** `roles/implementer.md` goes from 123 to 129 of
130 words: its load line names the three retained skills, and the narrow-interface line
gains "weigh caller burden and locality of change". That is a seat rule, not a method —
the line already states the interface discipline, and the two checks are what the seat was
loading `module-design` to get. Behaviour-level testability needs no line: `tdd` is bound
to the implementer and carries it. `roles/general.md` (121), `roles/planner.md` (130) and
`shared/instructions.md` (199) are unchanged.

**D5 — Retire is atomic, and the ledger stays untouched.** Directory, manifest entry and
binding are removed in one change; unbinding alone fails `just validate`, and there is no
unbound shelf to park a method on. No `migrations/changelog.jsonl` line: undeclared skills
are retired by absence (`scripts/deployment.js:247`), no label, agent or autopilot is
retired, and MIR-121 left the ledger untouched for the same edit. The ids follow upstream
(`retro`, `pr`), so a sync deletes the two old live skills and imports the new ones under
the upstream names; nothing binds or references a live skill id.

**D6 — Provenance moves once.** `own` 3 → 0, `fork` 7 → 9, `identical` 2 and `rewrite` 4
unchanged, total 16 → 15. `NOTICE` drops its "Local contracts with no upstream" line and
adds `retro` and `pr` to the `fork` line; `README.md:62` says fifteen. The `own` status
stays a legal manifest value — it is a record, not a removed capability — but no entry may
carry it (D7).

**D7 — The guardrail is explicit, and the fixtures move.** With no `own` entry left,
`tests/skills.test.js`'s `own with upstream` drift case has nothing to mutate: it flips a
`fork` entry to `own` while keeping its upstream, which the resolver refuses with the same
provenance error. The pinned counts become `identical` 2, `fork` 9, `rewrite` 4, `own` 0,
plus an assertion that the `own` set is empty — the guarantee that no local contract
reappears. Every fixture that seeds `agent-retro` moves to `retro` (`missing()`'s default
key, the outside-the-manifest case, the two-role case, the readback case), because the
fixture seeds live skills from the catalog directories and `readSkill` would throw on a
directory that no longer exists.

**D8 — One PR.** The three retirements, the two forks, the seat line, the counts,
`NOTICE`, the README and the test fixtures change one set of pins; per-entry PRs would
edit the same assertion three times. This is one ticket and one PR.

## Testing Decisions

Tests assert the catalog contract through the resolver and the stateful sync double, never
the bytes of a given file, matching the existing suite.

- **The resolver decides the retirements.** Bound, manifest and directory sets must be
  equal; a directory without a manifest entry and a binding without a directory both
  refuse offline. The three deletions must therefore be complete, and the two new
  directories must be declared and bound.
- **The reference scan stays untouched.** Every `Skill tool with "x"` and `` `/x` ``
  reference in any skill body must resolve; the forks introduce no dangling invocation.
  This is also why `retro`'s step 1 cannot keep the `writing-for-agents` call.
- **The guardrail grows one assertion.** Descriptions across the bound set stay distinct
  (the two new descriptions are unique), no body may name a retired seat, and the manifest
  may carry no `own` entry.
- **Deployment is behavioural.** A fixture sync imports `retro` with `agents/openai.yaml`
  and `pr` with `CREDITS.md` and `agents/openai.yaml`, binds them by id, and deletes the
  live `agent-retro` and `pr-writing` by absence; the existing import, update, resume and
  stale-file fixtures already cover the machinery once their ids are re-pointed.
- **Caps are pinned by the suite, not by review.** `tests/brevity.test.js` is unchanged:
  implementer 129 ≤ 130, shared 199 ≤ 200, planner 130 ≤ 130.
- **The arithmetic is pinned.** Bound skills 15; provenance `identical` 2, `fork` 9,
  `rewrite` 4, `own` 0; `NOTICE`, the README and the tests state the same values.
- **The change set was rehearsed.** The appendix was applied to a scratch copy of
  `a802d4b` (not committed, no catalog byte on this branch): `just validate` clean,
  `just test` 104/104, implementer at 129/130 words.

## Acceptance criteria

1. `just validate` exits 0 and `just test` is green on the merged tree.
2. General binds exactly `retro`, `setup-multica-project`; implementer exactly
   `diagnosing-bugs`, `tdd`, `pr`; planner, reviewer and release are unchanged; the bound,
   manifest and directory sets are equal at fifteen.
3. `skills/agent-retro/`, `skills/module-design/` and `skills/pr-writing/` are gone, no
   manifest entry or binding names them, and no skill body references a retired skill.
4. `skills/retro/` is upstream `engineering/retro` with exactly the D3 deltas and carries
   `agents/openai.yaml`; `skills/pr/` is upstream `engineering/pr` with exactly the D2
   delta and carries `CREDITS.md` and `agents/openai.yaml`.
5. Provenance is `identical` 2, `fork` 9, `rewrite` 4, `own` 0 (total 15); a test asserts
   the `own` set is empty; `NOTICE` and the README state the same arithmetic.
6. `roles/implementer.md` names the three retained skills and the caller-burden and
   locality check, and stays at 129 of 130 words; `roles/general.md`, `roles/planner.md`,
   `shared/instructions.md` and `migrations/changelog.jsonl` are unchanged.
7. The upstream pin stays `4ae2317` and each fork is byte-verbatim outside the deltas
   listed in the appendix.

## Out of Scope

- Planner's four pairs and the two aliases — MIR-121, merged as `a802d4b`.
- The seat roster, role prompts other than the implementer's load line, workflows,
  autopilots and the upstream pin.
- Moving `codebase-design` off Planner or rewriting `improve-codebase-architecture` to
  inline the vocabulary (round 1's Q1 (c)); the one-role rule and the Planner call sites
  decide against it.
- Re-importing `setup-ts-deep-modules`: it is a TypeScript dependency-cruiser installer,
  user-invoked, and it calls `codebase-design` for the vocabulary rather than carrying the
  method — a setup preset, not a method.
- Live deployment: the merge reaches every workspace at its next scheduled sync; the sync
  journal is its own read-back, not a ticket in this slice.

## Further Notes

- **What `module-design` carried, and where each piece goes.** The deep-module vocabulary,
  the interface-is-everything framing and the design-it-twice pattern are upstream
  `codebase-design`, retained on Planner. Caller burden and locality of change move into
  the implementer contract. Behaviour-level testability is `tdd`. The implementer no
  longer has a module-design method to load; the decision accepts that, because the
  method's home is the planner's architecture work and the seat keeps the checks it was
  actually using. If a future ticket needs a module-design method on the implementer, it
  cannot be a second binding of `codebase-design`; it would be a rewrite, and this spec's
  rule is that a rewrite needs the same approval.
- **Why the gate stays in `retro` while the module checks moved.** The module checks are
  upstream-derived vocabulary and a seat rule; the admission gate is a constraint on how
  this workspace runs a retrospective and has no upstream home. Unlike MIR-121's aliases,
  it is not a preset — it changes what the method may do.
- **`pr`'s two references are the project's, not vendored files.** "Use the user's domain
  language from `GLOSSARY.md`" and the `AGENTS.md`/`CODING_STANDARDS.md` list in `retro`'s
  Files reference describe the repository the method runs in; they are not catalog files,
  and not every repo has them. They stay verbatim, like the existing
  `improve-codebase-architecture` glossary references.
- **Reversibility.** A retired fork is a one-file port from the pin; a retired `own` entry
  is gone for good, which is the point of the decision. `NOTICE` records the derivation of
  what remains, and the pin still holds the upstream file sets.
- **Why the ids change.** A fork takes its upstream id everywhere else in this catalog
  (`code-review`, `grilling`, `to-spec`); `agent-retro` → `retro` and `pr-writing` → `pr`
  keep that rule. The live skill ids change on the next sync, and nothing references them:
  bindings are by name, and the changelog records renames, not names.

## Appendix: exact change set

| Path | Change |
| --- | --- |
| `skills/agent-retro/`, `skills/module-design/`, `skills/pr-writing/` | delete each directory (one `SKILL.md` each; no support files) |
| `skills/retro/` | new: upstream `engineering/retro` `SKILL.md` with the D3 deltas, plus `agents/openai.yaml` verbatim |
| `skills/pr/` | new: upstream `engineering/pr` `SKILL.md` with the D2 delta, plus `CREDITS.md` and `agents/openai.yaml` verbatim |
| `skills/manifest.json` | remove the three `own` entries; append `{"logical_id": "retro", "provenance": {"status": "fork", "upstream": "retro"}}` and `{"logical_id": "pr", "provenance": {"status": "fork", "upstream": "pr"}}`; 15 entries: identical 2, fork 9, rewrite 4, own 0 |
| `templates/default.json` → `agents.general.skills` | `["retro", "setup-multica-project"]` |
| `templates/default.json` → `agents.implementer.skills` | `["diagnosing-bugs", "tdd", "pr"]` |
| `roles/implementer.md` | line 3 gains `; weigh caller burden and locality of change` before `; no speculative abstraction`; line 5 becomes `- Load diagnosing-bugs, tdd or pr as applicable.`; 123 → 129 words |
| `NOTICE` | `fork` line gains `retro, pr`; the "Local contracts with no upstream" line is deleted |
| `README.md:62` | "the sixteen bound methods" → "the fifteen bound methods" |
| `tests/skills.test.js:22-23` | bound 16 → 15 (both pins) |
| `tests/skills.test.js:36` | counts `identical` 2, `fork` 9, `rewrite` 4, `own` 0; add `assert.deepEqual(manifest.skills.filter(entry => entry.provenance.status === 'own'), [])` |
| `tests/skills.test.js:114` | the `own with upstream` drift case flips a `fork` entry's status to `own` instead of finding an `own` entry |
| `tests/skills.test.js:11, 128, 135, 201` | the fixture key, the outside-the-manifest case, the two-role case and the readback case move from `agent-retro` to `retro` |
| `migrations/changelog.jsonl` | unchanged: no rename, no authorized retirement |

### `skills/retro/SKILL.md` — the deltas from upstream

Description:

```yaml
description: "Conduct a retrospective on admitted Agent Improvement evidence; not an ordinary General request or a generic session retro."
```

A `## Workspace gate` section after the introduction, before `## Steps`:

```markdown
Read only the admitted question, the pinned Agent Improvement policy, the sanitized
evidence index and prior decisions. Reuse supplied citations; name missing information.
The policy's sampling, time and byte ceilings remain binding: loading this method permits
no additional sampling, provider logs, other workdirs or expanded access. Rank at most two
proposals by full-process token savings, including all-agent overhead and collateral
ordinary-General costs; worker savings alone do not establish benefit. A missing check
becomes a candidate only with relevant evidence. Keep safety, correctness, access and
ownership intact. General cannot approve or implement its own suggestions: instruction
edits, deployments and delivery work require the existing exact spec/ticket decision and
routing. Return complete proposals, or no-change/incomplete with citations, gaps and next
owner. Exclude ordinary General requests and generic session retrospectives.
```

Steps 1–2 replaced by one step (renumbering the remaining two):

```markdown
1. Read the primary sources for the session the user specifies: the admitted sanitized evidence index, the pinned Agent Improvement policy and prior decisions. If the user doesn't specify a session, default to the current one. Do not search session logs, other workdirs or provider logs.
```

The Files reference's last sentence (` Follow the advice in the \`writing-for-agents\` skill.`) is dropped. Every other byte, including the seven category bullets and both reference sections, is upstream's.

### `skills/pr/SKILL.md` — the delta from upstream

Description:

```yaml
description: "Write a PR body, or a revision-specific review, parent or production handoff, from evidence and a next action."
```

One section appended after `## Sections`, with the template, sections and guidance otherwise byte-verbatim:

```markdown
## Multica handoff

Link the originating ticket or spec and the exact PR head. Map each approved acceptance
criterion to the evidence that satisfies it. State checks run and not run, unresolved
risks, blockers and the next owner or action; keep implementation's own checks distinct
from Reviewer acceptance. A review fix changes the head: name the new revision and request
fresh independent acceptance rather than inheriting the old verdict. Deliver the requested
handoff — including the parent epic — to its required destination. For a production
decision give the exact revision and the approval packet; notification is not approval or
deployment evidence. Routine short handoffs may be written directly without this skill.
```

## Ticket breakdown (proposed; created only after the approval-owner comment)

| Stage | Ticket | Outcome | One PR |
| --- | --- | --- | --- |
| 1 | Retire the last three local contracts | The catalog carries no `own` entry: `agent-retro`, `module-design` and `pr-writing` are gone as directory + manifest entry + binding; general binds `retro`, implementer binds `pr`, both forks vendored with their support files and exactly the deltas above; the implementer contract names the two checks; counts, NOTICE, README and the test fixtures match; `just validate && just test` green | yes |

The ticket carries this spec's sha, its own `Touch:` list and acceptance criteria. It is
created only after the approval-owner comment, assigned to the implementer at stage 1, and
MIR-122 then sits at `todo` as the epic that accepts when the child closes.
