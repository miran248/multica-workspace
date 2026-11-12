# Handoff and verdict

Both are one comment, five lines, no narration, at most eight rendered lines and
600 bytes. State belongs in the issue body: edit it, never append. Link the PR,
commit, run and issue body; never restate them. A findings list or evidence table
may reach 1 KB, and an over-cap handoff or verdict is a blocking review finding.
A human-facing gate request stays prose and a decision packet keeps its 800-byte
cap. See the caps table in [README.md](../README.md#brevity-caps).

## Handoff

Post on the child when it is delivered, accepted or advanced.
Line 1 names the record, exact revision and links; line 2 the delivered behavior
or verdict; line 3 actual checks; line 4 the limits of the claim; line 5 the next
owner and action. Write `reviewed` in place of `at` for an acceptance verdict.
The next owner is dispatched by a state change on the issue — assignee, status,
stage or `issue wakeup` — and line 5 reports it; the comment is never the trigger.
Post the comment first and make the change last: a change made before the comment
hands the next owner a ticket with no record, and the comment alone dispatches
nobody until the change follows.

1. `<issue>/<ticket> <delivered|PASS|RETURN>; <open|closed>. [PR #<n>](<url>) at `<sha>`; [run](<url>); [issue](<url>).`
2. `<behavior delivered, or verdict on both review axes>.`
3. `Checks: <command> <result>; <n>/<n> tests; <measured facts>.`
4. `<merged|open>, <applied|unapplied>; <unresolved risks, unverified claims, next gate>.`
5. `Next: <status move>; <owner> <action>.`

```
MIR-62/L3 PASS; closed. [PR #25](https://github.com/OWNER/REPO/pull/25) at `aad9b7e`; [run](<run-url>); [issue](<issue-url>).
Standards PASS; Spec PASS; no blockers; all L3 criteria met.
Checks: validate PASS; 157/157 tests; pre-change `4d7aa3a` fails both word caps.
Open, unapplied; no CI checks reported.
Next: in_review moved to awaiting_merge; Release merges and applies.
```

## The comment is the handoff

Every handoff and verdict is posted before the ticket moves to the status its next
owner handles. The workflow hands the ticket to that step's handler: the
implementer at `in_progress`, the reviewer at `in_review` or `human_review`, the human
at `awaiting_merge`. A ticket left in the status you just worked wakes nobody, so
the move must follow the comment in the same run.

| Case | What you do |
| --- | --- |
| the next step is obvious | comment, then move the ticket to that status |
| the ticket closes here | comment, then merge; the merge completes it, so do not move it to `done` |
| a blocker stops you | comment, then move it to `blocked` and assign the human or Planner |
| a human gate or approval waits | comment, then move it to `awaiting_merge` or `blocked`; never leave it in your step |

The move is the trigger, the comment is the record; the comment goes first. Assign
or mention, never both: a mention plus an assignment starts two runs.

## Verdict

Post on the child. PASS is the acceptance event: it ends the review, not advice
waiting for a second decision. It needs evidence for every required criterion at
the reviewed head; a changed head invalidates the verdict. RETURN reactivates the
child for a fix and a fresh independent review.

1. `<PASS|RETURN> — Spec: <result>; Standards: <result>.`
2. `Reviewed [PR #<n>](<url>) at `<sha>`; [run](<url>).`
3. `<severity> — `<file>:<line>`: <trigger>; <consequence>; fix: <correction>.`
4. `Checks: <command> <result>; <n>/<n> tests; <unverified claims>.`
5. `Next: done; the parent wakeup promotes the next stage.`

On RETURN, line 5 names the fresh verdict before moving the ticket back.

```
RETURN — Spec: 1 blocking finding; Standards: PASS.
Reviewed [PR #21](https://github.com/OWNER/REPO/pull/21) at `4f0bb61`; [run](<run-url>).
P2 — `shared/instructions.md:7`: the gate omits the recorded approval signal; fix: name the merged spec PR and its head.
Checks: validate PASS; 152/152 tests; 243 words.
Next: in_progress; Implementer fixes the gate, then a fresh verdict at the new head.
```
