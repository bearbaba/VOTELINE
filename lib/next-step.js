/** Navigation advice is based on verified outcomes, never transaction broadcast alone. */
export function nextStepFor(method,decision,authorization){
 if(method==='create_mandate')return {
  target:'create_proposal',title:'Next: Create a proposal',
  description:'The delegation is recorded. Create an immutable proposal for GenLayer to review.',
  button:'Create proposal'
 };
 if(method==='create_proposal')return {
  target:'assess',title:'Next: AI Consensus review',
  description:'The proposal is recorded. Compare it against an active signed mandate before any vote.',
  button:'Review with AI'
 };
 if(method==='assess'){
  if(decision==='ALIGNED'){
   return authorization===true?
    {target:'cast_vote',title:'Next: Delegate casts the vote',
     description:'ALIGNED and live authorization confirmed. Switch to the assigned Delegate wallet before signing FOR or AGAINST.',
     button:'Continue to Vote'}:
    {target:'verify',title:'Check live ballot authorization',
     description:'AI returned ALIGNED, but current voting authorization has not been confirmed. Inspect it before voting.',
     button:'Open Explorer'};
  }
  return {
   target:'create_proposal',title:'No vote authorized',
   description:'The AI outcome is '+(decision||'not verified')+'. Review the policy and prepare a different proposal if appropriate. No ballot is permitted for this assessment.',
   button:'Create a new proposal'
  };
 }
 if(method==='cast_vote')return {
  target:'history',title:'Vote recorded — view your activity',
  description:'The delegated ballot was verified on-chain. View the recorded ballot and signed receipts.',
  button:'Open My Activity'
 };
 return {
  target:'history',title:'View verified records',
  description:'This action was verified on-chain. Inspect the result in My Activity.',
  button:'Open My Activity'
 };
}
