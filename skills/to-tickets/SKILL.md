---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its stage, and publish them as backlog child issues in the Factory spec run, before the spec pull request leaves the spec column.
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets**: tracer-bullet vertical slices, each declaring its **stage** in the slice.

The issue tracker and triage label vocabulary come from the workspace agent contract; work lives in Multica.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a spec path, an issue number or URL) as an argument, fetch it and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **stage**: the platform edge that orders it. A ticket that must follow another sits in a later stage; every ticket in one stage can start together, and a ticket with no predecessor is stage 1. A dependency between epics is an `--until-issue` condition on the ticket, never a list in its body.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket in a later stage than the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket staged after every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all precede a final integrate-and-verify ticket; green is promised only there.

### 4. Read the breakdown to publish

The spec you are writing carries the proposed breakdown, and its PR merge will approve it. Use that list as written: for each ticket, the title, its stage and the behaviour it delivers. For a Factory spec child, publish the set now, in this run and before the spec PR leaves `spec_progress`; otherwise publish once the plan is agreed. A change to the published set is a spec revision, not a promotion decision.

### 5. Publish the children to Multica

**Pre-flight the whole set against shared `## Ownership` before publishing.** Every child carries its project and its planned owner, the human lane's being the live `human` handler's member; no child is unassigned. A child that misses either fails the publish: fix the set, never publish part of it.

Publish one Multica child issue per ticket in stage order. Create every child `--status backlog` with `--project`, `--parent` the **epic** (the spec child's parent, never the spec child), `--stage` and `--assignee` (the planned owner: the role that will do the work, or the live `human` seat for the human lane); no child is unassigned. The stage is the dependency edge; a dependency between epics is an `--until-issue` condition, never a body list. List the parent's children first and reconcile by title: a rerun creates only what is missing and updates the rest, never duplicates.

**The merge is the approval, not the publish.** The whole set is visible in `backlog` before the human merges the spec PR. Nothing starts until the merge completes the spec child and the Planner's wake promotes the frontier. Apply `ready-for-agent` in that promotion, not here.

**A stage is a parallel barrier group, not a position label.** The platform wakes the parent assignee when a stage closes while a later stage waits; that wake is the promotion trigger, so do not arm a per-ticket "X is done" wake for it. Three rules follow:

- **Serial tickets get distinct stages.** A ticket that must follow another must never share its predecessor's stage: the stage cannot close until both are terminal, the follower is never promoted, and the parent is never woken. A stage may hold several tickets only when they are genuinely parallel.
- **Every child is created `--status backlog`; the promotion wake starts the frontier by the four-row mapping in `roles/planner.md`.** A non-backlog status on an agent-assigned issue enqueues its assignee at create time, so a started child would begin work before the merge approved it. Never create a child `todo`, `in_progress`, `human_progress` or `release_progress` in the spec run.
- **Publish the whole set before the spec child closes.** The platform re-evaluates the stage barrier when the child set changes; a set that is final before stage 1 closes wakes the Planner once. Creating delivery children after the merge is what produces the duplicate wake.

**Record the base in every ticket body.** Write `Branch: <epic-key>` at the top of the body: every published child targets the slice's integration branch, so the line is always present. A branch name, never a sha: the tip moves as tickets merge, and the body is what a fresh Implementer run opens. Every published slice takes the one topology, and its release child is the final publication: created last, in `backlog`, in the final stage, never in a started status. A single-ticket breakdown is the smallest epic — one delivery child and the release. The release body carries only its instance — the release branch `<release-key>` → `main`, the included children with their keys and merged PRs, and the `Touch:` union; the release procedure lives once in `roles/release.md`. Create no child after the merge that approves its set.

Check the staged layout with `multica issue children <parent-id>` before opening the spec PR: every child must be `backlog`, and every later stage must be higher than the stage that precedes it.

Do NOT close or modify any parent issue.

<issue-template>

Branch: <epic-key> — the integration branch this ticket's pull request targets; always present on a published child.

Link every issue this body names as its workspace URL, never a bare key; the review reads the PR body, the proposed breakdown and the comments.

## What

The end-to-end behaviour this ticket makes work, from the user's perspective, not layer-by-layer implementation.

## Acceptance

- Criterion 1
- Criterion 2

## Touch

- The paths this ticket may change; the diff stays inside this list.

</issue-template>

Acceptance criteria are statements, not a checklist: the ticket closes on a merge or a status move, so nobody ticks boxes afterwards. The Reviewer records the evidence per criterion in the PASS verdict; a criterion that cannot be observed there is not acceptance.

In the issue body, avoid specific file paths or code snippets: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.
