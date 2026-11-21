# 0023 — A rewrite is leased and never required

- Status: Accepted, 2026-11-21 (approved in the MIR-304 spec)
- Supersedes: the force-push clauses of ADR-0008 and ADR-0019, and the step instruction that
  repeated them. The reslice window, the freeze, the revision PR and the fresh PASS stand.

## Context

ADR-0008 made a spec rework force-push the same head so the PR number, link and body survive.
ADR-0019 reused that for a rework inside the reslice window, and the step instruction carries it
as the definition of a rework. A force was the only way the old rule kept one PR; it was not a
decision about history.

The platform does not need the force for the handoff. A new commit on the same head keeps the PR
number, link and body exactly as a rewrite does, and it keeps the reviewed history that the
release review reads. The force exists for the narrow case where the commits themselves must not
remain — a leaked secret, a wrong author, a history that would mislead the release — and there it
needs a guard, because a head can move between the fetch and the push.

## Decision

A rework **adds a commit** to the same head. The PR's number, link and body survive because the
head is the same ref, not because the history was replaced; the previous PASS is void because the
head moved, and the review re-covers the delta.

A **rewrite** is allowed only when the commits themselves must not remain. It is done:

- on your own pull request's head, never another author's;
- after a fetch, so the remote ref and its sha are known;
- with `git push --force-with-lease=<remote-ref>:<expected-sha>` — the lease is the guard;
- never with `--force`, `-f`, `--mirror`, a `+` refspec, `main` or the integration branch.

A failed lease is a re-read, not a retry with a stronger force: fetch, compare the head, and
re-push only against the head that is actually there. A rewrite that a concurrent run made unsafe
is the concurrent run's head, and it is resolved as a conflict, not overwritten.

The rule lives once in shared `## Delivery`; the Planner contract names the route and the
revision PR, and no role, skill or column restates the flags.

## Consequences

- An ordinary correction preserves the reviewed history and the PR identity; a rewrite is chosen
  for the history, not to avoid a stale commit.
- A rewrite cannot silently replace a head another run pushed: the lease fails and the next step
  is a re-read.
- `main` and the integration branch have no rewrite route at all; a push to either is a defect,
  not a policy call.
- The platform's force-push behaviour is not a catalog fact; the contract text is pinned by the
  suite, and a live rewrite is observed only when one is needed.
