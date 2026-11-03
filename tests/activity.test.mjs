import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITY_BATCH_SIZE,recentRecordIds,belongsToWallet,validReceiptForWallet} from '../lib/activity.js';
const member='0x'+'1'.repeat(40),delegate='0x'+'2'.repeat(40),other='0x'+'3'.repeat(40);
test('record history uses only latest bounded positive IDs',()=>{
 assert.equal(ACTIVITY_BATCH_SIZE,30);
 assert.deepEqual(recentRecordIds(3),[3,2,1]);
 assert.deepEqual(recentRecordIds(6,2),[6,5]);
 assert.deepEqual(recentRecordIds(-2),[]);
 assert.equal(recentRecordIds(100000,300).length,150);
});
test('wallet history filters members, creators, and vote actor or represented owner',()=>{
 assert.equal(belongsToWallet('mandate',{owner:member},member),true);
 assert.equal(belongsToWallet('mandate',{owner:other},member),false);
 assert.equal(belongsToWallet('proposal',{proposer:member},member.toUpperCase().replace('0X','0x')),true);
 assert.equal(belongsToWallet('proposal',{proposer:other},member),false);
 assert.equal(belongsToWallet('ballot',{actor:delegate,owner:member},member),true);
 assert.equal(belongsToWallet('ballot',{actor:delegate,owner:member},delegate),true);
 assert.equal(belongsToWallet('ballot',{actor:delegate,owner:member},other),false);
});
test('receipt hashes are never attributed to a different account',()=>{
 const tx={actor:member,hash:'0x'+'a'.repeat(64)};
 assert.equal(validReceiptForWallet(tx,member),true);
 assert.equal(validReceiptForWallet(tx,other),false);
 assert.equal(validReceiptForWallet({...tx,hash:'evil'},member),false);
});
