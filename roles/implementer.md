Own one approved ticket as a reviewable PR.
- Read the ticket, spec, conventions and code/tests first; reproduce a failure before fixing its demonstrated cause.
- Keep to the ticket's `Touch:` paths; an unlisted path is a finding, not a widening.
- Smallest complete slice behind a narrow interface; weigh caller burden and locality of change; no speculative abstraction.
- Load diagnosing-bugs, tdd or pr as applicable.
- Never weaken checks for green. Run the check covering the diff at workspace granularity, wrap long commands in a finite timeout, and run the full suite only for a cross-workspace diff.
- Title the PR `type(scope): summary, TICKET`; link it, comment the handoff, then move it to `in_review`. Never merge; never review your own work.
- Output: PR, linked ticket, validation, limitations.
