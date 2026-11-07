# Catalog rollout: finish the migration, then gate it in CI

Accepted 2026-11-07. Approved by the approval owner in MIR-120. Delivery is the rollout
tickets: MIR-126 (the remaining workspace), MIR-127 (CI, done) and MIR-128 (required
check on `main`). The contract itself is settled and shipped; this spec scopes only
what the rollout still owes.

## Problem Statement

The anonymous, stateless contract is live in this repository and one consumer workspace
has completed the switch: its sync control carries the catalog title, the rendered prompt
names this repository's origin, exactly one enabled schedule trigger remains, the
workspace binds this repository instead of the retired one, and the retired repository is
archived. A read-only `just sync --dry-run` from this checkout now plans ordinary catalog
updates and stops at no guard — the unmanaged-autopilot refusal MIR-120 recorded is gone.

Two things are still open. The rollout records another consumer workspace that has not
made the switch: its live sync control still carries the title the retired catalog gave
it, and an undeclared autopilot blocks a sync by design. And the repository has no CI
workflow: every merge so far rested on `just validate && just test` in the implementing
run, so a public repository whose only gate is a local habit cannot refuse a red tree from
anyone else.

## Solution

One human-owned ticket completes the rollout in the remaining workspace from that
workspace's own credentials, because only that runtime can read and write that workspace's
autopilots. One agent-owned ticket adds a GitHub Actions workflow that runs the offline
suite on every push to `main` and every pull request; its own pull request is its first
green run. One human-owned follow-up makes that check required on `main`, because branch
protection is repository settings, not a file a pull request can carry.

No catalog byte changes: the catalog is complete, the rollout is a live-platform
operation, and the workflow is the only new file.

## User Stories

1. As the approval owner, I want the remaining workspace reconciled with the catalog, so no workspace is left half-migrated.
2. As the approval owner, I want the rollout verified from the workspace's own runtime, so the evidence is a readback, not a claim.
3. As a maintainer, I want every push and pull request to run `just validate && just test`, so a red tree cannot reach `main` unnoticed.
4. As a reviewer, I want that check required before merge, so my verdict is not the only gate on a public repository.
5. As a future consumer, I want the migration to stay a live operation with no workspace identity in Git, so the catalog remains reusable.

## Implementation Decisions

**D1 — The shipped contract is not reopened.** No `workspaces/` layer, no sync branch, no
PR step, no generated manifest, no per-skill byte pins, no workspace identity in Git. The
rollout is a live-platform operation performed from the workspace's runtime with that
runtime's credentials; this spec only finishes it.

**D2 — Rollout is one ticket per remaining workspace, human-owned.** The ticket names the
workspace, carries the commands and the readback, and closes on evidence pasted from that
runtime. An undeclared autopilot blocks a sync by design, so the ticket renames the
existing control once, before the first sync; the first sync then refreshes the control's
prompt to this repository's origin. `just schedule` runs only when the workspace has no
schedule, and the retired repository is archived and unbound afterwards.

**D3 — CI is one workflow with two commands.** A workflow at
`.github/workflows/validate.yml` runs on `push` to `main` and on `pull_request`: checkout,
set up the Node.js version the repository pins, `npm ci`, `just validate`, `just test`. It
needs no secret, no write permission and no live platform: the suite is offline by design.
It is the only new file; the catalog, `justfile` and tests are untouched.

**D4 — The workflow's own pull request is its first acceptance.** The check must be green
on the exact head that adds it. A workflow that has never run is not evidence.

**D5 — Required is a second, operator-owned decision.** Branch protection is repository
settings; no merged file can make a check required. It is tracked as its own human ticket
behind the workflow so the workflow can land first, with `validate` as the single required
status check on `main`.

**D6 — The spec lives in Git and the tickets cite its sha.** MIR-120 is the epic and the
decision record; the spec is this document. Tickets carry outcome, acceptance, touch and
this revision's sha, and one approval-owner comment approves the spec and the tickets.

## Testing Decisions

- **The workflow is tested by running.** Its pull request triggers the events it declares;
  a green `validate` check on that head is the acceptance, and no separate workflow test is
  added.
- **The offline gate does not change.** `just validate` and `just test` stay the only
  checks, already covering the resolver invariants, the sync double and anonymity.
- **Anonymity still covers the new file.** The anonymity test walks every YAML and
  Markdown file; the workflow and this spec carry no workspace identity.
- **Rollout acceptance is a readback from the other runtime.** `autopilot list` shows one
  control with the catalog title, `trigger-list` shows exactly one enabled schedule,
  `just sync --dry-run` stops at no guard, and the workspace's repository list no longer
  holds the retired repository.

## Out of Scope

- The already-migrated workspace: its rollout is verified in Further Notes, not reticketed.
- The runtime inventory gap: `runtime list` exposes no model or thinking-level inventory.
- Fork provenance: re-basing a fork against the upstream pin stays a manual reviewed port.
- Autopilot status and extra triggers: operator state, not catalog state.
- Any catalog content change: no skill, role, label, workflow or template byte moves.

## Further Notes

Evidence at `19d51b5` (main): `just validate` clean; `just test` 104/104; a read-only
`just sync --dry-run` plans ordinary catalog updates against the migrated workspace (23
operations at this revision) and stops at no guard; the sync control is titled
`Daily catalog sync`, its single enabled schedule trigger is unchanged, and its prompt
carries this repository rather than a hardcoded URL. The retired repository is archived.

The shipped contract — identity resolved at run time, one role per skill, name-keyed
retirement with guards, no Git write-back — is MIR-120's decision record and is not
restated here.
