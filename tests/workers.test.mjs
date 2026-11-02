import test from 'node:test';
import assert from 'node:assert/strict';
import {runWorkerA,runWorkerB} from '../lib/workers.js';
const fixture=JSON.stringify([{id:'INV1',amount:12,approved:true},{id:'INV2',amount:6,approved:false},{id:'INV3',amount:8,approved:true}]);
test('A produces deterministic approved total',()=>{
 assert.deepEqual(JSON.parse(runWorkerA(fixture)),{approvedIds:['INV1','INV3'],approvedTotal:20});
});
test('B faithfully uses A output in normal flow',()=>{
 assert.equal(JSON.parse(runWorkerB(runWorkerA(fixture))).reportedTotal,20);
});
test('fault scenario shows a measurable B deviation',()=>{
 assert.equal(JSON.parse(runWorkerB(runWorkerA(fixture),true)).reportedTotal,27);
});
test('reject duplicate IDs and invalid amounts',()=>{
 assert.throws(()=>runWorkerA('[{"id":"A","amount":-1,"approved":true}]'));
 assert.throws(()=>runWorkerA('[{"id":"A","amount":1,"approved":true},{"id":"A","amount":2,"approved":true}]'));
});
