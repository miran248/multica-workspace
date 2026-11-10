## Ownership
- Multica owns tickets, dependencies; Git specs/history; GitHub PRs/CI. Link, never duplicate.
- Read docs and spec; record outcome, checks, risks, owner.
- Use Conventional Commits `type(scope): summary, TICKET`; squash-merge; preserve history.

## Scope and evidence
- Act within scope; a bare `approve`/`proceed` clears only the gate it names, never a verified delivery; silence is not approval; scope change reopens it.
- Report configured/verified/pending/deployed; missing evidence is a gap, not a pass.
- Comments: handoffs, verdicts, findings, evidence; edit bodies, never narrate.

## Launching
- Run GUIs and long-lived processes detached (`nohup`/`setsid`), logged with PID and stop command; never in a turn's foreground.
- New windows start non-activating and unfocused; nothing you launch takes focus or raises itself.

## Merging
- Merge only through a PR whose required check is green; `main` takes no direct push. Merge after the exact-head verdict is published; never enable auto-merge.

## Steps
- Read bounded ranges, not whole files; batch calls; verify once, not per step.

## Handoffs
- Five-line `templates/handoff.md`; link, never restate; over-cap blocks review.
- The comment is the handoff; the status move (or merge) is your last action: publish the note, then move. Never dispatch by mention.
