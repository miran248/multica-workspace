# 0022 — Branch names are ticket ids

- Status: Accepted, 2026-11-21 (approved in the MIR-304 spec)
- Supersedes: the branch-name clauses of ADR-0008, ADR-0009, ADR-0014, ADR-0016 and ADR-0020 —
  `spec/<epic>` as the integration branch, the release PR's `spec/<epic>` head, and the head-key
  premise that let an epic-keyed head link the epic. The topology, the approval act, the one-squash
  release, the exit rule and the one-link rule stand.

## Context

The catalog names branches by kind: `spec/<epic>` is the integration branch and also the release
PR's head; a spec PR is headed by whatever `repo checkout` produced; a delivery PR is headed by
the checkout branch. The names are prefixes, and the epic's key appears in the one place a branch
must not carry it.

The platform links a pull request to the issue whose key appears in its title or its head branch.
So an epic-keyed head is how a release completes the epic rather than its release child; ADR-0018
records the observed instance, a spec PR whose title and branch carried the epic's key and whose
merge completed the epic. With every head prefixed, the head cannot identify the delivering ticket
at all, and the title is the only identifier — two facts that can disagree, and the checkout
branch is scratch with a key of its own.

The integration branch is still the right shape: it holds the reviewed slice off `main` until the
release, and ADR-0016 already made it the only topology. What moves is the naming rule, not the
branch's job.

## Decision

A branch is named by the ticket it delivers, with no prefix:

- the **integration branch** is the epic's key, forked from `main` at the spec sha and the base of
  the spec PR and every delivery PR;
- the **spec PR's head** is the spec child's key;
- a **delivery PR's head** is that delivery ticket's key;
- the **release branch** is the release child's key, forked from the integration branch at the
  release head, and the head of the release PR into `main`.

The epic's key is never a PR head, and the epic holds no pull request link. `spec/`, `release/`
and `agent/` names are gone from the contract; the `repo checkout` branch is scratch and appears
in no handoff. A pull request's title carries the same key for the record, and the platform's link
table is the proof.

The rule lives once in shared `## Delivery`; the publisher writes `Branch: <epic-key>` in every
child's body, the Planner names the three branch roles, and the spec PR and release PR steps carry
only their instance.

## Consequences

- A merge can complete only the ticket whose key the head carries; a release PR can no longer
  complete the epic, and an epic cannot hold a delivery.
- The link is a property of the branch, so a wrong head is a blocking review finding instead of a
  silent cross-link caught after the merge.
- One name per branch role: the integration branch, the three heads and the scratch checkout no
  longer share a prefix vocabulary, and a reintroduced `spec/<epic>` head fails the suite.
- The ticket-id names are live facts of the platform's link trigger; the suite pins the contract
  text and the live acceptance matrix observes the link once.
