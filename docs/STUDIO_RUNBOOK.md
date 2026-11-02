# VOTELINE — Studio acceptance runbook

Target GenLayer **Studionet chain 61999** at https://studio.genlayer.com. Never reuse Studio Dev chain 61997 contract addresses.

1. Open contracts/mandate_registry.py in Studio. Validate available schema and deploy its no-argument constructor; save exact source, deployed address, accepted TX hash, and FINALIZED / successful execution.
2. Deploy contracts/delegated_ballot.py SECOND, passing the exact Registry address as registry_address. Inspect stats() and confirm registry matches. Do not deploy in reverse order.
3. In the Vercel project configure server-only VOTELINE_REGISTRY_ADDRESS and VOTELINE_BALLOT_ADDRESS, redeploy once, then inspect /api/state?op=config and read finalized totals/stats. Run npm run preflight locally with the same addresses.
4. Use three different wallets (member, proposer, delegate), test GEN for each. On the website, sign create_mandate, create_proposal, assess and cast_vote. Confirm both TX execution and stored state. The AI output may be REVIEW; do not fabricate ALIGNED.
5. Repeat for CONFLICT and REVIEW, wrong delegate, wrong choice, duplicate vote and max_votes cap. Test owner revocation blocks future ballot authorization, while earlier ballots remain stored.
6. Preserve exact transaction hashes, rejected attempts, contract source hashes, screenshot/video and reproducible evidence. Only then mark it submission ready.

No fake transaction data or pre-filled on-chain IDs.
