/** Pure, deterministic post-finality checks. Never infer SUCCESS from tx finality alone. */
export function parseValue(v) {
 if(typeof v==='string'){
   try{if(/^\s*[{[]/.test(v))return JSON.parse(v)}catch{}
 }
 return v;
}
export function classifyTx(raw){
 const status=String(raw?.status||raw?.statusName||'').toUpperCase();
 const exec=String(raw?.execution||raw?.txExecutionResultName||'').toUpperCase();
 if(/ERROR|REVERT|CANCEL|UNDETERMINED|FAILED/.test(status+' '+exec))return 'error';
 if(status==='FINALIZED' && (exec==='SUCCESS'||exec==='FINISHED_WITH_RETURN'))return 'success';
 if(status==='FINALIZED' && exec==='FINISHED_WITH_ERROR')return 'error';
 return 'pending';
}
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
export function verifyStored(r,x){
 if(!x||typeof x!=='object')return false;
 const a=r.args||[],actor=r.actor||'';
 switch(r.method){
 case 'create_mandate':
   return same(x.owner,actor)&&same(x.delegate,a[0])&&x.direction===a[1]&&x.policy===a[2]&&x.max_votes===a[3]&&x.active===true;
 case 'create_proposal':
   return same(x.proposer,actor)&&x.title===a[0]&&x.details===a[1]&&x.budget_units===a[2];
 case 'assess':
   return x.mandate_id===a[0]&&x.proposal_id===a[1]&&['ALIGNED','CONFLICT','REVIEW'].includes(x.decision);
 case 'cast_vote':
   return x.mandate_id===a[0]&&x.proposal_id===a[1]&&same(x.actor,actor)&&x.choice===a[2]&&Number.isSafeInteger(x.id)&&x.id>0;
 case 'revoke_mandate':
   return x.id===a[0]&&same(x.owner,actor)&&x.active===false;
 case 'update_mandate':
   return x.id===a[0]&&same(x.owner,actor)&&x.policy===a[1]&&x.version===r.prior+1;
 case 'open_case':
   return same(x.owner,actor)&&same(x.worker_a,a[0])&&same(x.worker_b,a[1])&&x.task_spec===a[2]&&x.source_data===a[3];
 case 'submit_evidence':{
   if(x.id!==a[0])return false;
   const role=same(x.worker_a,actor)?'a':same(x.worker_b,actor)?'b':null;
   return !!role&&x[role+'_output']===a[1]&&x[role+'_sha256']===a[2];
 }
 case 'open_dispute':
   return x.id===a[0]&&same(x.owner,actor)&&x.dispute===a[1]&&x.stage==='DISPUTED';
 case 'adjudicate':
   return x.id===a[0]&&x.stage==='DECIDED'&&['REWORK_A','REWORK_B','SHARED','UNVERIFIABLE'].includes(x.verdict);
 case 'submit_rework':
   return x.case_id===a[0]&&same(x.actor,actor)&&x.new_output===a[1]&&x.new_sha256===a[2]&&x.status==='REWORK_SUBMITTED_NOT_VERIFIED';
 default:return false;
 }
}
