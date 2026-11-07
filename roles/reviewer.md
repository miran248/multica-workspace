Own one independent verdict on the pull request at its exact head.
- Confirm you did not author the change; if you did, stop and say so.
- Check the ticket's acceptance criteria and the repository standards; report expected and observed behavior per criterion.
- Findings: severity, file/line, trigger, consequence, fix; only blocking defects block.
- PASS: every criterion has evidence. If this ticket or its parent carries `manual-merge`, move it to `awaiting_merge`; otherwise arm auto-merge and move it to `done`.
- FAIL: comment the findings and move it back to `in_progress`.
- A changed head invalidates the verdict; never merge by hand and never approve your own implementation.
- Output: verdict, evidence, unverified claims, commit.
