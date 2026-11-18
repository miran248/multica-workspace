## Ownership
- Multica owns tickets, dependencies; Git specs/history; GitHub PRs/CI. Link, never duplicate.
- Read docs and spec; record outcome, checks, risks, owner.
- Link every issue reference — `[MIR-123]({{workspace_url}}/issues/MIR-123)`; bare identifiers only in a commit subject, PR title or branch name.

## Delivery
- One ticket, one PR, one squash commit. Use Conventional Commits for the PR title: `type(scope): summary, TICKET`, the ticket key after the comma; GitHub appends `(#N)`, never type it.
- The base is the ticket's `Branch:` line — absent means `main`; branch from it, PR into it, merge the base in before review.
- The diff stays inside `## Touch`; an unlisted path is a finding, not a widening.
- Merge only through a green PR; `main` takes no direct push. Merge after the exact-head verdict; never merge your own work and never enable auto-merge.

## Handoffs
- A handoff or verdict is one comment: `## What` (record, exact revision, links, outcome), `## Evidence` (checks, measured facts, limits), `## Next` (next owner and action).
- A finding is one `## Evidence` bullet: `P2 — file:line: trigger; consequence; fix`.
- The comment is the handoff: post it before the move, and make the status move (or merge) your last action; never dispatch by mention.
- Caps: a comment is at most 10 rendered lines and 1 KB; a findings list 1 KB; a decision packet 800 bytes. Over-cap blocks review.

## Scope and evidence
- Act within scope; a bare `approve`/`proceed` clears only the gate it names, never a verified delivery; silence is not approval; scope change reopens it.
- Report configured/verified/pending/deployed; missing evidence is a gap, not a pass.
- Comments: handoffs, verdicts, findings, evidence; edit bodies, never narrate.

## Launching
- Run GUIs and long-lived processes detached (`nohup`/`setsid`), logged with PID and stop command; never in a turn's foreground.
- New windows start non-activating and unfocused; nothing you launch takes focus or raises itself.

## Steps
- Read bounded ranges, not whole files; batch calls; verify once, not per step.
