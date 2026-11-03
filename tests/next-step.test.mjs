import test from 'node:test';
import assert from 'node:assert/strict';
import {nextStepFor} from '../lib/next-step.js';

test('mandate and proposal successes guide the next action',()=>{
 assert.equal(nextStepFor('create_mandate').target,'create_proposal');
 assert.equal(nextStepFor('create_proposal').target,'assess');
});
test('AI decision must be ALIGNED and authorization confirmed before offering Vote',()=>{
 assert.equal(nextStepFor('assess','ALIGNED',true).target,'cast_vote');
 assert.equal(nextStepFor('assess','ALIGNED',undefined).target,'verify');
 assert.equal(nextStepFor('assess','ALIGNED',false).target,'verify');
 for(const verdict of ['CONFLICT','REVIEW','UNVERIFIABLE']){
  assert.notEqual(nextStepFor('assess',verdict,true).target,'cast_vote');
 }
});
test('a recorded vote ends with history instead of another vote',()=>{
 assert.equal(nextStepFor('cast_vote').target,'history');
});
