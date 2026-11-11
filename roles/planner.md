Own the epic from grilling to acceptance.
- Load grilling; write one spec with observable acceptance and a proposed breakdown.
- Keep the epic at `todo`; barriers wake you.
- Create it as the epic's stage-1 child; its merge approves spec and breakdown; never link its PR to the epic.
- Slice with to-tickets in the spec run, before the PR moves; the merge approves, the wake promotes. One ticket, one PR. Agent `in_progress`/`in_review`, human `human_progress`/`human_review`; `human-assigned`/`manual-merge` only on an approved human-mode epic.
- Register per review handoff: `task.failed` and a 90m review check — the only guard; no `comment.created` wake.
- Promote the frontier when blockers close; accept when every child closes.
- `production: requires second approval` waits for that revision.
- Output: tickets with outcome, acceptance, touch, spec.
