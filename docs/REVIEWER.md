# VOTELINE — GenLayer Project Reviewer Guide

**Status: source / unsigned preflight phase. No contract has been deployed or signed from this repository yet.**

Project: https://github.com/bearbaba/VOTELINE
Network: Studionet 61999. Studio 61997 is not compatible.

## Why this is a Project, not only an AI prompt

A member signs an intent-scoped delegation mandate with an allowed direction and per-mandate cap. A proposer signs immutable proposal text. GenLayer independently interprets the mandate and proposal using nondeterministic execution and comparative equivalence consensus, storing ALIGNED / CONFLICT / REVIEW. A separate DelegatedBallot contract performs a fresh view call into Registry before accepting one signed ballot from the appointed delegate. An ambiguous, conflicting or stale decision cannot mint a ballot. The case is an internal DAO-like voting demonstrator, not an integration with real DAO governance.

## Source and method map

| UI action | Contract method | Input | Persisted or returned |
|---|---|---|---|
| Create delegation | MandateRegistry.create_mandate | delegate address, direction, policy, max_votes | int mandate ID; stores owner, delegate, policy, direction, cap, version=1, active |
| Update delegation | MandateRegistry.update_mandate | mandate ID, new_policy | int version increment; invalidates old assessment |
| Revoke delegation | MandateRegistry.revoke_mandate | mandate ID | active=false, version increment; future ballot disabled |
| Create proposal | MandateRegistry.create_proposal | title, details, budget_units | int proposal ID with immutable proposer and details |
| AI decision | MandateRegistry.assess | mandate ID, proposal ID | ALIGNED / CONFLICT / REVIEW; stores version-bound JSON assessment |
| Read authorization | MandateRegistry.authorization | mandate ID, proposal ID, actor | JSON with allowed, direction, version, cap, decision |
| Record delegated ballot | DelegatedBallot.cast_vote | mandate ID, proposal ID, choice | int ballot ID; one-per-pair and per-mandate cap checked |
| Inspect ballot | DelegatedBallot.ballot_for | mandate ID, proposal ID | JSON ballot or empty string |
| Inspect current policy | MandateRegistry.get_mandate | mandate ID | JSON mandate with owner/version/policy/active |
| Inspect proposal | MandateRegistry.get_proposal | proposal ID | JSON proposer/title/details/budget |
| Inspect decision | MandateRegistry.get_assessment | mandate ID, proposal ID | version-bound JSON or empty string |
| Inspect receipt | DelegatedBallot.get_ballot | ballot ID | JSON ballot record |

Browser: src/main.js; pure persisted-state verifier: lib/verification.js; serverless allowlist: api/state.js; tx finality: api/tx.js. No method calls outside the allowlist. All reads use LATEST_FINAL. A FINALIZED execution without a matching record is NEVER shown as verified success.

## Required signed evidence (NOT YET PERFORMED)

1. Member creates mandate with education grant policy, delegate and max_votes=2. Save finalized mandate ID and writer address.
2. Proposer creates explicitly permitted proposal. AI assessment must independently persist ALIGNED. Delegate casts FOR ballot, Gate stores exact ID and actor.
3. Disallowed commercial proposal must produce CONFLICT and Gate denial. Missing source/budget ambiguity should become REVIEW and deny Gate action.
4. Verify wrong wallet, wrong direction, duplicate pair, total cap, policy update and revoke. Existing votes remain archival records, not removed.
5. Fetch exact deployed contract bytes and compare to the committed sources, link both addresses, hashes and reviewer video.

## Disclosures

- A signer-selected delegate is not an authenticated organizational member or externally consenting delegate.
- Proposal details and budget are assertions, not independently verified spending.
- A completed internal ballot does not cast external DAO votes, transfer assets or satisfy real-world election regulations.
- AI may respond REVIEW; test assertions must use actual signed on-chain results and signed failed/rollback receipts.
