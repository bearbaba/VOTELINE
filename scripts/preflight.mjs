import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const c=createClient({chain:studionet});
const normalize=s=>s.replace(/\r\n/g,'\n').split('\n').map(x=>x.replace(/\s+$/g,'')).join('\n').trimEnd();
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const addresses={FIRST:process.env.VOTELINE_REGISTRY_ADDRESS,SECOND:process.env.VOTELINE_BALLOT_ADDRESS};
const names=[['FIRST','contracts/mandate_registry.py','totals'],['SECOND','contracts/delegated_ballot.py','stats']];
if(!Object.values(addresses).every(x=>/^0x[0-9a-fA-F]{40}$/.test(x||''))||
 addresses.FIRST.toLowerCase()===addresses.SECOND.toLowerCase()){
 console.error('STUDIO NOT CONFIGURED: two distinct verified addresses required. No transaction sent.');
 process.exit(2);
}
for(const [label,path,method] of names){
 try{
  const address=addresses[label];
  const local=readFileSync(path,'utf8');
  const deployed=await c.getContractCode(address);
  if(typeof deployed!=='string'||!deployed.startsWith('# { "Depends"'))
   throw Error('No valid deployed source returned');
  const exact=local===deployed,normalized=normalize(local)===normalize(deployed);
  console.log(label,'address',address,'source exact bytes',exact,'normalized match',normalized,
   'local SHA-256',sha(local),'deployed SHA-256',sha(deployed));
  if(!normalized)throw Error('DEPLOYED SOURCE DOES NOT MATCH REPOSITORY');
  const schema=await c.getContractSchema(address);
  if(!schema||!Object.keys(schema.methods||{}).length)throw Error('Deployed methods unavailable');
  const value=await c.readContract({address,functionName:method,args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
  console.log(label,'schema methods',Object.keys(schema.methods),'LATEST_FINAL',value);
  if(label==='SECOND'){
   const state=typeof value==='string'?JSON.parse(value):value;
   if(String(state.registry||'').toLowerCase()!==addresses.FIRST.toLowerCase())
    throw Error('Gate constructor link does not match first deployed address');
  }
 }catch(e){console.error(label,'UNVERIFIED:',e?.message||e);process.exitCode=1}
}
