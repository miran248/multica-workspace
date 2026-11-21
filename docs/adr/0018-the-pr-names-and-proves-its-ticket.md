# 0018 — The PR names and proves its ticket

- Status: Accepted, 2026-11-21 (approved in the MIR-264 spec review)
- Supersedes: nothing

## Context

The handoff is the linked pull request plus the status move. The platform links a PR to an issue
when its title or branch contains a routable key, or when the body puts a key after a closing
keyword; a bare body mention links nothing. A wrong key is worse than no key: a spec PR titled
and branched with the epic's key links to the epic, so the merge completes the epic and leaves
the spec child in `spec_progress` with no pull request. The step already said "linked to this
ticket only", but a step instruction is prose, and nothing proved the link.

PR #2 in the `multica-sandbox` repository is the instance: its title and branch carried the
epic's key, the merge auto-completed the epic, and the spec child it should have delivered stayed
unlinked at `spec_progress`.

## Decision

A pull request's title and head branch carry the delivering ticket's key only — the spec child's
for the spec PR, the ticket's own for a delivery PR, the release child's for the release PR —
never the epic's. The spec child's title does not repeat the epic key.

After a run opens a PR it reads the ticket's links with
`multica issue pull-requests <ticket>` and moves only when the PR is listed. An empty list is the
operator's fix — the title/branch key, a URL relink with `multica issue pull-requests link`, or
the repository integration — and moves the ticket to `blocked`; a started lane is never left
holding an unlinked PR.

The key rule lives once in shared `## Delivery`; the read-back lives once in shared `## Handoffs`.
Every PR-opening step inherits both because every role renders shared; no role, skill or column
instruction restates either.

## Consequences

- The platform's link table is the truth a step reads: a wrong key is caught before the move,
  not after the merge.
- A PR can complete only the ticket it names: an epic's key in a PR title or branch cannot
  auto-complete the epic.
- An empty read is a visible blocker with an operator instruction, not a silent started lane.
- Two rules, one carrier each; a second copy in a role, skill or column is a defect.
- The platform's link trigger and link table stay live facts; the suite pins the contract text
  and cannot prove either.
