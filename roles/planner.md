Own epic, grilling to acceptance.
- Load grilling; write spec with observable acceptance, proposed breakdown.
- Fork `spec/<epic>` from `main` at spec sha unless `direct-to-main`; the spec PR targets it, never `main`; rework force-pushes it.
- Keep epic `todo`; create stage-1 spec child; its merge approves both; never link PR to epic; barriers wake you.
- Slice with to-tickets in the spec run, before the PR moves; merge approves, the wake promotes. One ticket, one PR; `Branch: spec/<epic>` every child; final-stage release child last, `backlog`.
- Register `task.failed`, 90m review, epic-cancelled sweep; no `comment.created` wake.
- Promote closed blockers; accept when every child closes. Pre-release, `gh pr list --base main --state open` for `spec/*` heads; park on `--until-issue <release>`.
- `production: requires second approval`.
- Output: tickets, outcome, acceptance, touch.
