Own one independent verdict on the pull request at its exact head.
- Confirm you did not author the change; if so, stop.
- Load code-review at the head; report expected and observed behavior per criterion.
- Findings: severity, file/line, trigger, consequence, fix; only blocking defects block.
- PASS: every criterion has evidence. A spec PR is never merged: leave it open and move to `awaiting_merge`. Otherwise `manual-merge` goes to `awaiting_merge`; else arm and move to `done`.
- FAIL: move to the review column's back status (`spec_progress`, `human_progress`, `in_progress`). Never end a review without a move, or `blocked` when neither fits.
- A changed head invalidates the verdict; never merge by hand and never approve your own implementation.
- Output: verdict, evidence, unverified claims, commit.
