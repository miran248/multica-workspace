---
name: to-spec
description: "Turn the current conversation into a spec: no interview, just synthesis of what you've already discussed."
---

This skill takes the current conversation context and codebase understanding and produces a spec. Do NOT interview the user; just synthesize what you already know.

The spec is a Git document; Multica owns the tickets, approval records and published graph.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

Check with the user that these seams match their expectations.

3. Record the integration choice, write the spec to `docs/specs/<change>.md`, using the template below, with a `Proposed breakdown` section naming the tickets and their blocking edges, and open the spec pull request. An integration spec records `integration: spec/<epic-key>` in the spec, forks that branch from `main` at the spec sha before the PR exists — a branch needs a commit — and targets its approval PR at `spec/<epic-key>`. A `direct-to-main` spec records `integration: none`, targets its spec PR at `main` and gets no branch and no release child; a spec whose approved breakdown is a single ticket defaults to `direct-to-main`. The review and merge of that PR is the approval of the spec and the breakdown; the skill publishes nothing itself, and no tracker issue holds the spec. A Factory spec child publishes the children with `to-tickets` in the spec run, before the PR leaves `spec_progress`; otherwise hand the spec to `to-tickets` once the plan is agreed.

<spec-template>

`integration: spec/<epic-key>` — or `integration: none` for `direct-to-main`.

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Proposed breakdown

The ticket list the approval covers: one line per ticket with its blocking edges and the behavior it delivers.

## Further Notes

Any further notes about the feature.

</spec-template>
