import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const {registry,ballot,chainId}=JSON.parse(readFileSync('deployments/studionet.json','utf8'));
const assert=(yes,msg)=>{if(!yes)throw Error(msg)};
const normalize=s=>s.replace(/\r\n/g,'\n').trimEnd();
const sha=s=>createHash('sha256').update(s).digest('hex');
const addr=/^0x[0-9a-fA-F]{40}$/;
assert(chainId===61999,'Wrong chain ID');
assert(addr.test(registry)&&addr.test(ballot)&&registry.toLowerCase()!==ballot.toLowerCase(),'Missing or invalid deployment addresses');
const client=createClient({chain:studionet});
const entries=[
 {role:'MandateRegistry',address:registry,path:'contracts/mandate_registry.py',methods:['create_mandate','create_proposal','assess','authorization','get_mandate','get_proposal','get_assessment','update_mandate','revoke_mandate','totals'],read:'totals'},
 {role:'DelegatedBallot',address:ballot,path:'contracts/delegated_ballot.py',methods:['cast_vote','ballot_for','get_ballot','member_ballot_for','mandate_usage','stats'],read:'stats'}
];
for(const item of entries){
 console.log('Checking',item.role,'on Studionet 61999:',item.address);
 const live=await client.getContractCode(item.address);
 const local=readFileSync(item.path,'utf8');
 assert(typeof live==='string'&&live.length>150,'Deployed code unavailable');
 console.log(item.role,'Local SHA256:',sha(local),'On-chain SHA256:',sha(live),
             'Byte equal:',live===local,'Normalized match:',normalize(live)===normalize(local));
 assert(normalize(live)===normalize(local),item.role+': deployed source does not match checked-in source');
 const schema=await client.getContractSchema(item.address);
 const methods=schema?.methods||{};
 for(const method of item.methods)assert(Object.hasOwn(methods,method),item.role+': missing deployed method '+method);
 const raw=await client.readContract({address:item.address,functionName:item.read,args:[],
   transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
 const state=typeof raw==='string'?JSON.parse(raw):raw;
 if(item.role==='MandateRegistry')assert(Number.isSafeInteger(state?.mandates)&&Number.isSafeInteger(state?.proposals),'Malformed Registry finalized counters');
 else{
  assert(Number.isSafeInteger(state?.ballots),'Malformed finalized Ballot counter');
  assert(String(state?.registry).toLowerCase()===registry.toLowerCase(),
    'SECURITY: DelegatedBallot points to WRONG Registry');
 }
 console.log(item.role,'VERIFIED finalized state:',JSON.stringify(state));
}
console.log('SUCCESS: both deployed contracts and constructor binding verified.');
