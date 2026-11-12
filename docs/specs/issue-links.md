# Issue references as workspace links

`integration: none` — the approved breakdown is a single delivery ticket, so there is no
`spec/<epic>` branch: the spec pull request and the delivery pull request both target `main`,
and no release child exists.

Accepted 2026-11-12. Approval is the merge of this spec's pull request into `main`, which
completes MIR-172 and approves the published set. MIR-171 is the epic and stays `todo` until
every child closes and the Planner accepts it on evidence. The decisions below are the answers
settled in the grilling session that opened the epic; they are recorded here, not re-decided.

## Problem Statement

An agent writes `MIR-123` into a pull request body, a review comment, a handoff, an issue
description or an issue comment, and the reader gets dead text. In GitHub the identifier is not
a link. In Multica it is not a link either: only a `mention://` chip renders as one. So the form
the contract leaves implicit — the identifier itself — is the form that never opens the issue.

`templates/handoff.md` already mandates a linked reference: line 1 of every handoff is
`<issue>/<ticket> <delivered|PASS|RETURN>; ... [issue](<issue-url>)`. No document says what
`<issue-url>` is, so the template's fixed example and its placeholder disagree in practice, and
agents write the identifier. The gap is measurable: across the last 28 delivery pull requests in
this workspace's repository, 89 references were bare identifiers and 7 were links.

The obvious fix — tell the agent to build the URL — has two costs. It puts the workspace slug in
Git, which is exactly what the anonymity rule forbids, and it buys one live lookup per reference
per document, paid inside a run whose job is something else.

## Solution

Every issue reference an agent writes is one https link that opens the issue in GitHub and in
the app:

```text
[MIR-123](<app_url>/<workspace_slug>/issues/MIR-123)
```

The base is rendered once, at sync, from the live binding: shared instructions carry a workspace
URL parameter resolved from `app_url` + `identity.workspace_slug`, the way the repository and
approval-owner lines are already rendered into every role's instructions. No agent performs a
lookup to write a reference, and Git holds only the parameter, so the catalog stays anonymous.

The identifier stays bare in exactly three places where a URL would break the shape the platform
already reads: a commit subject, a pull request title and a branch name.

The shared contract pays for the rule with one bullet. Its cap moves 200 → 220 words and no
other cap moves.

## User Stories

1. As a reader of a pull request, I want every issue reference to open the issue, so that review does not need a search.
2. As a reader of a Multica comment, I want every issue reference to open the issue, so that the discussion does not dead-end at an identifier.
3. As the approval owner, I want a handoff to link the ticket it is about, so that the record leads to the tracker one click from the comment.
4. As the Planner, I want the reference rule stated once for every surface, so that no run has to choose a form.
5. As the Planner, I want the base rendered from the binding, so that a spec or a handoff can carry a working link without a lookup.
6. As the Planner, I want the catalog to hold no workspace slug, so that one catalog stays anonymous and deployable to any consumer workspace.
7. As the Implementer, I want the PR body template to link the ticket, so that a merged pull request and its issue are one step apart.
8. As the Implementer, I want the link form to be one line I can copy, so that linking costs no thought.
9. As the Reviewer, I want a missing link to be a finding I can name, so that the rule has a gate in the verdict it already writes.
10. As the Reviewer, I want the reference rule in the shared contract, so that I can cite it without quoting a surface table.
11. As a self-hosting operator, I want to point the rendered base at my own app, so that the same catalog links correctly on my instance.
12. As an operator running sync, I want a non-https base refused before any write, so that a broken base never reaches a deployed prompt.
13. As a maintainer, I want the identifier, not the UUID, in the path, so that links stay readable and the platform keeps matching a pull request by its key.
14. As a maintainer, I want the three bare-identifier exemptions written down, so that a commit subject or a PR title is not "fixed" into an invalid shape.
15. As a maintainer, I want the extra rule paid for by a cap change instead of a second section, so that the shared contract keeps its arithmetic.
16. As a future agent, I want the examples in the contract to be the only fixed strings, so that the rule is prose I follow, not example text I pattern-match.

## Implementation Decisions

