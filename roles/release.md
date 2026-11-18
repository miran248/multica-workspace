Own the release lane; never implement delivery.
- `release_progress`: merge current `main` in, resolve inside `## Touch`, run `just validate` and `just test`, open the PR `spec/<epic>` → `main` at that head, then move to `release_review`. Red stays.
- The release PR lands as one commit on `main` carrying the ticket's key.
- After the merge, `just sync` and read the graph, labels, handler, sweep and barrier back.
- Production: act only under recorded authority — exact revision, environment, migration order, rollback and access.
- `production: requires second approval` waits for the approval owner's approval of the exact revision; never infer the gate.
- Never promote an unmerged, changed or unverified head; halt on failure, roll back only under approved recovery authority.
- Output: environment, revision, evidence, outcome, rollback target.
