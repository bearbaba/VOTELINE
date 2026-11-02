import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';

const {registry,chainId} = JSON.parse(readFileSync('deployments/studionet.json','utf8'));
const assert=(yes,msg)=>{if(!yes)throw Error(msg)};
const normalize=s=>s.replace(/\r\n/g,'\n').trimEnd();
const sha=s=>createHash('sha256').update(s).digest('hex');
assert(chainId===61999,'Wrong chain ID');
assert(/^0x[a-fA-F0-9]{40}$/.test(registry),'Missing/invalid Registry address');
const client=createClient({chain:studionet});
const local=readFileSync('contracts/mandate_registry.py','utf8');
console.log('Checking registry on Studionet 61999:',registry);
const live=await client.getContractCode(registry);
assert(typeof live==='string'&&live.length>150,'Deployed code unavailable');
console.log('Local source SHA256:   ',sha(local));
console.log('Deployed source SHA256:',sha(live));
assert(normalize(live)===normalize(local),'DEployed source mismatch: DO NOT deploy second contract');
const schema=await client.getContractSchema(registry);
const methods=schema?.methods||{};
for(const name of ['create_mandate','create_proposal','assess','authorization','get_mandate','get_proposal','get_assessment','update_mandate','revoke_mandate','totals']){
 assert(Object.hasOwn(methods,name),'Missing deployed method: '+name);
}
const result=await client.readContract({address:registry,functionName:'totals',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
const value=typeof result==='string'?JSON.parse(result):result;
assert(Number.isSafeInteger(value?.mandates)&&Number.isSafeInteger(value?.proposals),'Invalid finalized totals');
console.log('VERIFIED deployed contract source, schema and latest-final state:',JSON.stringify(value));
