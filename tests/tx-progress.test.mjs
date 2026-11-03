import test from 'node:test';
import assert from 'node:assert/strict';
import {txStage,elapsedLabel} from '../lib/tx-progress.js';

test('GenLayer stages describe progression without asserting successful execution',()=>{
 assert.match(txStage('Pending'),/Queued/);
 assert.match(txStage('Accepted'),/awaiting finality/);
 assert.match(txStage('Finalized'),/confirming stored state/);
 assert.match(txStage('Undetermined'),/unresolved/);
 assert.match(txStage('AppealRevealing'),/Appeal/);
 assert.match(txStage('not-a-state'),/Network status/);
});
test('elapsed time is displayed clearly and remains bounded for malformed input',()=>{
 assert.equal(elapsedLabel(0),'00:00');
 assert.equal(elapsedLabel(65000),'01:05');
 assert.equal(elapsedLabel(125000),'02:05');
 assert.equal(elapsedLabel(-3000),'00:00');
});
