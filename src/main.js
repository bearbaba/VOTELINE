import './style.css';
import { project, evidence } from './project.js';
import { classifyTx, parseValue, verifyStored } from '../lib/verification.js';
import {txStage,elapsedLabel} from '../lib/tx-progress.js';
import {recentRecordIds,belongsToWallet,validReceiptForWallet} from '../lib/activity.js';
import { runWorkerA, runWorkerB } from '../lib/workers.js';
import { createClient } from 'genlayer-stable';
import { studionet } from 'genlayer-stable/chains';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const explorer = 'https://explorer-studio.genlayer.com/tx/';
const pendingKey = project.id + '-pending-tx-v1';
const receiptKey = project.id + '-local-receipts-v1';
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const CHAIN = 61999;
let config = null, account = '', busy = false, checking = false;
let activityRequest=0, activityLimit=30;

function notice(title, detail, phase=0, hash='', state='idle') {
  $('txTitle').textContent = title;
  $('txMessage').textContent = detail;
  for(let n=1;n<=3;n++) $('phase'+n).className = n < phase ? 'done' : n===phase ? 'current' : '';
  $('txExplorer').hidden = !hash;
  if(hash) $('txExplorer').href = explorer + encodeURIComponent(hash);
  const live=$('txProgress');
  live.hidden=state!=='pending';
  if(state!=='pending')live.textContent='';
  document.querySelector('.activity').dataset.txState=state;
}
function setBusy(v) {
  busy=v;
  // An in-flight signature is an immutable snapshot: do not allow presets,
  // edits, wallet changes or a second submission to rewrite the displayed input.
  document.querySelectorAll('#forms input,#forms select,#forms textarea,#forms button,[data-flow],#walletBtn,[data-focus]').forEach(b=>b.disabled=v);
  document.querySelectorAll('button[data-sign]').forEach(b=>b.disabled=v||!config?.configured);
}
function showPage(name) {
  for(const p of ['overview','workflow','history','verify']) $(p).hidden = p!==name;
  for(const e of document.querySelectorAll('[data-page]')) e.classList.toggle('active',e.dataset.page===name);
  $('breadcrumb').textContent=name[0].toUpperCase()+name.slice(1);
  if(location.hash!=='#'+name) history.replaceState(null,'','#'+name);
  if(name==='history')renderMyActivity();
}
for(const e of document.querySelectorAll('[data-page]'))
  e.addEventListener('click',()=>{showPage(e.dataset.page);window.scrollTo(0,0)});
window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)||'overview'));


