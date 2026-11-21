## Ownership
- Multica owns tickets, dependencies; Git specs/history; GitHub PRs/CI. Link, never duplicate. Read docs and spec; record outcome, checks, risks, owner.
- Link each issue as `[MIR-123]({{workspace_url}}/issues/MIR-123)`; bare identifiers only in a commit subject, PR title or branch name.
- Create with `--project` and the planned owner's `--assignee`; status entry still reassigns natively. Unassigned: only the human lane; its member handler binds it.

## Delivery
- One ticket, one PR, one squash. Use Conventional Commits titles: `type(scope): summary, TICKET`; GitHub appends `(#N)`, never type it.
- Title and head branch: delivering ticket's key only, never the epic's; spec child's title omits it.
- Base: the ticket's `Branch:`, absent means `main`; PR into it, merge the base in before review.
- Diff inside `## Touch`; unlisted paths are findings.
- Merge only green at exact-head verdict; no direct `main` push; never self-merge or auto-merge.
- Conflict: merge the base, resolve inside `## Touch`, rerun the diff's check, push. Mechanical (lockfile, disjoint hunks) Implementer resolves; judgement (changed meaning) no agent resolves: comment, move to `human_progress` on every lane; the human moves to `human_review`, `release_review` or `spec_review`. Behind-but-clean never fires.

## Handoffs
- The linked PR is the delivery handoff: link it; move or merge is the last action; never dispatch by mention; empty body is not a finding.
- A verdict, finding or sweep: one comment: `## What` (revision, links, outcome), `## Evidence` (checks, limits), `## Next` (owner, action).
- A finding is a `## Evidence` bullet: `P2 — file:line: trigger; consequence; fix`.
- Caps: comment 10 rendered lines, 1 KB; finding 1 KB; packet 800 bytes. Over-cap blocks review.

## Scope and evidence
- Act in scope; `approve`/`proceed` clears its gate, never a verified delivery; silence is no approval; scope changes reopen.
- Report configured/verified/pending/deployed; missing evidence is a gap. Edit bodies, never narrate.

## Launching
- Run GUIs and long-lived processes detached (`nohup`/`setsid`), logged with PID, stop command, never in a turn's foreground; new windows: non-activating and unfocused.

## Steps
- Bounded ranges; verify once, not per step.
