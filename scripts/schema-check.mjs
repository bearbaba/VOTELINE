import {readFileSync} from 'node:fs';
const RPC='https://studio.genlayer.com/api';
const contracts=[["MandateRegistry","contracts/mandate_registry.py",["create_mandate","update_mandate","revoke_mandate","create_proposal","assess","get_mandate","get_proposal","get_assessment","authorization","totals"]],["DelegatedBallot","contracts/delegated_ballot.py",["cast_vote","get_ballot","ballot_for","mandate_usage","stats"]]];
for(const [name,path,methods] of contracts){
 try{
  const code=readFileSync(path,'utf8');
  if(!code.startsWith('# { "Depends": "py-genlayer:'))throw Error('Missing first-line pinned Depends header');
  const payload={jsonrpc:'2.0',id:1,method:'gen_getContractSchema',params:[{code:Buffer.from(code,'utf8').toString('base64')}]};
  const response=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('RPC HTTP '+response.status);
  const j=await response.json();
  if(j.error)throw Error('RPC GenVM: '+JSON.stringify(j.error).slice(0,1200));
  const schema=j.result;
  if(!schema||typeof schema!=='object')throw Error('Missing RPC schema result');
  const actual=schema.methods||{};
  const missing=methods.filter(m=>!Object.hasOwn(actual,m));
  if(missing.length)throw Error('Missing schema methods: '+missing.join(', '));
  console.log('SCHEMA OK',name,JSON.stringify({constructor:schema.ctor,methods:Object.keys(actual)}));
 }catch(e){console.error('SCHEMA FAILED',name,String(e.message||e));process.exitCode=1}
}
