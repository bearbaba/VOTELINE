import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
import {TransactionHashVariant} from 'genlayer-stable/types';
const client=createClient({chain:studionet});
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const TABLE={
 registry:{address:process.env.VOTELINE_REGISTRY_ADDRESS||'',methods:{
  get_mandate:['id'],get_proposal:['id'],get_assessment:['id','id'],
  authorization:['id','id','address'],totals:[]}},
 gate:{address:process.env.VOTELINE_BALLOT_ADDRESS||'',methods:{
  get_ballot:['id'],ballot_for:['id','id'],member_ballot_for:['address','id'],mandate_usage:['id'],stats:[]}}
};
const valid=()=>Object.values(TABLE).every(x=>ADDRESS.test(x.address))&&TABLE.registry.address.toLowerCase()!==TABLE.gate.address.toLowerCase();
const clean=e=>JSON.parse(JSON.stringify(e,(_key,v)=>typeof v==='bigint'?v.toString():v));
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
 if(req.query?.op==='config')return res.status(200).json({
  configured:valid(),chainId:61999,registry:TABLE.registry.address,gate:TABLE.gate.address});
 if(!valid())return res.status(503).json({ok:false,error:'Deploy both contracts and configure server addresses first'});
 const scope=req.query.scope,method=req.query.method;
 const entry=TABLE[scope],types=entry?.methods[method];
 if(!types)return res.status(400).json({ok:false,error:'Read method not allowlisted'});
 const args=[];
 for(let i=0;i<types.length;i++){
  const v=req.query['a'+i],type=types[i];
  if(typeof v!=='string')return res.status(400).json({ok:false,error:'Missing argument '+i});
  if(type==='address'){
   if(!ADDRESS.test(v))return res.status(400).json({ok:false,error:'Invalid actor'});
   args.push(v);
  }else{
   if(!/^[1-9][0-9]{0,7}$/.test(v))return res.status(400).json({ok:false,error:'Invalid positive ID'});
   args.push(Number(v));
  }
 }
 for(const k of Object.keys(req.query))
  if(/^a\d+$/.test(k)&&Number(k.slice(1))>=types.length)
   return res.status(400).json({ok:false,error:'Unexpected argument'});
 try{
  const value=await client.readContract({
   address:entry.address,functionName:method,args,
   transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
  return res.status(200).json({ok:true,value:clean(value),finality:'LATEST_FINAL'});
 }catch(e){return res.status(502).json({ok:false,error:'GenLayer read failed: '+String(e?.message||e).slice(0,220)})}
}