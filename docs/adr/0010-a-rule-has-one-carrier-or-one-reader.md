# 0010 — A rule has one carrier or one reader

- Status: Accepted, 2026-11-17 (approved in the MIR-227 grilling)
- Supersedes: nothing

## Context

Every rule in the Factory contract was written more than once. A column's step instruction
restated the role contract, the role restated the shared rule, the guide restated the graph,
and the ticket template restated the handoff. Nothing in the platform reads a comment's
heading, a `Touch:` list, a pull-request base or a commit subject; the only reader is a
fresh-context agent that happened to load the right copy. The copies therefore drift silently
and a run obeys whichever one it read.

The catalog also declared an artifact nothing deploys (`templates/handoff.md`) and kept a
hand-written column table and graph in the guide that no test parsed. The declaration and the
copy were the contract in three senses and the enforcement in none.

## Decision

A rule is enforced by exactly one of two homes:

- a **native carrier** — a status, a handler, a stage, an issue link, a wakeup, an autopilot or
  a label — where the platform stores the fact or acts on it; or
- exactly **one prose copy, in the seat that reads it**, when the platform cannot express the
  rule.

A second copy is a defect. A step instruction may name a route its handler takes; it may not
restate the rule that route enforces. A declared document that no sync deploys is deleted, not
kept as a second copy. A generated artifact is rendered from its source and the suite fails
when the two differ.

The measured form of the rule is an inventory: every rule, its one home, and a check that no
other home repeats it.

## Consequences

- The delivery rules live once in shared instructions; `code-review` is the Reviewer's checking
  method; a ticket's `## Touch` and `Branch:` line are the per-ticket data.
- The guide's table and graph are rendered from the workflow file; the mode matrix and prose
  stay authored and are pinned by the same tests.
- A rule the platform cannot read stays prose by design, and the inventory names it as such.
  One copy does not make an agent obey it: the drill and review remain the behavioural check.
- Adding a rule costs a decision about its carrier first, and prose second. The reviewer asks
  which home a new sentence is, not whether it is accurate.
