import './style.css';
import { project } from './project.js';
import { classifyTx, parseValue, verifyStored } from '../lib/verification.js';
import { runWorkerA, runWorkerB } from '../lib/workers.js';
import { createClient } from 'genlayer-stable';
import { studionet } from 'genlayer-stable/chains';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const explorer = 'https://explorer-studio.genlayer.com/tx/';
const pendingKey = project.id + '-pending-tx-v1';
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const CHAIN = 61999;
let config = null, account = '', busy = false, checking = false;

function notice(title, detail, phase=0, hash='') {
  $('txTitle').textContent = title;
  $('txMessage').textContent = detail;
  for(let n=1;n<=3;n++) $('phase'+n).className = n < phase ? 'done' : n===phase ? 'current' : '';
  $('txExplorer').hidden = !hash;
  if(hash) $('txExplorer').href = explorer + encodeURIComponent(hash);
}
function setBusy(v) {
  busy=v;
  document.querySelectorAll('button[data-sign]').forEach(b=>b.disabled=v||!config?.configured);
}
function showPage(name) {
  for(const p of ['overview','workflow','verify']) $(p).hidden = p!==name;
  for(const e of document.querySelectorAll('[data-page]')) e.classList.toggle('active',e.dataset.page===name);
  $('breadcrumb').textContent=name[0].toUpperCase()+name.slice(1);
  if(location.hash!=='#'+name) history.replaceState(null,'','#'+name);
}
for(const e of document.querySelectorAll('[data-page]'))
  e.addEventListener('click',()=>{showPage(e.dataset.page);window.scrollTo(0,0)});
window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)||'overview'));

