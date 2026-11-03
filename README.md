# VOTELINE — Intent-scoped delegated governance

**Your intent. Your vote. Verified by consensus.**

VOTELINE is an experimental GenLayer Studionet 61999 dApp connecting two Intelligent Contracts. A member signs a free-form voting mandate, appoints a delegate and sets a strict FOR/AGAINST direction and vote cap. The current 1–20 cap is **votes across distinct proposals per mandate**, not a limit of 20 platform users or wallets. A proposer signs immutable proposal details. GenLayer's comparative AI consensus evaluates the frozen proposal against the mandate and stores ALIGNED / CONFLICT / REVIEW. A distinct DelegatedBallot contract checks current Registry authorization, exact delegate identity and direction, max-vote cap and duplicate use, then writes one actual testnet ballot receipt.

**STATUS (Nov 3, 2026): TWO CONTRACTS DEPLOYED, SIGNED STUDIO CORE PASSED, WEBSITE LIVE.** Actual signed transactions and finalized readbacks confirm ALIGNED → ballot #1, CONFLICT and REVIEW → blocked ballots; duplicate, wrong signer and wrong direction attempts correctly rolled back. On-chain deployed source/schema and cross-contract binding, plus public read-only website/API smoke, passed. **Fresh browser-signed write and final YouTube video remain pending.** See [signed evidence](docs/SIGNED_EVIDENCE.md).

## Implementation

- contracts/mandate_registry.py: owner mandate, amendment/revocation, proposer submission, GenLayer nondeterministic model and comparative consensus.
- contracts/delegated_ballot.py: cross-contract permission, signer and vote limits, append-only ballot ledger.
- src/: responsive Vite website; one-click example drafts, wallet signing with EIP-1193, finality and exact stored-state verification, public explorer.
- api/: allowlisted finalized reads and transaction execution status; server addresses configured for deployed Studionet contracts.
- tests/: offline deterministic matching and negative-path checks. These are not GenVM consensus tests.

## Local checks

Run Node.js 22+, then:

    npm install
    npm test
    npm run build
    npm run dev

Website: https://voteline.vercel.app/. Vercel is configured with the verified Registry and DelegatedBallot addresses. The UI additionally reads their finalized state and confirms the constructor link before enabling signed operations.

## Studio acceptance (must be done sequentially)

1. Deploy the Registry FIRST on Studionet 61999, capture actual deployed code, address, transaction hash and finalized execution.
2. Deploy DelegatedBallot with its constructor registry_address referencing the real Registry.
3. Set both addresses, verify latest-final readback and exact source.
4. Sign positive ALIGNED -> delegate ballot; negative explicit CONFLICT and ambiguous REVIEW -> no ballot.
5. Signed wrong-signer, wrong-direction and duplicate tests PASS; vote cap, version update and revoke have implementation but separate signed coverage remains pending.
6. Record demo from the live website, then independently read all IDs and prepare reviewer evidence.

**Scope:** This is NOT integrated with any real DAO or election. Proposal claims are self-reported. No off-chain delegate consent, legal authority, token transfer, financial voting rights, funds or certified voter identity. GenLayer fees/validator behavior must be measured in Studio. See docs/STUDIO_RUNBOOK.md.

