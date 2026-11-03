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

| `create_proposal` → proposal **2** (commercial advertising, resale, paid access, budget=800) | [0xbafa…1313](https://explorer-studio.genlayer.com/tx/0xbafa8419afd4ce009831b9ebf69153a8dee5b76350fa01b3b4434750b8221313) | FINALIZED / SUCCESS / Consensus Accepted | Return value=2; `get_proposal(2)` and `assess(1,2)` are **PENDING** |

| `assess(1,2)` → **CONFLICT** | [0xff924…d5a](https://explorer-studio.genlayer.com/tx/0xff924b624541cc9dff28b62f1edc050af201956ac1f23cbe8a1714dfed9a0d5a) | FINALIZED / SUCCESS / Consensus Accepted | Actual AI verdict CONFLICT; `get_assessment(1,2)` and `authorization(1,2,Delegate)` **PENDING** |

| Delegate `cast_vote(1,2,"FOR")` against a CONFLICT proposal | [0xea0e…bdd7](https://explorer-studio.genlayer.com/tx/0xea0eb6630d072dc3516760168f5cd32d490d74accdc0384a66c0b9e833a8bdd7) | FINALIZED / **ERROR / ROLLBACK**; Consensus Accepted | `no current delegated authorization`; `stats().ballots` post-rollback verified **1** |

| `create_proposal` → proposal **3** (education, budget=150, licensing/attribution/advertising details unconfirmed) | [0x059e…fe36](https://explorer-studio.genlayer.com/tx/0x059e2322aaa4489a19c15931ee4fc9a0d5372d3aade0f8d6069501621a92fe36) | FINALIZED / SUCCESS / Consensus Accepted | Return Value=3. `assess(1,3)` AI verdict **PENDING**, target REVIEW; no ballot authorization asserted. |

| `assess(1,3)` → **REVIEW** | [0xb6c1…b572](https://explorer-studio.genlayer.com/tx/0xb6c1f9278ed75f5da18d0eb7cfd5917fe14294f614b0c0c6b9a103c47919b572) | FINALIZED / SUCCESS / Consensus Accepted | Real AI verdict REVIEW. `get_assessment(1,3)` verified REVIEW; `authorization(1,3,Delegate)` **PENDING**. |

| Delegate `cast_vote(1,3,"FOR")` against **REVIEW** proposal | [0x5001…fcd2](https://explorer-studio.genlayer.com/tx/0x50010810ba05882344a7b0d4e44d01231ec2db28a308832112d121379ee6fcd2) | FINALIZED / **ERROR / ROLLBACK**, Consensus Accepted | `no current delegated authorization` as expected; `stats()` post-rollback confirmed **ballots=1** |

| Delegate `cast_vote(1,1,"AGAINST")` → wrong-direction negative test | [0xfd1d…e25c](https://explorer-studio.genlayer.com/tx/0xfd1d18d745aea46750a8ba146a04f67a9cd7b07bf6377ee03e99cc6c7a61e25c) | FINALIZED / **ERROR / ROLLBACK**, Consensus Accepted | Exact error: `delegate or direction mismatch`. The authorized direction is FOR. Post-rollback `stats()` readback **PENDING**. |

| Member wallet `0x4C7c…8Dcb` attempts `cast_vote(1,1,"FOR")` instead of authorized Delegate | [0x2f7a…2613](https://explorer-studio.genlayer.com/tx/0x2f7a62930acfc9879f4e098534fd03c3bf78bab2be16e9505def6bf9e6c92613) | FINALIZED / **ERROR / ROLLBACK**, Consensus Accepted | `no current delegated authorization`. Wrong signer is rejected despite ALIGNED proposal; state readback after wrong-signer and direction attempts remains **PENDING**. |

**Result:** Signed positive cross-contract ballot and one signed duplicate-rejection negative test are supported. Consensus Accepted on a rejected transaction does **not** imply the write succeeded. The error is the expected test outcome.

**Authorization readback (Nov 3, 2026):** `MandateRegistry.authorization(1,2,0xD6b8A3A5eB329410D9504784812b8569afA8C2aF)` returned `allowed=false`, `decision=CONFLICT`, `direction=FOR`, `max_votes=1`, `version=1`. This is a successful **read-only deny** check. The signed `DelegatedBallot.cast_vote(1,2,"FOR")` attempt subsequently **rolled back** with `no current delegated authorization` (see transaction table). Post-rollback `stats()` readback verified `ballots=1`.

**Post-CONFLICT rollback readback (Nov 3, 2026):** `DelegatedBallot.stats()` returned `{"ballots":1,"registry":"0x84F6D80087242D0eb2cf10c5D091F8c5C9F58C23"}`. Thus, after the signed `cast_vote(1,2,"FOR")` ERROR / ROLLBACK, the authorized ballot count remained **1** and cross-contract binding stayed intact.

**REVIEW persistence readback (Nov 3, 2026):** `MandateRegistry.get_assessment(1,3)` returned `{"decision":"REVIEW","mandate_id":1,"mandate_version":1,"proposal_id":3}`. This confirms that the verdict returned by finalized `assess(1,3)` is stored on-chain. The `authorization(1,3,Delegate)` denial is pending the next read-only check.

**REVIEW authorization readback (Nov 3, 2026):** `MandateRegistry.authorization(1,3,0xD6b8A3A5eB329410D9504784812b8569afA8C2aF)` returned `allowed=false`, `decision=REVIEW`, `direction=FOR`, `max_votes=1`, `version=1`, correctly denying a proposal lacking required policy evidence. A signed `DelegatedBallot.cast_vote(1,3,"FOR")` rejection is now confirmed with an ERROR / ROLLBACK; subsequent state readback is pending.

**Post-REVIEW rollback readback (Nov 3, 2026):** After the finalized `cast_vote(1,3,"FOR")` ERROR / ROLLBACK, the operator read `DelegatedBallot.stats()` and received `{"ballots":1,"registry":"0x84F6D80087242D0eb2cf10c5D091F8c5C9F58C23"}`. The valid ballot remains persisted and REVIEW did not create a second ballot.

**Post-wrong-signer and wrong-direction readback (Nov 3, 2026):** After finalized ERROR / ROLLBACK attempts `cast_vote(1,1,"AGAINST")` by Delegate and `cast_vote(1,1,"FOR")` by Member, operator read `DelegatedBallot.stats()` = `{"ballots":1,"registry":"0x84F6D80087242D0eb2cf10c5D091F8c5C9F58C23"}`. The original valid ballot remained the only ballot.

## Next tests — NOT YET PERFORMED

- Explicit commercial/budget violation → target CONFLICT, denied authorization.
- Missing policy evidence → target REVIEW, denied authorization.
- Wrong signer, wrong choice, cap enforcement, duplicate member/proposal across mandates.
- Mandate version update, revocation, and immutable historical ballot.
- One fresh signed web-app write, final one-take video, steward submission.

Follow [Studio-first acceptance instructions](STUDIO_ACCEPTANCE_VI.md). Record **actual** IDs, hashes, consensus results and readbacks; never fabricate evidence.