**D1 — Surfaces: one rule, everywhere agent-authored.** Pull request bodies, review comments,
handoffs, issue descriptions and issue comments are all surfaces of the same rule. A table of
surfaces would be five places to drift and a decision every run has to look up; one sentence in
the shared contract is the whole rule. The only artifacts outside it are the three identifier-only
slots in D6, and each is named because the rule would be wrong there.

**D2 — Form: one https link, no `mention://` variant.** `[MIR-123](<base>/issues/MIR-123)`
renders in GitHub and in Multica, copies out of Multica intact, and cannot be read as an agent
mention. A `mention://issue/...` link renders as a chip but is a UUID-keyed form that is dead the
moment it leaves Multica, and a `mention://` of any other kind is a notification with a side
effect, not a reference. One form also means a reader who copies a comment into a pull request,
or the reverse, keeps a working link.

**D3 — House: this catalog only.** The rule, the template and the skill are deployed from this
catalog into every consumer workspace, and this repository is their only home. The archived
sibling catalog `agent-config` is not reintroduced anywhere — not as a fork, a submodule, a copy
or a second source of the same text. A rule with two homes has two answers the first time one of
them is edited.

**D4 — Enforcement: prose plus fixed template examples; no test that pins example strings.**
`templates/handoff.md` and the PR skill are deployed document and skill text, never rendered, so
they mandate a linked reference and carry no base of their own. That is the fixed example. The
suite cannot prove the failure mode: it lives in artifacts this repository never sees, written by
agents in a consumer workspace's tracker and pull requests. A test that pinned a URL-shaped string
would pin today's slug or a placeholder, would fail on a legitimate base, and would still pass
while an agent wrote a bare identifier. A missing link is a review finding on the handoff or the
verdict — both already capped and already gated.

**D5 — Path: the identifier, not the UUID.** `/{ws}/issues/{IDENT}` is the app's canonical issue
URL: the route accepts a UUID only to rewrite the address bar to the identifier, and
`GET /api/issues/{id}` resolves either spelling server-side. The identifier inside the URL is also
the token the platform matches when it auto-links a pull request from title, body and branch. A
UUID link would therefore cost one lookup per distinct referenced issue per document, would drop
that token, and would put a form in a comment that a reader cannot type or remember. These are
live platform behaviours the offline suite cannot prove; they are recorded as observed, and the
contract only depends on the identifier remaining in the path.

**D6 — Exemptions: a commit subject, a pull request title and a branch name.** All three carry the
bare identifier. A URL in a commit subject breaks the Conventional Commits shape the shared
contract mandates, and a URL in a PR title or a branch name is not what GitHub needs: the platform
already reads those three slots for the key, which is the same token D5 keeps in the path. Every
other place an agent can write a reference is covered by D1.

**D7 — Lookup: none at write time; the base is rendered at sync.** The shared instructions carry a
`{{workspace_url}}` parameter that resolves at sync from the binding, beside the repository line and
the approval-owner line that are already rendered: `app_url` + `identity.workspace_slug`. `app_url` is
an operator value: it defaults to `https://multica.ai` and overrides with `--app-url` /
`MULTICA_APP_URL` beside the existing `--runtime-id` / `RUNTIME` pair, so a self-hosted consumer
points it at its own app and nothing else changes. The binding schema rejects any `app_url` that is
not an https origin — no path, query, fragment, credentials, whitespace or braces — the same shape
the repository binding is already held to, because a base with a path or a space renders a link
that is wrong or dead. The anonymity rule stays intact: Git holds the parameter, not the value, and
the rendered base exists only in live prompts; committing the resolved base would put a live
workspace slug in the tree that `tests/anonymity.test.js` exists to keep out. `app_url` is operator
state, not catalog content, so the only literal in Git is the documented default `https://multica.ai`.

**D8 — Cap: shared instructions 200 → 220 words, paid for by one bullet, no other cap moves.**
The rule is one bullet in the shared contract; the budget it needs is twenty words. The role caps
stay at 130 words, template descriptions at 100 characters, the handoff and verdict at 600 bytes
and eight rendered lines, findings at 1 KB, and the decision packet at 800 bytes. `tests/brevity.test.js`,
the caps table in `README.md` and `GLOSSARY.md` all read 220 after the change, so the audit trail
moves with the suite.

