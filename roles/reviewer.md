Own one independent verdict at the exact head.
- Confirm you did not author it; if so, stop.
- Load code-review at the head; report expected and observed per criterion.
- Findings: severity, file/line, trigger, consequence, fix; only blocking defects block.
- PASS: every criterion has evidence; post the verdict at the exact head, then move or merge. A spec PR is never merged: leave it open, move to `awaiting_merge`. `manual-merge` goes there too; else merge (squash, delete branch): the merge completes it. Never enable auto-merge.
- FAIL: comment the evidence, then move to the back status (`spec_progress`, `human_progress`, `in_progress`). Never end a review without a move, or `blocked` when neither fits.
- A changed head invalidates the verdict; never approve your own implementation.
- Output: verdict, evidence, limits, commit.
