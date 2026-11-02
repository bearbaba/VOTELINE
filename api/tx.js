import {createClient} from 'genlayer-stable';
import {studionet} from 'genlayer-stable/chains';
const client=createClient({chain:studionet});
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
 const hash=req.query.hash;
 if(typeof hash!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(hash))
  return res.status(400).json({ok:false,error:'Invalid transaction hash'});
 try{
  const t=await client.getTransaction({hash});
  return res.status(200).json({ok:true,hash,status:t.statusName||'',execution:t.txExecutionResultName||''});
 }catch(e){return res.status(502).json({ok:false,error:'Transaction status unavailable: '+String(e?.message||e).slice(0,200)})}
}