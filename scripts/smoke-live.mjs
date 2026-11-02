import {readFileSync} from 'node:fs';
const expected=JSON.parse(readFileSync('deployments/studionet.json','utf8'));
const base='https://voteline.vercel.app';
const check=(condition,reason)=>{if(!condition)throw Error(reason)};
async function get(path){
 const response=await fetch(base+path,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000),redirect:'manual'});
 check(response.status===200,'HTTP '+response.status+' at '+path+(response.headers.get('location')?' redirect: '+response.headers.get('location'):''));
 const text=await response.text();
 check(!/Vercel Authentication|Log in to Vercel/i.test(text),'Deployment is protected at '+path);
 return text;
}
const html=await get('/');
check(html.includes('GenLayer Project Workspace'),'Website HTML missing');
const config=JSON.parse(await get('/api/state?op=config'));
check(config.configured&&config.chainId===61999,'Config missing or wrong chain');
check(config.registry.toLowerCase()===expected.registry.toLowerCase(),'Registry address mismatch');
check(config.gate.toLowerCase()===expected.ballot.toLowerCase(),'Gate address mismatch');
const registry=JSON.parse(await get('/api/state?scope=registry&method=totals'));
const totals=typeof registry.value==='string'?JSON.parse(registry.value):registry.value;
check(registry.finality==='LATEST_FINAL'&&Number.isInteger(totals.mandates)&&Number.isInteger(totals.proposals),'Registry finalized read invalid');
const gate=JSON.parse(await get('/api/state?scope=gate&method=stats'));
const stats=typeof gate.value==='string'?JSON.parse(gate.value):gate.value;
check(gate.finality==='LATEST_FINAL'&&Number.isInteger(stats.ballots),'Ballot finalized read invalid');
check(String(stats.registry).toLowerCase()===expected.registry.toLowerCase(),'Critical: Gate linked to unexpected Registry');
console.log('WEB + API SMOKE PASS',JSON.stringify({base,registry:expected.registry,gate:expected.ballot,totals,stats}));
