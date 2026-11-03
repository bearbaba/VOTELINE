/** Wallet-scoped display filters; the underlying on-chain records remain publicly readable. */
export const ACTIVITY_BATCH_SIZE=30;
export function recentRecordIds(total, limit=ACTIVITY_BATCH_SIZE){
 if(!Number.isSafeInteger(total)||total<0) return [];
 const size=Math.min(Math.max(0,Math.trunc(limit)),total,150);
 return Array.from({length:size},(_,i)=>total-i);
}
export function belongsToWallet(kind, record, wallet){
 const norm=value=>typeof value==='string' && /^0x[0-9a-fA-F]{40}$/.test(value)?value.toLowerCase():'';
 const actor=norm(wallet);
 if(!actor||!record||typeof record!=='object')return false;
 if(kind==='mandate')return norm(record.owner)===actor;
 if(kind==='proposal')return norm(record.proposer)===actor;
 if(kind==='ballot')return norm(record.actor)===actor||norm(record.owner)===actor;
 return false;
}
export function validReceiptForWallet(receipt, wallet){
 const norm=a=>typeof a==='string'&&/^0x[0-9a-fA-F]{40}$/.test(a)?a.toLowerCase():'';
 return norm(wallet)!==''&&norm(receipt?.actor)===norm(wallet)&&
    typeof receipt?.hash==='string'&&/^0x[0-9a-fA-F]{64}$/.test(receipt.hash);
}
