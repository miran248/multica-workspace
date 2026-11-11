---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, and publish them as backlog child issues in the Factory spec run, before the spec pull request leaves the spec column.
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it.

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

Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; green is promised only there.

### 4. Read the breakdown to publish

The spec you are writing carries the proposed breakdown, and its PR merge will approve it. Use that list as written: for each ticket, the title, the blocking edges and the behaviour it delivers. For a Factory spec child, publish the set now, in this run and before the spec PR leaves `spec_progress`; otherwise publish once the plan is agreed. A change to the published set is a spec revision, not a promotion decision.

### 5. Publish the children to Multica

Publish one Multica child issue per ticket in dependency order (blockers first), so each child's blocking edges reference real identifiers. Create every child `--status backlog` with `--parent` the **epic** (the spec child's parent, never the spec child), `--stage` and `--assignee` (the role that will do the work). The CLI exposes no dependency object, so write each blocking edge into the child's `Blocked by` section. List the parent's children first and reconcile by title: a rerun creates only what is missing and updates the rest, never duplicates.

**The merge is the approval, not the publish.** The whole set is visible in `backlog` before the human merges the spec PR. Nothing starts until the merge completes the spec child and the Planner's wake promotes the frontier. Apply `ready-for-agent` in that promotion, not here.

**A stage is a parallel barrier group, not a position label.** The platform wakes the parent assignee when a stage closes while a later stage waits; that wake is the promotion trigger, so do not arm a per-ticket "X is done" wake for it. Three rules follow:

- **Serial tickets get distinct stages.** A ticket blocked by another must never share its blocker's stage: the stage cannot close until both are terminal, the blocked ticket is never promoted, and the parent is never woken. A stage may hold several tickets only when they are genuinely parallel.
- **Every child is created `--status backlog`; the promotion wake starts the frontier in its work column (`in_progress` for agent work, `human_progress` for human work).** A non-backlog status on an agent-assigned issue enqueues its assignee at create time, so a started child would begin work before the merge approved it. Never create a child `todo`, `in_progress` or `human_progress` in the spec run.
- **Publish the whole set before the spec child closes.** The platform re-evaluates the stage barrier when the child set changes; a set that is final before stage 1 closes wakes the Planner once. Creating delivery children after the merge is what produces the duplicate wake.

**Record the base in every delivery body.** Under `## Parent`, write `Branch: spec/<epic-key>` for an integration spec; omit the line for a `direct-to-main` spec, because absence means `main`. A branch name, never a sha: the tip moves as tickets merge, and the body is what a fresh Implementer run opens. In an integration spec the release child is the final publication: created last, in `backlog`, in the final stage, never in a started status. Its body carries the release procedure (merge the current `main` in, resolve, run the full suite), the base/source branch `spec/<epic-key>` → `main`, the included children with their keys and merged PRs, and the `Touch:` union. Create no child after the spec PR opens.

Check the staged layout with `multica issue children <parent-id>` before opening the spec PR: every child must be `backlog`, and every later stage must be higher than the stage that blocks it.

Do NOT close or modify any parent issue.

<issue-template>

## Parent

A reference to the parent issue on the tracker (if the source was an existing issue, otherwise omit this section).

Branch: spec/<epic-key> — the base branch this ticket's PR targets; omit for a `direct-to-main` spec, where absence means `main`.

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective, not layer-by-layer implementation.

## Acceptance criteria

- Criterion 1
- Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)". Omit this section when blockers were set as native edges.

</issue-template>

Acceptance criteria are statements, not a checklist: the ticket closes on a merge or a status move, so nobody ticks boxes afterwards. The Reviewer records the evidence per criterion in the PASS verdict; a criterion that cannot be observed there is not acceptance.

In the issue body, avoid specific file paths or code snippets: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.
