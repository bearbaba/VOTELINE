/** Local deterministic workers for a synthetic workflow.
 * They are not external AI agents and make no claim of independent identity.
 */
export function runWorkerA(sourceText){
 const data=JSON.parse(sourceText);
 if(!Array.isArray(data)||data.length<1||data.length>30)throw Error('Source must contain 1-30 entries');
 const selected=[];
 let total=0;
 const seen=new Set();
 for(const x of data){
  if(!x||typeof x.id!=='string'||!x.id||seen.has(x.id)||!Number.isSafeInteger(x.amount)||x.amount<0||typeof x.approved!=='boolean')
   throw Error('Invalid synthetic source entry');
  seen.add(x.id);
  if(x.approved){selected.push(x.id);total+=x.amount}
 }
 if(!Number.isSafeInteger(total))throw Error('Total overflow');
 return JSON.stringify({approvedIds:selected,approvedTotal:total});
}
export function runWorkerB(workerAOutput,injectFault=false){
 const a=JSON.parse(workerAOutput);
 if(!a||!Array.isArray(a.approvedIds)||!Number.isSafeInteger(a.approvedTotal)||a.approvedTotal<0)
   throw Error('Missing structured Worker A evidence');
 return JSON.stringify({
  reportedTotal:a.approvedTotal+(injectFault?7:0),
  summary:'Synthetic approved invoice total for '+a.approvedIds.join(', ')
 });
}
