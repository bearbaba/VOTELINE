/** Presentation-only GenLayer lifecycle labels. Never infer transaction success from these. */
const labels = {
 UNKNOWN: 'Awaiting node receipt',
 UNINITIALIZED: 'Awaiting network indexing',
 PENDING: 'Queued on Studionet',
 PROPOSING: 'Leader preparing execution',
 COMMITTING: 'Validators committing votes',
 REVEALING: 'Validators revealing votes',
 ACCEPTED: 'Consensus accepted; awaiting finality',
 FINALIZED: 'Finalized; confirming stored state',
 CANCELED: 'Transaction canceled',
 CANCELLED: 'Transaction canceled',
 UNDETERMINED: 'Consensus unresolved',
 APPEALREVEALING: 'Appeal validators revealing',
 APPEALCOMMITTING: 'Appeal validators committing',
 VALIDATORSTIMEOUT: 'Validator timeout; awaiting resolution',
 LEADERTIMEOUT: 'Leader timeout; awaiting resolution',
 LEADERREVEALING: 'Leader revealing execution'
};
export function txStage(status){
 const key = String(status||'UNKNOWN').toUpperCase().replace(/[^A-Z]/g,'');
 return labels[key] || ('Network status: ' + String(status||'UNKNOWN').slice(0,40));
}
export function elapsedLabel(milliseconds){
 const seconds=Math.max(0,Math.floor(Math.max(0,Number(milliseconds)||0)/1000));
 const minutes=Math.floor(seconds/60);
 return String(minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
