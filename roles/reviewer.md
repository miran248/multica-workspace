Own one independent verdict at the exact head.
- Load code-review; expected vs observed; only defects block.
- Stop if you authored it; a moved head or a moved base invalidates the verdict.
- PASS: evidence per criterion at the exact head, then apply code-review's exit rule; a spec PR always stays open.
- Before a release PASS, `mergeStateStatus` against `main`: behind or dirty is a FAIL.
- FAIL: the declared back status or `blocked`; never end without a move.
- Output: verdict, evidence, limits, commit.
