# VOTELINE — Studio signed evidence

**Network:** GenLayer Studionet chain 61999. **Date:** November 3, 2026. **Status:** In-progress acceptance.

The transactions, verdicts, and reads below were reported from GenLayer Studio by the project operator. The two deployed contract sources, read schemas, constructor binding and initial state were verified separately by [on-chain GitHub Actions](https://github.com/bearbaba/VOTELINE/actions/runs/41485210872). Any pending tests remain pending, not passed.

- **MandateRegistry:** `0x84F6D80087242D0eb2cf10c5D091F8c5C9F58C23`
- **DelegatedBallot:** `0x600dB69aA8cb83Fc469597b20864ed95fdeF2324`
- **Member:** `0x4C7cb73aC8F8999af21cfc9fF4cF2333a9508Dcb`
- **Delegate:** `0xD6b8A3A5eB329410D9504784812b8569afA8C2aF`

## Actual signed transactions

| Test | Transaction | Execution result | Independently inspected readback from operator |
|---|---|---|---|
| `create_mandate(delegate, FOR, policy, max_votes=1)` → mandate **1** | [0x32a8…fd8e](https://explorer-studio.genlayer.com/tx/0x32a8c68ae24bf76a5f86a10556e230e91ce2b9098e3a9ba1c8db4c2043a2fd8e) | FINALIZED / SUCCESS / Consensus Accepted | `get_mandate(1)`: active=true, version=1, owner/member and delegate match, cap=1 |
| `create_proposal` → proposal **1** (free education, budget=300) | [0xd38c…0b2c](https://explorer-studio.genlayer.com/tx/0xd38c655e313611f03e9e81fa95c8fd3bf01fdb70bfc21c088418fbb1c3580b2c) | FINALIZED / SUCCESS / Accepted | `get_proposal(1)`: exact proposal/title/details and budget=300 |
| `assess(1,1)` → **ALIGNED** | [0xc006…d4fe](https://explorer-studio.genlayer.com/tx/0xc006faa96d06a8c3c573dc52765cffb38196db60deca45bd966f3eb5b7a1d4fe) | FINALIZED / SUCCESS / Accepted | `get_assessment(1,1)`: decision=ALIGNED, mandate_version=1; `authorization(1,1,Delegate)`: allowed=true |
| Delegate `cast_vote(1,1,"FOR")` → ballot **1** | [0x6b0e…094f](https://explorer-studio.genlayer.com/tx/0x6b0e0bcb4761cd6ea9a7bec60ecf9bd9ac989322b0bbff4fd09851fd28eb094f) | FINALIZED / SUCCESS / Accepted | `get_ballot(1)` confirms actor=Delegate, owner=Member, FOR, mandate_id=1, proposal_id=1, version=1 |
| Delegate repeats `cast_vote(1,1,"FOR")` → expected rejection | [0x6fa8…8d28](https://explorer-studio.genlayer.com/tx/0x6fa8a2ed43a9112e3fba7a64af40945a998ef002a3232d2095f1a113b33e8d28) | FINALIZED / **ERROR / ROLLBACK**; Consensus Accepted on rollback | Validator reason: `[rollback] member already voted on this proposal`; `stats()` after rejection: **ballots=1**, Registry address unchanged |

**Result:** Signed positive cross-contract ballot and one signed duplicate-rejection negative test are supported. Consensus Accepted on a rejected transaction does **not** imply the write succeeded. The error is the expected test outcome.

## Next tests — NOT YET PERFORMED

- Explicit commercial/budget violation → target CONFLICT, denied authorization.
- Missing policy evidence → target REVIEW, denied authorization.
- Wrong signer, wrong choice, cap enforcement, duplicate member/proposal across mandates.
- Mandate version update, revocation, and immutable historical ballot.
- One fresh signed web-app write, final one-take video, steward submission.

Follow [Studio-first acceptance instructions](STUDIO_ACCEPTANCE_VI.md). Record **actual** IDs, hashes, consensus results and readbacks; never fabricate evidence.
