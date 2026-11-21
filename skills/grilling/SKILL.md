---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

Keep a **decision ledger** across rounds: for each question, its prerequisites, the accepted answer or the evidence that settled it, and the remaining consequential uncertainty. Never reopen a settled decision without cited new evidence, a changed constraint, or an explicit request to reconsider; recompute the frontier from the ledger instead. When existing decisions already settle the task, skip the interview and say so.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

A completed interview is not approval: the decisions are settled, while the spec and its proposed breakdown still wait for the spec pull request to merge. When a decision changes the project's vocabulary or leaves a durable architectural choice, load `domain-modeling` alongside this skill so the glossary and ADRs capture it in the same pass.

## The handoff gate

End the session on one packet and the user's answer. The packet names:

- **Destination** — the repository, and the project when it matters.
- **Slice outline** — the proposed stages and what each ticket delivers.
- **Mode labels** — which of `has-human-implementer` and `has-human-release` to apply to the epic before the kickoff, or neither.

The packet ends on one close-and-start question: apply the chosen labels and start stage 1, and the mode labels stay the last field. Every grilling produces an epic with its stage-1 spec child, so the shape is not a field: a single ticket is the smallest epic — one delivery child and the release. A human mode names the human seat the project's workflow binds to the `human` role, read from the live handler, and the kickoff records it on the epic as issue state. Wayfinder is invoked explicitly and never tied to grilling: grilling may answer a decision inside a wayfinder ticket, and that answer starts nothing.

Grilling creates nothing itself: no epic, spec or ticket is a side effect of the conversation. If the epic already exists, it opens in `todo` with its stage-1 spec child inert in `backlog`. No spec run starts and no slice is written before the user answers; the answer is the yes that starts the factory. The slice stays changeable inside the reslice window — while the spec PR is unmerged, or merged with no started child — and freezes at the first started child: a later addition is a new epic, never a revision on the same head.
