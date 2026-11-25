## Ownership
- Multica owns tickets, specs, PRs; link, never duplicate; record outcome, checks, risks, owner.
- Link issues as `[MIR-123]({{workspace_url}}/issues/MIR-123)`; bare keys only in a commit subject, PR title or branch. PR bodies, proposed breakdowns, spec comments link tickets; catalog: anonymous, bare keys, no workspace URL.
- Every ticket has its planned owner. Create with `--project` and the planned owner's `--assignee`; status entry reassigns natively. Planner is the fallback; the human lane's planned owner is the live `human` seat; none unassigned.

## Delivery
- One open PR per delivering ticket, one squash; Conventional Commits `type(scope): summary, TICKET`; GitHub appends `(#N)`.
- The integration branch is the epic's key; every PR head is the delivering ticket's key; the epic never heads a PR, holds no link; spec child's title omits it.
- Base: the ticket's `Branch:`, absent means `main`; merge the base in before review.
- Diff in `## Touch`; merge only green at exact-head; never push `main`, self/auto-merge.
- A wait is a `--blocked-by` blocker, not a status: open, nothing starts; `blocked` is triage only.
- A rework adds a commit to the same head. Rewrite only when the commits must not remain: own PR head, after a fetch, `--force-with-lease=<remote-ref>:<expected-sha>`; never `--force`, `-f`, `--mirror`, `+`, `main` or the integration branch.
- Conflict: merge the base, resolve inside `## Touch`, rerun the check. Lockfile/disjoint hunks: Implementer; changed meaning: human. Behind-but-clean never fires.

## Handoffs
- Linked PR is the handoff: read `multica issue pull-requests <ticket>` after opening; move or merge last, only when listed. Empty: operator fix, `blocked` move, no started lane; empty body not a finding.
- Verdict, finding: one comment: `## What`, `## Evidence`, `## Next`; one-line findings `P2 — file:line: trigger; consequence; fix`; finding 1 KB, packet 800 bytes; over-cap blocks.

## Scope and evidence
- Act in scope; `approve`/`proceed` clears its gate, not delivery; silence is no approval. Report configured/verified/pending/deployed; missing evidence is a gap. Bounded ranges; verify.

## Launching
- Run GUIs, long-lived processes detached, logged PID, stop command, never foreground; windows non-activating and unfocused.
