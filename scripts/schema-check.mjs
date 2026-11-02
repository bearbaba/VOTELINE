import {readFileSync} from 'node:fs';
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const client=createClient({chain:studionet});
const RPC='https://studio.genlayer.com/api';
const contracts=[["MandateRegistry","contracts/mandate_registry.py",["create_mandate","update_mandate","revoke_mandate","create_proposal","assess","get_mandate","get_proposal","get_assessment","authorization","totals"]],["DelegatedBallot","contracts/delegated_ballot.py",["cast_vote","get_ballot","ballot_for","mandate_usage","stats"]]];
async function raw(method,code){
 const data={jsonrpc:'2.0',method,params:[code],id:1};
 const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
 const j=await r.json();
 if(j.error)throw Error(String(j.error.message||JSON.stringify(j.error)).slice(0,190));
 return j.result;
}
for(const [name,path,methods] of contracts){
 const source=readFileSync(path,'utf8');
 if(!source.startsWith('# { "Depends": "py-genlayer:')){console.error('MISSING FIRST-LINE RUNNER',name);process.exitCode=1;continue}
 const trials=[
  ['SDK direct',()=>client.getContractSchemaForCode(source)],
  ['RPC source',()=>raw('gen_getContractSchemaForCode',source)],
  ['RPC base64',()=>raw('gen_getContractSchemaForCode',Buffer.from(source).toString('base64'))]
 ];
 let ok=false;
 for(const [label,fn] of trials){
  try{
   const schema=await fn();
   const m=schema?.methods||{};
   const missing=methods.filter(x=>!Object.hasOwn(m,x));
   if(missing.length)throw Error('Missing methods: '+missing.join(', '));
   console.log('SCHEMA OK',name,'using',label,JSON.stringify({ctor:schema.ctor,methods:Object.keys(m)}));
   ok=true;break;
  }catch(e){console.log('PROBE',name,label,'failed:',String(e.message||e).slice(0,250))}
 }
 if(!ok){console.error('SCHEMA FAILED',name,'All supported unsigned probes failed. No transaction sent.');process.exitCode=1}
}
