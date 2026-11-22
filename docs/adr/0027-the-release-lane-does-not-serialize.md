# 0027 — The release lane does not serialize

- Status: Accepted, 2026-11-21 (approved in the MIR-304 spec)
- Supersedes: the release-serialization clause of ADR-0009 — the open `spec/*` query and the
  `--until-issue` park — and the package-release assumption where the lane was read as a second
  release. The release child as the whole-slice gate, the one-squash release and the branch-scoped
  `done` stand.

## Context

ADR-0009 kept at most one release merge-ready by having the Planner query open `--base main` pull
requests, filter the heads to `spec/*`, and park the next release on an `--until-issue` condition.
The rule was written when every release head carried the prefix. With ticket-id heads the prefix
identifies nothing, and it never identified the merge-safe fact: a release is safe to merge when
its tree contains the current `main`, not when its head starts with a word.

Two facts can hold the order: the Reviewer's `mergeStateStatus` read before the release PASS,
which is in the contract, and the repository's up-to-date requirement, which is operator state the
catalog names in `docs/apply.md` and cannot set — a repository with an unprotected `main` does not
carry it. The query added a third detector that has to be executed by hand and can disagree with
both.

The `--until-issue` condition also had a defect of its own: it defaulted to `done`, so a
dependency that was cancelled instead of completed waited forever.

## Decision

The release child and its release PR stay the pre-merge whole-slice gate: merge the current `main`
in, resolve inside `## Touch`, run the repository's full check, and merge as one squash carried by
the release ticket's key. Its head is the **release branch**, the release child's key forked from
the integration branch at the release head; the integration branch is never the release PR's head.

There is no release serialization query and no release park: no `gh pr list --base main` filtered
to a prefix, no `--until-issue <release>`. Release order is held by the Reviewer's
`mergeStateStatus` against `main` before the PASS, with the repository's up-to-date requirement as
the expected operator enforcement; a behind or dirty release fails the PASS and reworks on the
release ticket. A repository that does not carry the requirement is a reported delta; the release
never merges a stale tree on the strength of a query.

Where a condition on another issue remains — a cross-epic dependency — it reads
`--until-issue-state ended`, so a cancelled dependency releases the wait and either status is
handled. The factory's release is the slice merge; a package release such as release-please is
outside the factory and is never the slice gate.

## Consequences

- One executable read for release order: the `mergeStateStatus` check, with the up-to-date
  requirement as the expected operator state. The hand query and the park are gone, and so is the
  drift between them.
- A cancelled dependency can no longer hang a waiting ticket; `ended` covers both terminal states.
- The release PR's head identifies the release ticket, so the release link is a branch fact
  (ADR-0022) and the epic holds no head.
- `main`'s protection is operator state. The expected snapshot names the up-to-date requirement;
  the release reports the delta when the repository does not carry it, and never infers a
  merge-safe tree from a query.
- Package publication is named out of the factory once, so a release-please run is not confused
  with the slice gate.
