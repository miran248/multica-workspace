## Ownership
- Multica owns tickets, dependencies; Git specs/history; GitHub PRs/CI. Link, never duplicate; read the spec; record outcome, checks, risks, owner.
- Link each issue as `[MIR-123]({{workspace_url}}/issues/MIR-123)`; bare identifiers only in a commit subject, PR title or branch name.
- Create with `--project` and the planned owner's `--assignee`; status entry still reassigns natively. Unassigned: only the human lane; its member handler binds it.

## Delivery
- One open PR per delivering ticket, carrying its key; one squash. Use Conventional Commits `type(scope): summary, TICKET`; GitHub appends `(#N)`, never type it.
- Title and head branch: delivering ticket's key only, never the epic's; spec child's title omits it.
- Base: the ticket's `Branch:`, absent means `main`; PR into it, merge the base in before review.
- Diff in `## Touch`; unlisted paths are findings.
- Merge only green at exact-head; no direct `main` push; never self-merge/auto-merge.
- Conflict: merge the base, resolve inside `## Touch`, rerun the diff's check, push. Lockfile/disjoint hunks: Implementer; changed meaning: no agent resolves: comment, `human_progress` every lane; human to `human_review`/`release_review`/`spec_review`. Behind-but-clean never fires.

## Handoffs
- The linked PR is the delivery handoff: read `multica issue pull-requests <ticket>` after opening; move or merge is the last action, only when listed. Empty: name the operator fix, move to `blocked`, never a started lane; never dispatch by mention; empty body is not a finding.
- Verdict, finding, sweep: one comment: `## What` (revision, links, outcome), `## Evidence` (checks, limits), `## Next` (owner, action).
- A finding is a `## Evidence` bullet: `P2 — file:line: trigger; consequence; fix`.
- Caps: comment 10 rendered lines, 1 KB; finding 1 KB; packet 800 bytes. Over-cap blocks review.

## Scope and evidence
- Act in scope; `approve`/`proceed` clears its gate, not delivery; silence is no approval; scope changes reopen.
- Report configured/verified/pending/deployed; missing evidence is a gap; edit bodies, never narrate.

## Launching
- Run GUIs and long-lived processes detached (`nohup`/`setsid`), logged with PID, stop command, never in a turn's foreground; windows non-activating and unfocused.

## Steps
- Bounded ranges; verify once.
