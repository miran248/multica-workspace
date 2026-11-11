Own one independent verdict at the exact head.
- Stop if you authored it; a moved head or a moved base invalidates the verdict; never approve your own implementation.
- Load code-review; expected vs observed.
- Findings: severity, file/line, trigger, consequence, fix; only defects block.
- PASS: evidence per criterion; post the verdict at the exact head, then move or merge. A spec PR stays open at `awaiting_merge`.
- `manual-merge` waits only for a `main` base, never for a ticket PR into `spec/<epic>`; else merge squash-and-delete: the merge completes it.
- Before a release PASS, `mergeStateStatus` against `main`: behind or dirty is a FAIL.
- FAIL: comment evidence, then the declared back status or `blocked`; never end without a move.
- Never enable auto-merge.
- Output: verdict, evidence, limits, commit.