function readReceipts(){
 try{
  const data=JSON.parse(localStorage.getItem(receiptKey)||'[]');
  return Array.isArray(data)?data:[];
 }catch{return []}
}
function saveReceipt(record,status,id){
 if(!/^0x[0-9a-fA-F]{64}$/.test(record?.hash||'')||!ADDRESS.test(record?.actor||''))return;
 try{
  const previous=readReceipts().filter(x=>x?.hash!==record.hash);
  const entry={
   hash:record.hash,actor:record.actor,method:String(record.method||'unknown').slice(0,40),
   createdAt:record.startedAt||Date.now(),status,
   recordId:Number.isSafeInteger(id)&&id>0?id:null
  };
  localStorage.setItem(receiptKey,JSON.stringify([entry,...previous].slice(0,80)));
  if(!$('history').hidden)renderSavedReceipts();
 }catch{/* Storage may be disabled; on-chain records remain accessible. */}
}
function renderSavedReceipts(){
 const root=$('historyReceipts');
 if(!root)return;
 const wallet=account.toLowerCase();
 if(!ADDRESS.test(wallet)){root.innerHTML='<p>Connect your wallet to see receipts signed in this browser.</p>';return;}
 const receipts=readReceipts().filter(r=>validReceiptForWallet(r,wallet)).slice(0,30);
 root.innerHTML=receipts.length?receipts.map(r=>{
  const date=Number.isFinite(r.createdAt)?new Date(r.createdAt).toLocaleString():'Date unavailable';
  const status=['VERIFIED','FAILED','PENDING','UNVERIFIED'].includes(r.status)?r.status:'UNVERIFIED';
  const id=Number.isSafeInteger(r.recordId)&&r.recordId>0?' #'+r.recordId:'';
  return '<div class="historyReceipt"><div><strong>'+esc(r.method)+esc(id)+' · '+esc(status)+'</strong>'+
   '<small>'+esc(date)+' · '+esc(r.hash.slice(0,10))+'…'+esc(r.hash.slice(-8))+'</small></div>'+
   '<a target="_blank" rel="noopener" href="'+explorer+esc(r.hash)+'">Explorer ↗</a></div>';
 }).join(''):'<p>No signed transactions have been saved in this browser for this wallet yet. On-chain records above are still available.</p>';
}
async function scanActivity(scope,method,count,kind,wallet,limit){
 const ids=recentRecordIds(count,limit);
 const rows=[];let errors=0,next=0;
 await Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{
  while(next<ids.length){
   const id=ids[next++];
   try{
    const item=await api(scope,method,[id]);
    if(belongsToWallet(kind,item,wallet))rows.push(item);
   }catch{errors++;}
  }
 }));
 rows.sort((a,b)=>b.id-a.id);
 return {rows,errors};
}
function displayHistoryGroup(label,items,kind){
 const fmt=item=>{
  if(kind==='mandate')return 'Delegate '+String(item.delegate||'').slice(0,8)+'…'+String(item.delegate||'').slice(-4)+
   ' · '+item.direction+' · Cap '+item.max_votes+' · '+(item.active?'Active':'Revoked');
  if(kind==='proposal')return 'Budget '+item.budget_units+' units · '+String(item.title||'');
  return 'Proposal #'+item.proposal_id+' · Mandate #'+item.mandate_id+
   ' · '+item.choice+' · '+(String(item.actor).toLowerCase()===account.toLowerCase()?'Signed by delegate':'Represented member');
 };
 const method=kind==='mandate'?'get_mandate':kind==='proposal'?'get_proposal':'get_ballot';
 return '<section class="historyGroup"><h2>'+esc(label)+' <span>'+items.length+'</span></h2>'+
  (items.length?items.map(item=>
   '<div class="historyEntry"><strong>'+esc(kind==='mandate'?'Mandate':kind==='proposal'?'Proposal':'Ballot')+
   ' #'+esc(item.id)+'</strong><p>'+esc(fmt(item))+'</p>'+
   '<button type="button" data-history-read="'+method+'" data-history-id="'+esc(item.id)+'">Read finalized state ↗</button></div>'
  ).join(''):'<div class="historyEmpty">No matching records in the scanned range.</div>')+
  '</section>';
}
async function renderMyActivity(){
 const generation=++activityRequest;
 const wallet=account.toLowerCase();
 $('historyWallet').textContent=ADDRESS.test(wallet)?wallet:'Not connected';
 renderSavedReceipts();
 if(!ADDRESS.test(wallet)){
  $('historyStatus').textContent='Connect your wallet using the button above.';
  $('historyList').innerHTML='<div class="historyEmpty">Connect a wallet to load its finalized mandates, proposals and votes.</div>';
  $('historyOlder').hidden=true;
  return;
 }
 if(!config?.configured){
  $('historyStatus').textContent='Waiting for the GenLayer contract connection.';
  $('historyList').innerHTML='<div class="historyEmpty">The network is not ready. Refresh records once the network indicator is verified.</div>';
  $('historyOlder').hidden=true;
  return;
 }
 $('historyStatus').textContent='Checking latest-final on-chain records…';
 $('historyList').innerHTML='<div class="historyEmpty">Loading wallet-scoped records automatically…</div>';
 $('historyOlder').disabled=true;
 try{
  const [registry,gate]=await Promise.all([api('registry','totals'),api('gate','stats')]);
  const [mandates,proposals,ballots]=await Promise.all([
   scanActivity('registry','get_mandate',registry.mandates,'mandate',wallet,activityLimit),
   scanActivity('registry','get_proposal',registry.proposals,'proposal',wallet,activityLimit),
   scanActivity('gate','get_ballot',gate.ballots,'ballot',wallet,activityLimit)
  ]);
  if(generation!==activityRequest||wallet!==account.toLowerCase())return;
  $('historyList').innerHTML=
   displayHistoryGroup('My mandates',mandates.rows,'mandate')+
   displayHistoryGroup('My proposals',proposals.rows,'proposal')+
   displayHistoryGroup('My voting records',ballots.rows,'ballot');
  const errors=mandates.errors+proposals.errors+ballots.errors;
  const count=mandates.rows.length+proposals.rows.length+ballots.rows.length;
  const hasOlder=activityLimit<150&&[registry.mandates,registry.proposals,gate.ballots].some(n=>n>activityLimit);
  $('historyStatus').textContent=count+' matching on-chain records · '+(errors?errors+' reads unavailable; results may be incomplete':'Latest-final data')+
    (hasOlder?' · More older IDs available':'');
  $('historyOlder').hidden=!hasOlder;
  $('historyOlder').disabled=false;
 }catch(e){
  if(generation!==activityRequest)return;
  $('historyStatus').textContent='Network query unavailable. No results inferred.';
  $('historyList').innerHTML='<div class="historyEmpty">'+esc(e.message||'Unable to fetch finalized records')+'</div>';
  $('historyOlder').hidden=true;
  $('historyOlder').disabled=false;
 }
}
$('historyRefresh').addEventListener('click',()=>renderMyActivity());
$('historyOlder').addEventListener('click',()=>{activityLimit=Math.min(activityLimit+30,150);renderMyActivity()});
$('historyList').addEventListener('click',event=>{
 const button=event.target.closest('[data-history-read]');
 if(!button)return;
 const id=Number(button.dataset.historyId);
 const method=button.dataset.historyRead;
 const index=project.reads.findIndex(r=>r[2]===method);
 if(!Number.isSafeInteger(id)||id<1||index<0)return;
 $('readMethod').value=String(index);
 $('readId').value=String(id);
 updateReadFields();showPage('verify');
 handleRead().catch(e=>{$('readResult').textContent='READ FAILED: '+e.message});
});

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
  if(project.id==='voteline'){
    const box=document.createElement('details'); box.className='advancedActions';
    const header=document.createElement('summary'); header.textContent='Advanced controls · Update or revoke mandate';
    box.append(header);
    for(const card of [...$('forms').querySelectorAll('.action')].slice(4))box.append(card);
    $('forms').append(box);
  }
  for(const btn of document.querySelectorAll('[data-flow]')) {
    btn.addEventListener('click',()=>activateForm(btn.dataset.flow));
  }
  activateForm('create_mandate');
  for(const f of project.forms){
    $('form_'+f.key).addEventListener('submit',ev=>{ev.preventDefault();startSign(f)});
  }
  for(const button of document.querySelectorAll('[data-preset]')){
    button.addEventListener('click',()=>{
      if(busy||checking||loadPending())return;
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
function activateForm(key){
  if(busy||checking)return;
  for(const f of project.forms.slice(0,4)){
    const card=$('form_'+f.key)?.closest('.action');
    if(card)card.hidden=f.key!==key;
  }
  for(const btn of document.querySelectorAll('[data-flow]')){
    btn.classList.toggle('active',btn.dataset.flow===key);
    btn.setAttribute('aria-current',btn.dataset.flow===key?'step':'false');
  }
}
for(const btn of document.querySelectorAll('[data-focus]')){
 btn.addEventListener('click',()=>{
  showPage('workflow');
  activateForm(btn.dataset.focus);
  const form=$('form_'+btn.dataset.focus);
  form?.closest('.action')?.scrollIntoView({behavior:'smooth',block:'start'});
  form?.querySelector('input,textarea,select')?.focus({preventScroll:true});
 });
}
function updateAccount(v=''){
  account=v;
  activityRequest++;
  activityLimit=30;
  if(!$('history').hidden)renderMyActivity();
  $('walletBtn').textContent=v?v.slice(0,6)+'…'+v.slice(-4)+' · Clear':'Connect wallet';
  $('walletBtn').title=v?'Clear local selection only. Revoke site permission in wallet settings.':'Connect an EIP-1193 wallet';
  $('walletIdentity').textContent=v?'Connected wallet: '+v:'No wallet connected.';
}
async function connect(){
  if(account){updateAccount();notice('Page session cleared','This site has cleared its selected wallet. Revoke website access separately in your wallet settings if desired.');return}
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

async function loadEvidence(){
 const target=$('proofGrid');
 if(!target)return;
 if(!config?.configured){target.textContent='Live contracts unavailable; proof cannot currently be verified.';return;}
 target.textContent='Reading finalized AI decisions and ballot authorizations…';
 try{
  const rows=await Promise.all(evidence.proofs.map(async p=>{
   const [assessment,auth,ballot]=await Promise.all([
    api('registry','get_assessment',[evidence.mandateId,p.proposalId]),
    api('registry','authorization',[evidence.mandateId,p.proposalId,evidence.delegate]),
    api('gate','ballot_for',[evidence.mandateId,p.proposalId])
   ]);
   const valid=assessment?.decision===p.verdict && assessment?.mandate_version===1 &&
     (p.proposalId===1 ? auth?.allowed===true && ballot?.id===1 && ballot?.choice==='FOR' &&
       String(ballot?.actor||'').toLowerCase()===evidence.delegate.toLowerCase()
      : auth?.allowed===false && !ballot);
   return {p,valid,actual:assessment?.decision||'UNKNOWN'};
  }));
  target.innerHTML=rows.map(({p,valid,actual})=>{
   const tone=valid?(p.proposalId===1?'pass':'deny'):'unknown';
   const status=valid?(p.proposalId===1?'VOTE VERIFIED':'DENIED · NO BALLOT'):'NOT VERIFIED';
   const detail=valid?(p.proposalId===1?'Delegate signed FOR ballot #1.':'Authorization is false; no ballot recorded.'):'Live state did not match the expected evidence.';
   return '<article class="proofCard '+tone+'"><div class="proofTop"><span>PROPOSAL #'+p.proposalId+'</span><span class="proofBadge">'+esc(status)+'</span></div>'+
    '<h3>'+esc(actual)+'</h3><p>'+esc(detail)+'</p><div class="proofLinks">'+
    '<a target="_blank" rel="noopener" href="'+explorer+p.assessmentTx+'">AI transaction ↗</a>'+
    '<a target="_blank" rel="noopener" href="'+explorer+p.ballotTx+'">'+(p.proposalId===1?'Ballot receipt ↗':'Rejected vote ↗')+'</a></div></article>';
  }).join('');
 }catch(e){target.textContent='Finalized state unavailable: '+String(e?.message||e).slice(0,190)+'. See the signed evidence ledger. No result is being assumed.';}
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
  if(busy||checking)return;
  const prior=loadPending();
  if(prior){
    // Never send a second transaction while a previous hash is unresolved.
    await follow(prior);
    return;
  }
  if(!config?.configured){notice('Studio deployment required','Configure both deployed contracts before any signing. No transaction sent.');return}
  setBusy(true);
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
    notice('Confirm in wallet','Review '+f.method+' and the destination contract. No tx has been broadcast yet.',1,'','pending');
    $('txProgress').textContent='Waiting for your wallet signature · no transaction broadcast yet.';
    const hash=await sender.writeContract({address:contract,functionName:f.method,args:values,value:0n});
    if(!/^0x[0-9a-fA-F]{64}$/.test(hash||''))throw Error('No valid transaction hash returned');
    record.hash=hash;
    record.startedAt=Date.now();
    sessionStorage.setItem(pendingKey,JSON.stringify(record));
    saveReceipt(record,'PENDING');
    await follow(record);
  }catch(e){
    const pending=loadPending();
    if(pending?.hash){
      notice('Tracking interrupted','Transaction hash is saved; status has not been verified. Tracking can resume without resubmitting.',2,pending.hash,'paused');
      $('recheck').hidden=false;
    }else notice('No verified write',e?.message||String(e),0,'','error');
  }finally{
    if(!checking)setBusy(false);
  }
}
function loadPending(){try{return JSON.parse(sessionStorage.getItem(pendingKey)||'null')}catch{return null}}
function restorePendingForm(record){
 const f=project.forms.find(x=>x.key===record.form);
 if(!f||!Array.isArray(record.args))return;
 for(let i=0;i<f.fields.length;i++){
  const field=$('f_'+f.key+'_'+f.fields[i][0]);
  if(field && record.args[i]!==undefined)field.value=String(record.args[i]);
 }
 activateForm(f.key);
 showPage('workflow');
}
async function follow(record){
  if(checking || !record?.hash)return;
  checking=true;setBusy(true);$('recheck').hidden=true;
  const started=Number.isFinite(record.startedAt)?record.startedAt:Date.now();
  let stage='Awaiting GenLayer node receipt';
  const renderProgress=()=>{
    $('txProgress').textContent=elapsedLabel(Date.now()-started)+' elapsed · '+stage+' · Automatic checking active';
  };
  notice('Tracking on-chain transaction','Your transaction is being checked automatically. No manual refresh or duplicate signing needed.',2,record.hash,'pending');
  renderProgress();
  const ticker=setInterval(renderProgress,1000);
  try{
    for(let attempt=0;attempt<180;attempt++){
      let response;
      try{
        const r=await fetch('/api/tx?hash='+encodeURIComponent(record.hash),{cache:'no-store',signal:AbortSignal.timeout(15000)});
        response=await r.json();
        if(!r.ok||!response.ok)throw Error(response.error||'Transaction query failed');
        stage=txStage(response.status);
        renderProgress();
      }catch(e){
        stage='Network query delayed; retrying automatically';
        renderProgress();
        await new Promise(res=>setTimeout(res,4000));
        continue;
      }
      const phase=classifyTx(response);
      if(phase==='error'){
        saveReceipt(record,'FAILED');
        sessionStorage.removeItem(pendingKey);
        notice('Transaction did not complete','Finalized execution failed or the transaction was canceled. The original hash remains available for investigation.',2,record.hash,'error');
        $('recheck').hidden=true;
        return;
      }
      if(phase==='success'){
        stage='Execution finalized; checking stored contract state';
        notice('Finalized · verifying record','GenLayer finalized the transaction. Confirming the exact state written on-chain.',3,record.hash,'pending');
        renderProgress();
        for(let k=0;k<8;k++){
          try{
            const proof=await verifyRecord(record);
            if(proof.ok){
              saveReceipt(record,'VERIFIED',proof.id);
              sessionStorage.removeItem(pendingKey);
              notice('FINALIZED / VERIFIED',proof.message,3,record.hash,'success');
              $('recheck').hidden=true;
              await Promise.allSettled([fillDefaultReads(),loadEvidence()]);
              return;
            }
          }catch(e){
            stage='Readback pending; retrying finalized contract state';
            renderProgress();
          }
          await new Promise(res=>setTimeout(res,3000));
        }
        saveReceipt(record,'UNVERIFIED');
        notice('Finalized · record not verified','Execution finalized, but the stored state could not be confirmed. The hash is saved; do not submit again.',3,record.hash,'paused');
        $('recheck').textContent='Resume verification';
        $('recheck').hidden=false;
        return;
      }
      await new Promise(res=>setTimeout(res,4000));
    }
    notice('Tracking paused · still unresolved','No finalized result was verified. The transaction hash is saved; resume tracking the same hash, never sign a duplicate.',2,record.hash,'paused');
    $('recheck').textContent='Resume automatic tracking';
    $('recheck').hidden=false;
  }catch(e){
    notice('Connection interrupted','The transaction hash is preserved. Resume tracking without sending a second transaction.',2,record.hash,'paused');
    $('recheck').textContent='Resume automatic tracking';
    $('recheck').hidden=false;
  }finally{
    clearInterval(ticker);
    checking=false;
    setBusy(false);
  }
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
      if(verifyStored(record,x))return {ok:true,id,message:method+' recorded as #'+id+' with finalized state.'};
    }
    return {ok:false};
  }
  if(method==='assess'){
    const x=await read('registry','get_assessment',a[0],a[1]);
    if(verifyStored(record,x))return{ok:true,message:'Persisted comparative AI outcome: '+x.decision};
  }
  if(method==='cast_vote'){
    const x=await read('gate','ballot_for',a[0],a[1]);
    if(verifyStored(record,x))return{ok:true,id:x.id,message:'Delegated ballot #'+x.id+' verified in the Ballot contract.'};
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
function updateReadFields(){
 const shape=project.reads[Number($('readMethod').value)]?.[3]||'none';
 $('readPrimaryField').hidden=shape==='none'||shape==='member';
 $('readOtherField').hidden=!['two','actor','member'].includes(shape);
 $('readActorField').hidden=!['actor','member'].includes(shape);
}
function renderReads(){
 $('readMethod').innerHTML=project.reads.map((r,i)=>'<option value="'+i+'">'+esc(r[0])+' · '+esc(r[2])+'</option>').join('');
 $('readMethod').addEventListener('change',updateReadFields);updateReadFields();
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
      $('liveBallots').textContent=String(ballot.ballots);
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
$('recheck').onclick=async()=>{const record=loadPending();if(record)await follow(record);else notice('No pending transaction','No unresolved transaction hash is stored.')};
renderMeta();renderForms();renderReads();showPage(['overview','workflow','history','verify'].includes(location.hash.slice(1))?location.hash.slice(1):'overview');
const saved=loadPending();
if(saved?.hash){
 restorePendingForm(saved);
 notice('Restoring automatic tracking','Your previous transaction is preserved; checking its actual on-chain status.',2,saved.hash,'pending');
 $('txProgress').textContent='Restoring the last transaction without re-signing…';
 setBusy(true);
}
refreshConfig().then(()=>{
 loadEvidence();
 if(!$('history').hidden)renderMyActivity();
 const r=loadPending();
 if(r?.hash)follow(r);
});
// Read already-authorized EIP-1193 accounts without prompting for a new permission.
window.ethereum?.request?.({method:'eth_accounts'}).then(a=>{
 if(!account && ADDRESS.test(a?.[0]||''))updateAccount(a[0]);
}).catch(()=>{});
window.addEventListener('visibilitychange',()=>{
 if(!document.hidden && !checking){
  const r=loadPending();
  if(r?.hash)follow(r);
 }
});
