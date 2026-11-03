# VOTELINE — GenLayer Project Reviewer Guide

**Status (Nov 3, 2026): both contracts deployed/verified on Studionet 61999; signed Studio tests confirm ALIGNED → ballot #1, CONFLICT → denied, REVIEW → denied, with further signed duplicate, wrong-wallet and wrong-direction rejections. Website read-only smoke passed; browser-origin signed write and final video are not yet confirmed.**

Project: https://github.com/bearbaba/VOTELINE
Network: Studionet 61999. Studio 61997 is not compatible.

- Website: https://voteline.vercel.app/
- Registry: https://explorer-studio.genlayer.com/address/0x84F6D80087242D0eb2cf10c5D091F8c5C9F58C23
- Ballot: https://explorer-studio.genlayer.com/address/0x600dB69aA8cb83Fc469597b20864ed95fdeF2324
- Source + cross-contract binding proof: https://github.com/bearbaba/VOTELINE/actions/runs/41485210872
- Live site/API smoke: https://github.com/bearbaba/VOTELINE/actions/runs/41486261577
- Signed Studio transactions: [SIGNED_EVIDENCE.md](SIGNED_EVIDENCE.md)
- Test fixtures: [STUDIO_ACCEPTANCE_VI.md](STUDIO_ACCEPTANCE_VI.md)

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
| Record delegated ballot | DelegatedBallot.cast_vote | mandate ID, proposal ID, choice | int ballot ID; one-per-member/proposal, one-per-mandate/proposal and vote cap checked |
| Inspect ballot | DelegatedBallot.ballot_for | mandate ID, proposal ID | JSON ballot or empty string |
| Member uniqueness | DelegatedBallot.member_ballot_for | member wallet, proposal ID | JSON ballot or empty string; blocks repeated member participation across mandates |
| Inspect current policy | MandateRegistry.get_mandate | mandate ID | JSON mandate with owner/version/policy/active |
| Inspect proposal | MandateRegistry.get_proposal | proposal ID | JSON proposer/title/details/budget |
| Inspect decision | MandateRegistry.get_assessment | mandate ID, proposal ID | version-bound JSON or empty string |
| Inspect receipt | DelegatedBallot.get_ballot | ballot ID | JSON ballot record |

Browser: src/main.js; pure persisted-state verifier: lib/verification.js; serverless allowlist: api/state.js; tx finality: api/tx.js. No method calls outside the allowlist. All reads use LATEST_FINAL. A FINALIZED execution without a matching record is NEVER shown as verified success.

## Signed evidence and remaining limitations

1. **PASS:** Member created mandate #1 (FOR, max_votes=1), proposal #1; AI assessed ALIGNED; Delegate signed FOR ballot #1.
2. **PASS:** Proposal #2 assessed CONFLICT and #3 assessed REVIEW; authorization false; signed vote attempts rolled back with no new ballots.
3. **PASS:** Duplicate vote, wrong signer and wrong direction rejected; finalized stats readback remained ballots=1.
4. **PASS:** Deployed source/schema/link verification and production website read-only API smoke.
5. **PENDING (not claimed):** separate signed max_votes cap enforcement, version invalidation and revoke; fresh browser-origin signed write and the final demo video.
6. Exact transaction hashes, receipts, and readbacks: [SIGNED_EVIDENCE.md](SIGNED_EVIDENCE.md).

## Disclosures

- A signer-selected delegate is not an authenticated organizational member or externally consenting delegate.
- Proposal details and budget are assertions, not independently verified spending.
- A completed internal ballot does not cast external DAO votes, transfer assets or satisfy real-world election regulations.
- AI may respond REVIEW; test assertions must use actual signed on-chain results and signed failed/rollback receipts.
