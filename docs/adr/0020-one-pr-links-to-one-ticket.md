# 0020 — One PR links to one ticket

- Status: Accepted, 2026-11-21 (approved in the MIR-289 grilling)
- Supersedes: nothing — it corrects the stale no-CLI-unlink consequence of ADR-0005 and
  ADR-0008; the approval act and the integration target stand.

## Context

The platform links a pull request to the issue whose key appears in its title or head branch, or
after a closing keyword in its body. One key, one link: link the branch with the epic's key and
the merge completes the epic; open a second PR for a ticket whose first PR is still open and the
ticket has two live handoffs. The link table is the truth every handoff reads, and nothing kept
it one-to-one.

The live defects are three: a spec PR linked to the epic rather than the spec child, a
post-merge revision that left two PRs on one ticket, and a repurposed spike ticket carrying a
stale link. The fourth two-link case is the release lane's legitimate rework. Separately,
ADR-0005 and ADR-0008 both say a closed linked PR cannot be unlinked from the CLI; that is stale
— `multica issue pull-requests unlink` exists. The guide still sends the human to the issue page.

## Decision

A pull request links to exactly one ticket: the ticket whose key it delivers. The spec PR links
to the spec child and never the epic; a delivery PR links to its own ticket; the release PR links
to the release child. The epic never holds a pull request link.

No ticket has more than one open linked PR. A review reads the ticket's linked pull requests
before the verdict; a second open PR, or a PR linked to a ticket it does not deliver, is a
blocking finding and no PASS stands over it. The rule lives once in shared `## Delivery`; the
existing delivery check in `skills/code-review/` reads it and fails it on the Standards axis.

A closed linked PR is unlinked with `multica issue pull-requests unlink` before a replacement is
linked. The actor who closes the PR owns the unlink, and the guide names the command; a close is
still not a workflow event. Nothing else changes: the key rule, the read-back before the move,
and the approval act stay as they are.

## Consequences

- A merge can only complete the ticket that holds the work; a spec PR can no longer complete the
  epic, and an epic cannot hold a delivery.
- A second PR is caught at review rather than after two offers are live; the closed PR is
  unlinked, so the table has one link and one head.
- The guide's manual unlink instruction is replaced by the command, and the stale consequence in
  ADR-0005 and ADR-0008 is corrected by this record without editing them.
- The platform's link trigger and link table remain live facts; the suite pins the contract text,
  and the live acceptance matrix observes the trigger and the second-PR failure.
