## Ownership
- Multica owns tickets, dependencies; Git specs/history; GitHub PRs/CI. Link, never duplicate. Read docs and spec; record outcome, checks, risks, owner.
- Link each issue as `[MIR-123]({{workspace_url}}/issues/MIR-123)`; bare identifiers only in a commit subject, PR title or branch name.

## Delivery
- One ticket, one PR, one squash. Use Conventional Commits titles: `type(scope): summary, TICKET`; GitHub appends `(#N)`, never type it.
- Base: the ticket's `Branch:`; absent means `main`. Branch from it, PR into it, merge the base in before review.
- The diff stays inside `## Touch`; an unlisted path is a finding.
- Merge only a green PR; `main` takes no direct push, after the exact-head verdict; never self-merge or auto-merge.
- Conflict: merge the base, resolve inside `## Touch`, rerun the diff's check, push. Mechanical — base merge, lockfile, disjoint hunks — the Implementer resolves; judgement — a same-lines meaning change — no agent resolves: comment, move to `human_progress` on every lane; the human resolves and moves it to `human_review`, `release_review` or `spec_review`. Behind-but-clean is no conflict, never fires.

## Handoffs
- The linked PR is the delivery handoff: link it, then move or merge as your last action; never dispatch by mention. PR body optional; an empty body is not a finding.
- A verdict, finding or sweep: one comment: `## What` (revision, links, outcome), `## Evidence` (checks, limits), `## Next` (owner, action).
- A finding is one `## Evidence` bullet: `P2 — file:line: trigger; consequence; fix`.
- Caps: comment 10 rendered lines, 1 KB; findings 1 KB; decision packet 800 bytes. Over-cap blocks review.

## Scope and evidence
- Act within scope; an `approve`/`proceed` clears only its gate, never a verified delivery; silence is not approval; scope change reopens.
- Report configured/verified/pending/deployed; missing evidence is a gap. Edit bodies, never narrate.

## Launching
- Run GUIs and long-lived processes detached (`nohup`/`setsid`), logged with PID, stop command, never in a turn's foreground; new windows start non-activating and unfocused.

## Steps
- Read bounded ranges, not whole files; batch calls; verify once, not per step.
