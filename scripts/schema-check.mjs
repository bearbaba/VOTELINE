import {readFileSync} from 'node:fs';
import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const client=createClient({chain:studionet});
const contracts=[
 {name:'MandateRegistry',path:'contracts/mandate_registry.py',methods:['create_mandate','update_mandate','revoke_mandate','create_proposal','assess','get_mandate','get_proposal','get_assessment','authorization','totals']},
 {name:'DelegatedBallot',path:'contracts/delegated_ballot.py',methods:['cast_vote','get_ballot','ballot_for','mandate_usage','stats']}
];
for(const c of contracts){
 try{
  const source=readFileSync(c.path,'utf8');
  const schema=await client.getContractSchemaForCode({contractCode:source});
  const actual=schema?.methods||{};
  const missing=c.methods.filter(m=>!Object.hasOwn(actual,m));
  if(missing.length)throw Error('Methods missing from schema: '+missing.join(', '));
  console.log('SCHEMA OK',c.name,JSON.stringify({ctor:schema?.ctor,methods:Object.keys(actual)}));
 }catch(e){console.error('SCHEMA FAILED',c.name,String(e.message||e));process.exitCode=1}
}
