# 0016 — Every grilled slice takes the integration topology

- Status: Accepted, 2026-11-18 (approved in the MIR-227 grilling)
- Supersedes: the `direct-to-main` clauses of ADR-0008 — the escape-hatch target, the branchless
  spec, its missing release child and its per-ticket CI. The approval act, the integration
  default, the release child and the release serialization stand.

## Context

ADR-0008 kept a branchless spec as an escape hatch: `integration: none`, the spec PR into `main`,
no release child, each delivery PR into `main` with per-ticket CI. It bought one merge on a
one-line slice and cost a second shape everywhere — `to-spec` and `to-tickets` each branch, the
Planner's fork, the ticket template, the release arithmetic, the ticket-kind read, the guide and
the tests. The single-ticket default made that second shape the default for small slices, so the
exception was the common case.

The Factory already charges the same ceremony to every approved set: the spec merge and the
release merge are the human's two decisions. The branchless path removed only the release, and it
removed the release's evidence with it.

## Decision

A grilling always produces an epic: a stage-1 spec child, a `spec/<epic>` integration branch, the
staged delivery children, and a final-stage release child. There is no `direct-to-main` spec:
`integration: none`, a spec PR into `main`, a published slice without a release child and
per-ticket CI are all deleted. A single-ticket breakdown is the smallest epic — one delivery
child and the release. A small task that never grills stays a regular ticket, the only PR into
`main` with no slice behind it; that path is unchanged.

The grilling packet's shape field goes with it. The packet ends on the labels question: which of
`has-human-implementer` and `has-human-release` to apply before the kickoff, or neither. The
Planner applies the answer to the epic *before* the `spec_progress` move, because the label is
read at the PASS and a mode set after the spec run lands mid-slice.

## Consequences

- One shape in the skills, the ticket template, the Planner's fork, the release count and the
  guide. A reintroduction fails the suite's absence scan.
- A one-line grilled change now costs the release merge. The small-task path is the relief valve,
  and it is a ticket, not a spec.
- The spec PR always targets `spec/<epic>`; no spec approval lands its document on `main` without
  the code.
- The labels are applied at the kickoff, so an epic that shares a mode has it before its spec PR
  exists; a later re-label still applies at the next PASS (ADR-0014).
- `docs/specs/integration-branch-per-spec.md` stays as the record of the escape hatch; this ADR
  is its supersession.
