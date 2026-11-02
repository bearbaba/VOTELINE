import test from 'node:test';
import assert from 'node:assert/strict';
import {parseValue,classifyTx,verifyStored} from '../lib/verification.js';
test('parse contract JSON but preserve diagnostics',()=>{
 assert.deepEqual(parseValue('{"ok":true}'),{ok:true});
 assert.equal(parseValue('SOURCE_MISMATCH'),'SOURCE_MISMATCH');
});
test('finality requires execution success, not only FINALIZED',()=>{
 assert.equal(classifyTx({status:'FINALIZED',execution:'SUCCESS'}),'success');
 assert.equal(classifyTx({status:'FINALIZED',execution:'FINISHED_WITH_RETURN'}),'success');
 assert.equal(classifyTx({status:'FINALIZED',execution:'ERROR'}),'error');
 assert.equal(classifyTx({status:'FINALIZED'}),'pending');
 assert.equal(classifyTx({status:'ACCEPTED',execution:'SUCCESS'}),'pending');
});
test('VOTELINE requires same owner + exact mandate fields',()=>{
 const r={method:'create_mandate',actor:'0xABC',args:['0xdef','FOR','Grant only education',2]};
 const x={owner:'0xabc',delegate:'0xDEF',direction:'FOR',policy:'Grant only education',max_votes:2,active:true};
 assert.equal(verifyStored(r,x),true);
 assert.equal(verifyStored(r,{...x,max_votes:3}),false);
});
test('ballot receipt must match signer, pair, choice',()=>{
 const r={method:'cast_vote',actor:'0xabc',args:[1,2,'FOR']};
 assert.equal(verifyStored(r,{id:1,mandate_id:1,proposal_id:2,actor:'0xABC',choice:'FOR'}),true);
 assert.equal(verifyStored(r,{id:1,mandate_id:1,proposal_id:2,actor:'0xbad',choice:'FOR'}),false);
});
test('AI outcome must be stored (no PENDING accepted)',()=>{
 assert.equal(verifyStored({method:'assess',args:[1,2]},{mandate_id:1,proposal_id:2,decision:'REVIEW'}),true);
 assert.equal(verifyStored({method:'assess',args:[1,2]},{mandate_id:1,proposal_id:2,decision:'PENDING'}),false);
 assert.equal(verifyStored({method:'adjudicate',args:[1]},{id:1,stage:'DECIDED',verdict:'UNVERIFIABLE'}),true);
});
test('recovery receipt is not falsely marked fixed',()=>{
 const r={method:'submit_rework',args:[1,'corrected','abcd'],actor:'0xa'};
 const x={case_id:1,new_output:'corrected',new_sha256:'abcd',actor:'0xa',status:'REWORK_SUBMITTED_NOT_VERIFIED'};
 assert.equal(verifyStored(r,x),true);
 assert.equal(verifyStored(r,{...x,status:'FIXED'}),false);
});
test('worker evidence must be exact same signed actor and digest',()=>{
 const r={method:'submit_evidence',args:[1,'{"ok":true}','a'.repeat(64)],actor:'0xb'};
 const x={id:1,worker_a:'0xa',worker_b:'0xb',b_output:r.args[1],b_sha256:r.args[2]};
 assert.equal(verifyStored(r,x),true);
 assert.equal(verifyStored(r,{...x,b_sha256:'b'.repeat(64)}),false);
});
