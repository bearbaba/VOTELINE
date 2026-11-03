export const project = {
 id:"voteline", name:"VOTELINE", repo:"bearbaba/VOTELINE",
 eyebrow:"AI-CONSENSUS DELEGATED GOVERNANCE",
 title:"Your intent. Your vote. Verified by consensus.",
 intro:"Create a wallet-signed delegation mandate. Ask GenLayer validators to compare it with an immutable proposal, then let a separate contract record only an authorized vote.",
 feature:"MandateRegistry preserves owner, delegate, explicit FOR/AGAINST direction, policy version and voting cap. Independent comparative AI consensus stores ALIGNED, CONFLICT or REVIEW. DelegatedBallot reads live authorization, requires the delegate signer and selected direction, enforces max votes and rejects duplicate mandate/proposal votes.",
 boundaries:"Experimental internal ballot on GenLayer Studionet 61999 only. It does not cast a vote on external DAOs, prove proposal claims, or transfer political/governance power outside this testnet contract. AI interpretation is not legal or authoritative advice.",
 contracts:{registry:"VOTELINE_REGISTRY_ADDRESS",gate:"VOTELINE_BALLOT_ADDRESS"},
 samples:{
   mandate:{direction:"FOR",max_votes:"2",policy:"Delegate may vote FOR community grants that provide free open-source education, have a documented budget of 500 units or less, and prohibit commercial advertising. Reject paid ads and resale; unclear spending or attribution must require manual review."},
   proposal:{title:"Open-source school workshop",details:"Provide free programming workshops and openly licensed material to local students. Budget is 300 units for classroom equipment and transport. No sponsorship, advertising, paid access or resale.",budget_units:"300"}
 },
 forms:[
  {key:"create_mandate",title:"1. Sign delegation",subtitle:"Member wallet → Registry. Sign a bounded, versioned mandate. The vote cap counts different proposals this mandate can vote on — not the number of users.",scope:"registry",method:"create_mandate",
  fields:[["delegate","Delegate wallet","address"],["direction","Vote direction","select:FOR,AGAINST"],["policy","Signed voting policy","textarea"],["max_votes","Maximum proposals this delegation may vote on (1–20)","number"]],preset:"mandate"},
  {key:"create_proposal",title:"2. Freeze a proposal",subtitle:"Proposer wallet → Registry. Details are immutable after signing.",scope:"registry",method:"create_proposal",
  fields:[["title","Proposal title","text"],["details","Detailed scope","textarea"],["budget_units","Declared budget units","number"]],preset:"proposal"},
  {key:"assess",title:"3. AI consensus review",subtitle:"Any wallet → Registry. Frozen mandate and proposal compared by independent validators.",scope:"registry",method:"assess",
  fields:[["mandate_id","Mandate ID","number"],["proposal_id","Proposal ID","number"]]},
  {key:"cast_vote",title:"4. Cast delegated ballot",subtitle:"ONLY the assigned delegate wallet → Ballot. Requires current ALIGNED decision and unused vote cap.",scope:"gate",method:"cast_vote",
  fields:[["mandate_id","Mandate ID","number"],["proposal_id","Proposal ID","number"],["choice","Vote direction","select:FOR,AGAINST"]]},
  {key:"update_mandate",title:"5. Revise delegation policy",subtitle:"Original member only. Bumps version; previous AI assessments cannot authorize new ballots.",scope:"registry",method:"update_mandate",
  fields:[["mandate_id","Mandate ID","number"],["new_policy","Replacement policy","textarea"]]},
  {key:"revoke_mandate",title:"6. Revoke future delegation",subtitle:"Owner-only; previously cast ballots remain historical records.",scope:"registry",method:"revoke_mandate",
  fields:[["mandate_id","Mandate ID","number"]]}
 ],
 reads:[
  ["Mandate","registry","get_mandate","id"],["Proposal","registry","get_proposal","id"],
  ["AI assessment","registry","get_assessment","two"],["Live authorization","registry","authorization","actor"],
  ["Ballot","gate","get_ballot","id"],["Ballot for pair","gate","ballot_for","two"],["Member ballot","gate","member_ballot_for","member"],["Totals","registry","totals","none"],["Ballot stats","gate","stats","none"]
 ]
};
/** Transaction hashes are references only. UI status must be validated from finalized chain state. */
export const evidence = {
 mandateId: 1,
 delegate: "0xD6b8A3A5eB329410D9504784812b8569afA8C2aF",
 proofs: [
  {proposalId:1,verdict:"ALIGNED",assessmentTx:"0xc006faa96d06a8c3c573dc52765cffb38196db60deca45bd966f3eb5b7a1d4fe",ballotTx:"0x6b0e0bcb4761cd6ea9a7bec60ecf9bd9ac989322b0bbff4fd09851fd28eb094f"},
  {proposalId:2,verdict:"CONFLICT",assessmentTx:"0xff924b624541cc9dff28b62f1edc050af201956ac1f23cbe8a1714dfed9a0d5a",ballotTx:"0xea0eb6630d072dc3516760168f5cd32d490d74accdc0384a66c0b9e833a8bdd7"},
  {proposalId:3,verdict:"REVIEW",assessmentTx:"0xb6c1f9278ed75f5da18d0eb7cfd5917fe14294f614b0c0c6b9a103c47919b572",ballotTx:"0x50010810ba05882344a7b0d4e44d01231ec2db28a308832112d121379ee6fcd2"}
 ]
};
