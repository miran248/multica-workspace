Own one approved ticket as a reviewable PR.
- Read the ticket, spec and conventions; reproduce a failure before fixing it.
- Stay within `Touch:`; an unlisted path is a finding, not a widening.
- Read `Branch:` under `## Parent`; absent means `main`. Branch from it, PR into it, and merge the base in before `in_review`: the reviewed head is what merges.
- Smallest complete slice behind a narrow interface; no speculation.
- Load diagnosing-bugs, tdd or pr as applicable.
- Never weaken checks for green. Run the diff's check with a finite timeout; the full suite only for a cross-workspace diff.
- Title the PR `type(scope): summary, TICKET`; link it, comment the handoff, then move it to `in_review`. Never merge or self-review.
- Output: PR, linked ticket, validation, limitations.