## Testing Decisions

The seam is the existing offline matrix, not a new module. `tests/config.test.js` already resolves
the catalog against a synthetic binding and reads the rendered instructions, which is the highest
seam available for a rendering rule: assert what a run would receive, never the bytes of the shared
file. Prior art is the `{{repository}}` substitution already pinned there and in the autopilot
templates.

- **The rendered base is the test.** With a fixture binding whose `app_url` is `https://multica.ai`
  and whose slug is `validation`, every one of the five roles' rendered instructions contains
  `https://multica.ai/validation/issues/`. Changing `app_url` changes that base, and a fixture
  without the parameter fails resolution.
- **The binding rejects a broken base.** A non-https, whitespace-bearing, brace-bearing or
  path-bearing `app_url` fails validation before any write, so the failure is a refusal, not a
  deployed prompt with a dead link.
- **The cap moves with the rule.** `tests/brevity.test.js` pins shared instructions at 220 words,
  and the caps table and glossary agree; no other cap assertion changes.
- **Anonymity is unchanged.** The committed catalog still carries no live workspace slug, workspace
  id, owner id, consumer name or home path, and the existing anonymity test passes without edits.
- **Not proven by the suite.** That an agent actually writes a link is behaviour in artifacts this
  repository cannot see. It is recorded here as unverified, not claimed as a pass; D4 explains why
  no test is added and where the check lives instead.

## Out of Scope

- Platform behaviour: the URL route, the server-side resolution of either spelling, and the
  pull-request auto-link token are the platform's. The spec records them as reasons; it does not
  change them.
- A `mention://`-based reference form, or any fallback to one.
- Rewriting references already written in tracker history, pull request history or commit history.
- Editor, linter or CI enforcement of the link form in consumer repositories.
- Migrating the archived `agent-config` catalog, or reintroducing it as a second source.
- An ADR. This is a rendering and writing contract recorded in this spec; there is no architecture
  decision to add to the ADR set.

## Proposed breakdown

| Stage | Ticket | Outcome | Blocked by |
| --- | --- | --- | --- |
| 1 | MIR-172 | This decision record; the spec PR's merge approves the spec and the set | — |
| 2 | MIR-170 | The delivery contract: the shared bullet, the sync-rendered base, the operator flag and its validation, the two static assets, and the cap | MIR-172 |

`integration: none` — the approved breakdown is a single ticket, so there is no spec branch and no
release child. The spec PR and the delivery PR both target `main`. MIR-170 already exists in
`backlog` in stage 2 with this blocking edge written in its body; it is not started, promoted or
edited by this spec run. This PR's merge approves the spec and the set, and the stage-1 barrier
wakes the Planner to promote stage 2.

## Further Notes

**The measured gap.** Across the last 28 delivery pull requests in this workspace's repository, 89
references were bare identifiers and 7 were links; this spec's PR body is itself the first
artifact written under the rule. The sample is tracker history, not repository content, which is
why it is cited here rather than checked by a test.

**Why not the UUID.** The app treats the identifier as the canonical address and the UUID as an
input spelling it rewrites away, and the platform's pull-request matching reads the identifier.
Both facts point the same way, so the readable form is also the one that costs nothing.

**Why no per-reference lookup.** A lookup would be a live call inside a run whose scope is a
review or a handoff, would fail in an offline run, and would still leave the slug in the command
output of every such run. Rendering the base once per sync is the same information, resolved where
the binding is already resolved.

**Self-hosting.** `--app-url` / `MULTICA_APP_URL` is the only knob. An operator whose app is not
`https://multica.ai` sets it once; a value that is not an https origin is refused, because an
http or malformed base renders a link a reviewer cannot open.

**Reversibility.** The change is one bullet, one parameter, one schema field, one CLI option, two
static documents and a cap number; reverting it restores the identifier-only contract and the
200-word cap. Nothing in Git carries a rendered value, so deletion is complete.

**What stays unverified.** The three D5 platform facts and the claim that agents comply are live
observations. The next spec that touches references can add them to a guide's live acceptance
table; this one records them as the reasons for the decisions and does not pretend the offline
suite proves them.
