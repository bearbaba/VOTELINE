# VOTELINE — Studio-first acceptance plan (2 Nov 2026)

**Purpose:** Finish signed on-chain acceptance in **GenLayer Studio (Studionet 61999)** before recording a single concise website demo and submitting GenLayer Projects. **No screenshot, simulator result, or successful CI is a substitute for a FINALIZED/SUCCESS transaction plus persisted readback.**

## Verified deployed contracts

- MandateRegistry: `0x84F6D80087242D0eb2cf10c5D091F8c5C9F58C23`
- DelegatedBallot: `0x600dB69aA8cb83Fc469597b20864ed95fdeF2324`
- `DelegatedBallot.stats()` yielded `{"ballots":0,"registry":"0x84F6D80087242D0eb2cf10c5D091F8c5C9F58C23"}`; `MandateRegistry.totals()` yielded `{"mandates":0,"proposals":0}` when checked.
- Two deployed sources matched committed source after line-ending normalization, **not byte-for-byte**. See [deployment verification](https://github.com/bearbaba/VOTELINE/actions/runs/41485210872).
- Website: https://voteline.vercel.app/ and its [public/API smoke check](https://github.com/bearbaba/VOTELINE/actions/runs/41486261577).

## Wallet roles

Before sending any write, write down the public addresses of **Member (M)**, **Delegate (D)**, and preferably **Proposer (P)**. M and D MUST be distinct. P can be either wallet under the current contract, but a third wallet makes role separation clearer. Each real writer needs test GEN. Always confirm the selected signer at top of Studio. Use **Normal (Full Consensus)**, **Simulation OFF**, chain **61999**. Change wallets only where called for below. Never share private keys.

## Frozen test fixtures — paste literally

### Mandate M1: create_mandate (sign as Member M)

- `delegate`: **actual Delegate D address** (do not enter Member address).
- `direction`: `FOR`
- `policy`:

```text
The delegate may cast FOR votes only for free, non-commercial, openly licensed education programs that give visible attribution, declare a budget of no more than 500 units, and explicitly prohibit paid advertising, resale, and paid access. An explicit violation is a CONFLICT; missing information about any condition requires REVIEW.
```

- `max_votes`: **1** (intentionally low to test cap).
- On confirmed execution: use `get_mandate(M1_ID)` to verify `owner=M`, `delegate=D`, `active=true`, `version=1`. The returned ID is **not assumed** to be 1 if data has changed.

### Three first proposals: create_proposal (sign as Proposer P)

| Label | `title` | `budget_units` | `details` |
|---|---|---:|---|
| P_OK | `Free open-source programming workshops` | 300 | `This is a free, non-commercial program offering openly licensed programming materials for students. Every shared material includes visible creator attribution. The entire declared 300-unit budget funds workshop equipment and travel. Paid advertising, resale, and paid access are explicitly prohibited.` |
| P_DENY | `Paid commercial advertising campaign` | 800 | `The proposal charges paid admission, resells proprietary course packages and funds commercial advertising. The declared 800-unit budget exceeds the mandate's 500-unit ceiling. It does not satisfy the free, non-commercial education requirements.` |
| P_REVIEW | `Community learning sessions pending details` | 150 | `The project plans education sessions for local students, but the organizers have not confirmed whether access will be free, whether materials have open licenses, how attribution works, or whether advertising and resale will be allowed.` |

After each successful submission, call `get_proposal(ID)` and confirm its title, details, proposer and budget before continuing. Record all actual IDs and transaction hashes.

## Execution sequence in Studio

| Order | Contract / operation | Signer | Inputs | Passing persisted outcome |
|---|---|---|---|---|
| 1 | Registry `create_mandate` | M | M1 fixture, Delegate D, FOR, max_votes 1 | M1 created, version 1, active |
| 2–4 | Registry `create_proposal` | P | P_OK, P_DENY, P_REVIEW | Each distinct proposal stored |
| 5 | Registry `assess` | Any funded wallet | M1_ID, P_OK_ID | Target `ALIGNED`; read `get_assessment` and preserve **actual** verdict |
| 6 | Registry `assess` | Any funded wallet | M1_ID, P_DENY_ID | Target `CONFLICT`; read stored verdict |
| 7 | Registry `assess` | Any funded wallet | M1_ID, P_REVIEW_ID | Target `REVIEW`; read stored verdict |
| 8 | Registry `authorization` (view) | Read-only | M1_ID, P_OK_ID, Delegate D | `allowed=true` **only if** actual ALIGNED |
| 9 | Ballot `cast_vote` | D | M1_ID, P_OK_ID, `FOR` | One finalized ballot; check `get_ballot` and `ballot_for` |
| 10 | Registry `authorization` (view) | Read-only | M1_ID, P_DENY_ID, D and M1_ID, P_REVIEW_ID, D | `allowed=false` for non-ALIGNED |
| 11 | Ballot `cast_vote` negative | D | M1_ID, P_DENY_ID, FOR | Expected rollback / no new ballot |
| 12 | Ballot `cast_vote` negative | D | M1_ID, P_OK_ID, AGAINST | Wrong direction must reject |
| 13 | Ballot `cast_vote` negative | M or P | M1_ID, P_OK_ID, FOR | Wrong signer must reject |
| 14 | Ballot `cast_vote` negative | D | M1_ID, P_OK_ID, FOR | Duplicate must reject |
| 15 | Registry `create_proposal` | P | P_OK2 below | New distinct eligible proposal |
| 16 | Registry `assess` | Any | M1_ID, P_OK2_ID | If ALIGNED, Gate should still deny cap (max_votes=1) |
| 17 | Ballot `cast_vote` negative | D | M1_ID, P_OK2_ID, FOR | Expected cap rejection |
| 18 | Registry `create_mandate` | M | M2 same policy, same D, FOR, max_votes 2 | New mandate for **same** member |
| 19 | Registry `assess` | Any | M2_ID, P_OK_ID | If ALIGNED, still cannot vote again for same member/proposal |
| 20 | Ballot `cast_vote` negative | D | M2_ID, P_OK_ID, FOR | Member/proposal duplicate across mandates rejects |
| 21 | Registry `update_mandate` | M | M1_ID, revised policy below | version 2, previous verdict for P_OK2 now stale |
| 22 | Registry `authorization` (view) | Read-only | M1_ID, P_OK2_ID, D | `allowed=false` because old verdict version |
| 23 | Registry `revoke_mandate` | M | M1_ID | `active=false` and version increments |
| 24 | Registry `authorization` (view) | Read-only | M1_ID, P_OK_ID, D | `allowed=false`; previously stored ballot still exists |

**P_OK2**: title `Free community coding library`, budget `250`, details:
```text
This program offers free, non-commercial open-source coding classes. All publicly distributed teaching materials are openly licensed and carry visible creator attribution. The budget is declared at 250 units. No paid advertisements, resale, or paid access are permitted.
```

**Revised M1 policy** for update step 21:
```text
The delegate may cast FOR votes only for free, non-commercial, openly licensed education with visible attribution, budget no more than 200 units, and explicit prohibition of paid advertising, resale, and paid access. All missing details require REVIEW.
```

**Important:** Studio's AI can return any of the three outcomes, including REVIEW. Do not mark a case PASS because the expected label was written here. If P_OK is not `ALIGNED`, **do not attempt step 9**. Record actual verdict and consensus, inspect data, and create a clearly specified additional proposal if needed. If P_DENY/P_REVIEW differ from target, preserve evidence and investigate before asserting successful negative checks. Negative writes may consume test GEN, and only count as tested if a signed transaction actually reverted or state absence was independently verified. For minimal cost, prioritize wrong signer, duplicate and cap after positive case.

### Final website video (after Studio acceptance)

Recording only a read-only page **does not prove** the web app can submit signed transactions. Keep the video short (3–5 minutes) with this sequence:
1. Open public site Home and **Verify**; inspect Studio-generated M1, P_OK, real AI verdict and ballot using IDs. Briefly show linked contracts and exact wallet addresses.
2. Open **Signed workflow**, connect wallet, execute **one fresh legitimate website write** (for example create one new proposal). Show in-wallet confirmation, actual transaction hash, **FINALIZED / VERIFIED** and independent on-chain readback for that exact new proposal. No duplicate of a Studio transaction.
3. Return to Verify to show P_DENY/P_REVIEW, member vote uniqueness and previously recorded ballot; explain policy version/revocation guards. Show GitHub reviewer guide and CI.
4. Record only actually demonstrated results. Do not claim external DAO voting.

This keeps all complex consensus and adversarial testing in Studio while proving the **website's read/write integration** once.

## Evidence ledger (update only after real transactions)

Store one row per signed action: `step`, `contract`, `method`, `sender`, `arguments/IDs`, `transaction hash`, `FINALIZED execution SUCCESS / ERROR`, `persisted value`, `expected/actual outcome`, `explorer URL`. Never guess missing hashes or verdicts. A blank step is PENDING, not PASS.

Final gates: both deployed source verified, positive ALIGNED and ballot, conflict/review stored, at least 3 meaningful negative tests, version/revocation readback, website fresh wallet write, CI PASS, demo and reviewer links.
