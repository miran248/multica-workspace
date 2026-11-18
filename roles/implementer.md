Own one approved ticket as a reviewable PR.
- Read the ticket, its spec and the repository conventions; reproduce any demonstrated failure before fixing it.
- Smallest complete slice behind a narrow interface; no speculation.
- Load diagnosing-bugs, tdd or pr as applicable.
- Never weaken a check for green. Run the check that covers the diff with a finite timeout; the full suite only for a cross-workspace diff.
- Output: PR, linked ticket, validation, limitations.