function renderMeta() {
  document.title=project.name+' — GenLayer Studionet';
  $('brandName').textContent=project.name;
  $('category').textContent=project.eyebrow;
  $('heroTitle').textContent=project.title;
  $('heroSub').textContent=project.intro;
  $('featureText').textContent=project.feature;
  $('boundaries').textContent=project.boundaries;
  $('sourceLink').href='https://github.com/'+project.repo;
  $('githubLink').href='https://github.com/'+project.repo;
}
function makeField(key, title, kind, method) {
  const id='f_'+method+'_'+key;
  const options=kind.startsWith('select:')?kind.slice(7).split(','):[];
  const input=options.length
   ? '<select id="'+id+'" required>'+options.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select>'
   : kind==='textarea' ? '<textarea id="'+id+'" rows="4" required></textarea>'
   : '<input id="'+id+'" type="'+(kind==='number'?'number':'text')+'" '+(kind==='number'?'min="0" step="1"':'')+' '+(kind==='address'?'placeholder="0x..."':'')+' required>';
  return '<label class="'+(kind==='textarea'?'wide':'')+'">'+esc(title)+input+'</label>';
}
function renderForms(){
  $('forms').innerHTML=project.forms.map((f,i)=>
    '<section class="action"><span class="pill">'+esc(f.scope.toUpperCase())+' · '+esc(f.method)+'</span>'+
    '<h2 style="margin-top:13px">'+esc(f.title)+'</h2><p>'+esc(f.subtitle)+'</p>'+
    '<form id="form_'+esc(f.key)+'"><div class="fieldGrid">'+f.fields.map(x=>makeField(x[0],x[1],x[2],f.key)).join('')+'</div>'+
    '<div class="actions"><button class="primary" type="submit" data-sign>Review & sign transaction ↗</button>'+
    (f.preset?'<button class="outline" type="button" data-preset="'+esc(f.preset)+'" data-target="'+esc(f.key)+'">Load example</button>':'')+
    (project.id==='flowfault'&&f.key==='submit_evidence'?
      '<button class="outline" type="button" data-worker="A">Generate Worker A</button>'+
      '<button class="outline" type="button" data-worker="B">Generate Worker B</button>'+
      '<button class="outline" type="button" data-worker="B_FAULT">Generate faulty Worker B</button>':'')+
    '</div></form><p class="hint">Signing consumes test GEN. An example only fills a draft; it never signs or submits.</p></section>'
  ).join('');
  for(const f of project.forms){
    $('form_'+f.key).addEventListener('submit',ev=>{ev.preventDefault();startSign(f)});
  }
  for(const button of document.querySelectorAll('[data-preset]')){
    button.addEventListener('click',()=>{
      const target=button.dataset.target;
      for(const [k,v] of Object.entries(project.samples[button.dataset.preset]||{})){
        const field=$('f_'+target+'_'+k);
        if(field)field.value=String(v);
      }
      notice('Draft loaded','Review all fields and wallet roles before signing. This action has not submitted a transaction.');
    });
  }
  for(const b of document.querySelectorAll('[data-worker]'))
    b.addEventListener('click',()=>generateWorkerDraft(b.dataset.worker));
}
function updateAccount(v=''){
  account=v;
  $('walletBtn').textContent=v?v.slice(0,6)+'…'+v.slice(-4)+' · Disconnect':'Connect wallet';
  $('walletIdentity').textContent=v?'Connected wallet: '+v:'No wallet connected.';
}
async function connect(){
  if(account){updateAccount();return}
  if(!window.ethereum) throw Error('An EIP-1193 wallet (such as MetaMask) is required to sign.');
  const a=await window.ethereum.request({method:'eth_requestAccounts'});
  if(!ADDRESS.test(a?.[0]||''))throw Error('No valid wallet account.');
  updateAccount(a[0]);
  notice('Wallet connected','No transaction submitted. Review the role and arguments.');
}
$('walletBtn').onclick=()=>connect().catch(e=>notice('Wallet connection failed',e.message));
window.ethereum?.on?.('accountsChanged',a=>{updateAccount(a?.[0]||'');notice('Wallet changed','Please review the active role before signing again.')});
window.ethereum?.on?.('chainChanged',()=>notice('Network changed','Studionet 61999 is required for contract writes.'));
async function ensureWallet() {
  if(!account)await connect();
  if(!account)throw Error('Connect your wallet first');
  const desired='0x'+CHAIN.toString(16);
  let chain=await window.ethereum.request({method:'eth_chainId'});
  if(parseInt(chain,16)!==CHAIN){
    try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:desired}]})}
    catch(e){
      if(e?.code!==4902)throw Error('Switch wallet to Studionet 61999 first');
      await window.ethereum.request({method:'wallet_addEthereumChain',params:[{
        chainId:desired, chainName:'GenLayer Studionet',
        rpcUrls:['https://studio.genlayer.com/api'],
        nativeCurrency:{name:'GEN',symbol:'GEN',decimals:18},
        blockExplorerUrls:['https://explorer-studio.genlayer.com']
      }]});
    }
  }
  chain=await window.ethereum.request({method:'eth_chainId'});
  if(parseInt(chain,16)!==CHAIN)throw Error('Wallet not on Studionet 61999');
  return createClient({chain:studionet,account,provider:window.ethereum});
}
async function api(scope,method,inputs=[]) {
  const u=new URL('/api/state',location.origin);
  u.searchParams.set('scope',scope);u.searchParams.set('method',method);
  for(let i=0;i<inputs.length;i++) u.searchParams.set('a'+i,String(inputs[i]));
  const response=await fetch(u,{cache:'no-store'});
  const json=await response.json();
  if(!response.ok||!json.ok)throw Error(json.error||'Chain read unavailable');
  return parseValue(json.value);
}
async function sha256(s){
  const bytes=new TextEncoder().encode(s);
  const d=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');
}
function numberField(v){if(!/^(0|[1-9][0-9]*)$/.test(v)||!Number.isSafeInteger(Number(v)))throw Error('Invalid whole number');return Number(v)}
function argValues(f){
 return f.fields.map(([key,,kind])=>{
   const v=$('f_'+f.key+'_'+key).value.trim();
   if(!v) throw Error('Missing '+key);
   if(kind==='number')return numberField(v);
   if(kind==='address'&&!ADDRESS.test(v))throw Error('Invalid wallet address in '+key);
   return v;
 });
}
async function preflightWrite(f, values, actor) {
  const method=f.method;
  const addr=actor.toLowerCase();
  if(method==='create_mandate'){
    if(values[0].toLowerCase()===addr)throw Error('Delegate must be a different wallet.');
    if(values[3]<1||values[3]>20)throw Error('Maximum ballot uses must be 1–20.');
  }
  if(method==='create_proposal' && values[2]>1000000000)
    throw Error('Declared budget exceeds the contract limit.');
  if(method==='assess'){
    const [m,p,previous]=await Promise.all([
      api('registry','get_mandate',[values[0]]),
      api('registry','get_proposal',[values[1]]),
      api('registry','get_assessment',[values[0],values[1]])
    ]);
    if(!m.active)throw Error('Mandate was revoked. No AI assessment can be signed.');
    if(!p?.id)throw Error('Proposal not found.');
    if(previous?.mandate_version===m.version)throw Error('Already adjudicated for the active mandate version.');
  }
  if(method==='update_mandate'||method==='revoke_mandate'){
    const m=await api('registry','get_mandate',[values[0]]);
    if(m.owner?.toLowerCase()!==addr)throw Error('Only the original member can change this mandate.');
    if(!m.active)throw Error('Mandate is already revoked.');
    if(method==='update_mandate'&&values[1]===m.policy)throw Error('Replacement policy must differ from the current version.');
  }
  if(method==='cast_vote'){
    const [auth,already,usage,mandate,memberExisting]=await Promise.all([
      api('registry','authorization',[values[0],values[1],actor]),
      api('gate','ballot_for',[values[0],values[1]]),
      api('gate','mandate_usage',[values[0]]),
      api('registry','get_mandate',[values[0]]),
      api('registry','get_mandate',[values[0]]).then(m=>api('gate','member_ballot_for',[m.owner,values[1]]))
    ]);
    if(!auth?.allowed||auth?.decision!=='ALIGNED')throw Error('No current ALIGNED authorization for this delegate and proposal.');
    if(auth.delegate?.toLowerCase()!==addr||auth.direction!==values[2])
      throw Error('Connected delegate or vote direction does not match the signed mandate.');
    if(already)throw Error('This mandate already voted on this proposal; duplicate blocked.');
    if(memberExisting)throw Error('Member already voted on this proposal through another mandate.');
    if(mandate.owner?.toLowerCase()!==auth.owner?.toLowerCase())throw Error('Registry member mismatch.');
    if(Number(usage)>=auth.max_votes)throw Error('Delegation vote cap reached.');
  }
}
function confirmWrite(f,values,actor,address) {
  const argText=f.fields.map((fld,i)=>fld[0]+': '+String(values[i]).slice(0,190)).join('\n');
  return window.confirm('REVIEW GENLAYER TESTNET TRANSACTION\n\n'+
    'Method: '+f.method+'\nWallet: '+actor+'\nContract: '+address+
    '\nNetwork: GenLayer Studionet (61999)\n\n'+argText+
    '\n\nOnly approve if the wallet, contract and arguments are correct. This is a REAL on-chain testnet write.');
}

