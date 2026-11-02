import {readFileSync} from 'node:fs';
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const client=createClient({chain:studionet});
const contracts=[["MandateRegistry","contracts/mandate_registry.py",["create_mandate","update_mandate","revoke_mandate","create_proposal","assess","get_mandate","get_proposal","get_assessment","authorization","totals"]],["DelegatedBallot","contracts/delegated_ballot.py",["cast_vote","get_ballot","ballot_for","member_ballot_for","mandate_usage","stats"]]];
for(const [name,path,methods] of contracts){
 try{
  const code=readFileSync(path,'utf8');
  if(!code.startsWith('# { "Depends": "py-genlayer:'))throw Error('Invalid pinned first-line runner');
  // Stable SDK accepts the code string directly, not an object.
  const schema=await client.getContractSchemaForCode(code);
  const actual=schema?.methods||{};
  const missing=methods.filter(m=>!Object.hasOwn(actual,m));
  if(missing.length)throw Error('Missing schema methods: '+missing.join(', '));
  console.log('SCHEMA OK',name,JSON.stringify({constructor:schema.ctor,methods:Object.keys(actual)}));
 }catch(e){console.error('SCHEMA FAILED',name,String(e.message||e));process.exitCode=1}
}
