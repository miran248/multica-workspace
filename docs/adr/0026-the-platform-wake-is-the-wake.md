# 0026 — The platform's wake is the wake

- Status: Accepted, 2026-11-21 (approved in the MIR-304 spec)
- Supersedes: the create-replaces sentence of ADR-0015, the cancelled-epic condition of ADR-0012
  and the `--until-children-done` guidance the Planner contract and the guide carried. The
  conflicts hazard, the resolution contract, the void PASS and the stale sweep stand.

## Context

Three wake rules were written against assumptions the platform does not hold.

The promotion barrier: the Planner armed `--until-children-done --stage N` per promotion. The
platform already wakes the parent assignee when a stage closes while a later stage waits, and
again when every child closes. The second condition is a duplicate wake, and because a condition
is one rule that has to be replaced on every promotion, it is also state that drifts.

The conflicts rule: ADR-0015 registers it with `wakeup create --mode continuous` and says the
command replaces the configuration. `create` adds a rule; a second review re-arms a second rule,
so the ticket ends with several watchers for the same hazard. `wakeup update` is the command that
replaces one rule's whole configuration.

The closing conditions: the guide registers the `--until-status cancelled` sweep on the epic and
leaves the release readback as the Planner's verification after the release merge. The platform
disables an issue's wakeups when it is closed, cancelled or completed, and reopening does not
restore them: the sweep is disabled by the cancellation that should trigger it, and a readback
registered on the release child would be disabled by the child's completion. The sweep is
unreachable as a condition; the readback must stay a run rule.

## Decision

- **The platform's parent stage wake promotes the frontier.** No `--until-children-done` condition
  is armed. The Planner's run on the wake reads the children and promotes the next stage's
  `backlog` children; a later stage stays parked until its barrier closes.
- **One conflicts rule per ticket, updated in place.** The Reviewer arms it at every review by
  finding the existing rule with `multica issue wakeup list` and replacing it with
  `multica issue wakeup update`; `wakeup create` is used only when no rule exists. The condition
  survives the PASS into `awaiting_merge`, and a push voids the PASS as before.
- **The release readback runs in the Planner's acceptance.** After the release merge completes the
  release child, the Planner's acceptance run reads the squash, the checks and the applied catalog
  back. No wakeup is registered on the release child.
- **The cancelled sweep runs in the run that cancels the epic.** The run that moves the epic to
  `cancelled` closes the open delivery and release PRs, deletes the integration branch, cancels the
  remaining children and records what merged and what is abandoned. No condition sits on the epic
  for it.
- **No condition's only trigger is a ticket that closes.** A condition may outlive a PR (conflicts,
  checks, merged), but it is never registered where the trigger is the ticket's own closure.

The rules live in the contracts the seats read: the Planner contract, `skills/code-review` and
`roles/release.md`; the guide describes them once. No autopilot, sweep or column is added.

## Consequences

- The promotion is one wake the platform owns; the Planner cannot leave a stale barrier behind.
- A ticket has one conflicts rule whatever the number of reviews, and the rule's configuration is
  replaced rather than stacked.
- The readback and the sweep run where the fact is known: after the merge, and in the run that
  cancels. Neither depends on a wakeup the platform will disable.
- A cancelled epic with no Planner run still owes its cleanup; the next triage run names the
  sweep, and the acceptance records whether it ran.
