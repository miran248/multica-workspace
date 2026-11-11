---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, and publish them to Multica as child issues after the spec pull request carrying the breakdown merges.
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

### 4. Read the approved breakdown

The spec pull request carries the proposed breakdown, and its merge approved it. Use that list as written: for each ticket, the title, the blocking edges and the behaviour it delivers. A change to the ticket set is a new spec revision, not a decision to make here. If the merged spec has no breakdown, stop and report the gap rather than inventing a slice.

### 5. Publish the children to Multica

After the spec child is done, publish one Multica child issue per ticket in dependency order (blockers first), so each child's blocking edges reference real identifiers. Create every child with `--parent` (the source issue, when there is one), `--stage` and `--assignee` (the role that will do the work). The CLI exposes no dependency object, so write each blocking edge into the child's `Blocked by` section. Apply the `ready-for-agent` triage label only now, after the merge. Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

**A stage is a parallel barrier group, not a position label.** The platform wakes the parent assignee when a stage closes while a later stage waits; that wake is the promotion trigger, so do not arm a per-ticket "X is done" wake for it. Two rules follow:

- **Serial tickets get distinct stages.** A ticket blocked by another must never share its blocker's stage: the stage cannot close until both are terminal, the blocked ticket is never promoted, and the parent is never woken. A stage may hold several tickets only when they are genuinely parallel.
- **Later stages are created `--status backlog`; only the frontier is `todo`.** A non-backlog status on an agent-assigned issue enqueues its assignee at create time, so creating a serial chain as `todo` starts the whole chain at once. Promote a parked stage with `multica issue status <id> todo` when the parent wake says the previous stage closed.

Check the staged layout with `multica issue children <parent-id>` before finishing: every `backlog` ticket must be in a later stage than the ticket that blocks it.

Do NOT close or modify any parent issue.

<issue-template>

## Parent

A reference to the parent issue on the tracker (if the source was an existing issue, otherwise omit this section).

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