async function startSign(f) {
  if(busy)return;
  const prior=loadPending();
  if(prior){notice('Pending transaction still stored','Recheck the same transaction before signing another.',1,prior.hash);$('recheck').hidden=false;return}
  if(!config?.configured){notice('Studio deployment required','Configure both deployed contracts before any signing. No transaction sent.');return}
  let values;
  try{
    values=argValues(f);
    if(f.key==='submit_evidence'||f.key==='submit_rework'){
      const outputIndex=f.key==='submit_evidence'?1:1;
      const hashIndex=2;
      const expected=await sha256(values[outputIndex]);
      if(values[hashIndex]!==expected)throw Error('Submitted digest differs from the exact output text. Click Generate or recalculate SHA-256.');
    }
    const contract=config[f.scope];
    if(!ADDRESS.test(contract||''))throw Error('Configured contract address unavailable');
    await ensureWallet();
    const activeWallet=account.toLowerCase();
    await preflightWrite(f,values,activeWallet);
    const record={form:f.key,scope:f.scope,method:f.method,args:values,actor:activeWallet,hash:'',prior:null};
    if(f.key==='update_mandate'||f.key==='assess'){
      record.prior=(await api('registry','get_mandate',[values[0]])).version;
    }
    if(!confirmWrite(f,values,activeWallet,contract)){
      notice('Transaction not signed','Review cancelled. No transaction sent.');
      return;
    }
    const sender=createClient({chain:studionet,account,provider:window.ethereum});
    setBusy(true);
    notice('Confirm in wallet','Review '+f.method+' and the destination contract. No tx has been broadcast yet.',1);
    const hash=await sender.writeContract({address:contract,functionName:f.method,args:values,value:0n});
    if(!/^0x[0-9a-fA-F]{64}$/.test(hash||''))throw Error('No valid transaction hash returned');
    record.hash=hash;
    sessionStorage.setItem(pendingKey,JSON.stringify(record));
    $('recheck').hidden=false;
    setBusy(false);
    await follow(record);
  }catch(e){setBusy(false);notice('No verified write',e?.message||String(e))}
}
function loadPending(){try{return JSON.parse(sessionStorage.getItem(pendingKey)||'null')}catch{return null}}
async function follow(record){
  if(checking)return;
  checking=true;setBusy(true);$('recheck').hidden=false;
  notice('Waiting for GenLayer finality','Do not sign the same transaction twice. Checking execution and persisted state.',2,record.hash);
  try{
    for(let attempt=0;attempt<65;attempt++){
      let response;
      try{
        const r=await fetch('/api/tx?hash='+encodeURIComponent(record.hash),{cache:'no-store'});
        response=await r.json();
        if(!r.ok||!response.ok)throw Error(response.error||'Transaction query failed');
      }catch(e){await new Promise(res=>setTimeout(res,3500));continue}
      const phase=classifyTx(response);
      if(phase==='error'){
        sessionStorage.removeItem(pendingKey);
        notice('FINALIZED · execution failed','Transaction was not executed successfully. Preserve the hash to debug.',2,record.hash);
        return;
      }
      if(phase==='success'){
        for(let k=0;k<7;k++){
          try{
            const proof=await verifyRecord(record);
            if(proof.ok){
              sessionStorage.removeItem(pendingKey);
              notice('FINALIZED / VERIFIED',proof.message,3,record.hash);
              await fillDefaultReads();
              return;
            }
          }catch(e){}
          await new Promise(res=>setTimeout(res,2500));
        }
        notice('FINALIZED · state unverified','Execution succeeded but matching persisted state has NOT yet been established. Recheck the same hash; do not submit again.',2,record.hash);
        return;
      }
      await new Promise(res=>setTimeout(res,3600));
    }
    notice('Not yet confirmed','Transaction hash is stored; recheck it later. Never sign duplicate while pending.',2,record.hash);
  }finally{checking=false;setBusy(false)}
}
async function verifyRecord(record){
  const a=record.args,actor=record.actor,method=record.method;
  const read=(scope,name,...args)=>api(scope,name,args);
  if(method==='create_mandate'||method==='create_proposal'||method==='open_case'){
    const scope=method==='open_case'?'court':'registry';
    const totals=await read(scope,'totals');
    const key=method==='create_mandate'?'mandates':method==='create_proposal'?'proposals':'cases';
    const getter=method==='create_mandate'?'get_mandate':method==='create_proposal'?'get_proposal':'get_case';
    for(let id=totals[key];id>Math.max(0,totals[key]-20);id--){
      const x=await read(scope,getter,id);
      if(verifyStored(record,x))return {ok:true,message:method+' recorded as #'+id+' with finalized state.'};
    }
    return {ok:false};
  }
  if(method==='assess'){
    const x=await read('registry','get_assessment',a[0],a[1]);
    if(verifyStored(record,x))return{ok:true,message:'Persisted comparative AI outcome: '+x.decision};
  }
  if(method==='cast_vote'){
    const x=await read('gate','ballot_for',a[0],a[1]);
    if(verifyStored(record,x))return{ok:true,message:'Delegated ballot #'+x.id+' verified in the Ballot contract.'};
  }
  if(method==='revoke_mandate'||method==='update_mandate'){
    const x=await read('registry','get_mandate',a[0]);
    if(verifyStored(record,x))return{ok:true,message:'Mandate change verified at version '+x.version};
  }
  if(method==='submit_evidence'||method==='open_dispute'||method==='adjudicate'){
    const x=await read('court','get_case',a[0]);
    if(verifyStored(record,x))return{ok:true,message:method==='adjudicate'?'Persisted AI verdict: '+x.verdict:'Case #'+a[0]+' updated and verified.'};
  }
  if(method==='submit_rework'){
    const x=await read('gate','receipt_for',a[0]);
    if(verifyStored(record,x))return{ok:true,message:'Recovery receipt #'+x.id+' stored: '+x.status};
  }
  return {ok:false};
}
function renderReads(){
  $('readMethod').innerHTML=project.reads.map((r,i)=>'<option value="'+i+'">'+esc(r[0])+' · '+esc(r[2])+'</option>').join('');
}
async function handleRead(){
  const r=project.reads[Number($('readMethod').value)];
  const primary=numberField($('readId').value||'1');
  const secondary=numberField($('readOther').value||'1');
  const actor=$('readActor').value.trim();
  const args=r[3]==='none'?[]:r[3]==='id'?[primary]:r[3]==='two'?[primary,secondary]:r[3]==='member'?[actor,secondary]:[primary,secondary,actor];
  if((r[3]==='actor'||r[3]==='member')&&!ADDRESS.test(actor))throw Error('Enter a wallet address for this live authorization read');
  const result=await api(r[1],r[2],args);
  $('readResult').textContent=JSON.stringify(result,null,2);
}
$('readForm').onsubmit=async e=>{e.preventDefault();$('readResult').textContent='Reading latest-final on-chain state…';try{await handleRead()}catch(err){$('readResult').textContent='READ FAILED: '+err.message}};
async function fillDefaultReads(){
  if(!$('verify').hidden){try{await handleRead()}catch{}}
}
async function refreshConfig(){
  try{
    const r=await fetch('/api/state?op=config',{cache:'no-store'});
    config=await r.json();
    if(!r.ok)throw Error('Config unavailable');
    if(config.configured){
      const [totals,ballot]=await Promise.all([api('registry','totals'),api('gate','stats')]);
      if(!Number.isSafeInteger(totals?.mandates)||!Number.isSafeInteger(totals?.proposals)||
         ballot?.registry?.toLowerCase()!==config.registry.toLowerCase())
        throw Error('Studio preflight failed: missing finalized state or ballot registry link mismatch.');
    }
    $('network').textContent=config.configured?'Studionet 61999 · live contracts verified':'Studio deployment pending';
    $('network').classList.toggle('pending',!config.configured);
    if(!config.configured)notice('Waiting for Studio deployment','Both contracts need deployment, addresses and readback preflight before wallet signing.');
  }catch(e){
    config={configured:false};
    $('network').textContent='RPC / deployment unverified';
    $('network').classList.add('pending');
    notice('Unavailable',e.message);
  }
  setBusy(false);
}
async function generateWorkerDraft(role) {
  try{
    const field=$('f_submit_evidence_case_id');
    const id=numberField(field.value);
    const c=await api('court','get_case',[id]);
    if(role==='A'){
      const result=runWorkerA(c.source_data);
      $('f_submit_evidence_output').value=result;
    } else {
      if(!c.a_output)throw Error('Worker A must first submit a finalized artifact.');
      $('f_submit_evidence_output').value=runWorkerB(c.a_output,role==='B_FAULT');
    }
    $('f_submit_evidence_output_sha256').value=await sha256($('f_submit_evidence_output').value);
    notice('Worker artifact generated','This is actual deterministic browser code output, not an AI verdict. Review and sign with the assigned worker wallet.');
  }catch(e){notice('Could not generate artifact',e.message)}
}
$('recheck').onclick=async()=>{const record=loadPending();if(record)await follow(record);else notice('No pending hash','Previous status remains visible; no automatic retry was sent.')};
renderMeta();renderForms();renderReads();showPage(['overview','workflow','verify'].includes(location.hash.slice(1))?location.hash.slice(1):'overview');
refreshConfig().then(()=>{const r=loadPending();if(r?.hash){$('recheck').hidden=false;follow(r)}});
