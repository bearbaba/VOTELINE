# VOTELINE — Intent-scoped delegated governance

**Your intent. Your vote. Verified by consensus.**

VOTELINE is an experimental GenLayer Studionet 61999 dApp connecting two Intelligent Contracts. A member signs a free-form voting mandate, appoints a delegate and sets a strict FOR/AGAINST direction and vote cap. A proposer signs immutable proposal details. GenLayer's comparative AI consensus evaluates the frozen proposal against the mandate and stores ALIGNED / CONFLICT / REVIEW. A distinct DelegatedBallot contract checks current Registry authorization, exact delegate identity and direction, max-vote cap and duplicate use, then writes one actual testnet ballot receipt.

**STATUS: SOURCE IMPLEMENTED, NOT YET DEPLOYED.** Contract addresses, live AI results, signed votes and a hosted Production URL are deliberately not claimed before the Studio stage.

## Implementation

- contracts/mandate_registry.py: owner mandate, amendment/revocation, proposer submission, GenLayer nondeterministic model and comparative consensus.
- contracts/delegated_ballot.py: cross-contract permission, signer and vote limits, append-only ballot ledger.
- src/: responsive Vite website; one-click example drafts, wallet signing with EIP-1193, finality and exact stored-state verification, public explorer.
- api/: allowlisted finalized reads and transaction execution status; server addresses remain unset until Studio.
- tests/: offline deterministic matching and negative-path checks. These are not GenVM consensus tests.

## Local checks

Run Node.js 22+, then:

    npm install
    npm test
    npm run build
    npm run dev

Vercel should import the repository root as a Vite project. Set server-only VOTELINE_REGISTRY_ADDRESS and VOTELINE_BALLOT_ADDRESS after both contracts deploy. Then run npm run preflight using these same environment values. The UI refuses signing until both addresses are configured.

## Studio acceptance (must be done sequentially)

1. Deploy the Registry FIRST on Studionet 61999, capture actual deployed code, address, transaction hash and finalized execution.
2. Deploy DelegatedBallot with its constructor registry_address referencing the real Registry.
3. Set both addresses, verify latest-final readback and exact source.
4. Sign positive ALIGNED -> delegate ballot; negative explicit CONFLICT and ambiguous REVIEW -> no ballot.
5. Verify wrong signer, wrong direction, duplicate, vote cap, expired-by-revocation future authorizations and immutable historical votes, with real signed transactions and rollbacks.
6. Record demo from the live website, then independently read all IDs and prepare reviewer evidence.

**Scope:** This is NOT integrated with any real DAO or election. Proposal claims are self-reported. No off-chain delegate consent, legal authority, token transfer, financial voting rights, funds or certified voter identity. GenLayer fees/validator behavior must be measured in Studio. See docs/STUDIO_RUNBOOK.md.

