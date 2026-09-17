const GOAL_STORAGE_KEY = 'wefinance_goals';

let goals = readJSON(GOAL_STORAGE_KEY, []).map(normalizeGoal);
let editingGoalId = null;
let goalFilter = 'active';

function normalizeGoal(item){
  const target = Number(item?.target) || 0;
  const saved = Math.max(0, Number(item?.saved) || 0);
  return {
    id:item?.id || uid('goal'),
    name:String(item?.name || '').trim(),
    target,
    saved:Math.min(saved,target),
    deadline:item?.deadline || '',
    wallet:String(item?.wallet || ''),
    note:String(item?.note || '').trim(),
    createdDate:item?.createdDate || localDateKey(new Date()),
    status:saved >= target && target > 0 ? 'completed' : (item?.status === 'paused' ? 'paused' : 'active')
  };
}

function persistGoals(){ localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goals)); }
function goalRemaining(g){ return Math.max(0,g.target-g.saved); }
function goalPercent(g){ return g.target>0 ? Math.min(100,Math.round(g.saved/g.target*100)) : 0; }

function goalDeadlineStatus(goal){
  if(goal.saved>=goal.target&&goal.target>0)return {label:'Tercapai',className:'settled'};
  if(goal.status==='paused')return {label:'Ditunda',className:'active'};
  if(!goal.deadline)return {label:`${goalPercent(goal)}% tercapai`,className:'active'};
  const today=localDateKey(new Date());
  const diff=Math.round((new Date(`${goal.deadline}T00:00:00`)-new Date(`${today}T00:00:00`))/86400000);
  if(diff<0)return {label:`Lewat ${Math.abs(diff)} hari`,className:'overdue'};
  if(diff<=30)return {label:`${diff} hari lagi`,className:'soon'};
  return {label:'Dalam rencana',className:'active'};
}

function renderGoals(){
  const page=document.querySelector('#page-goals');if(!page)return;
  const visible=goalFilter==='all'?goals:goals.filter(g=>g.status===goalFilter||(goalFilter==='completed'&&g.saved>=g.target&&g.target>0));
  const targetTotal=goals.reduce((s,g)=>s+g.target,0);
  const savedTotal=goals.reduce((s,g)=>s+g.saved,0);
  const completed=goals.filter(g=>g.saved>=g.target&&g.target>0).length;
  page.innerHTML=`<div class="page-heading"><div><p class="eyebrow">MASA DEPAN</p><h1>Target Keuangan</h1><p>Tentukan tujuan, simpan progres, dan pantau jaraknya sampai tercapai.</p></div><button class="primary" id="addGoal">＋ Tambah Target</button></div>
  <div class="stat-grid goal-summary"><article class="stat-card balance-card"><span>Total Target</span><strong>${money(targetTotal)}</strong><small>${goals.length} target</small></article><article class="stat-card income-card"><span>Terkumpul</span><strong>${money(savedTotal)}</strong><small>Progres seluruh target</small></article><article class="stat-card expense-card"><span>Tercapai</span><strong>${completed}</strong><small>Dari ${goals.length} target</small></article></div>
  <div class="panel"><div class="filter-row"><button class="filter ${goalFilter==='active'?'active':''}" data-goal-filter="active">Aktif</button><button class="filter ${goalFilter==='completed'?'active':''}" data-goal-filter="completed">Tercapai</button><button class="filter ${goalFilter==='paused'?'active':''}" data-goal-filter="paused">Ditunda</button><button class="filter ${goalFilter==='all'?'active':''}" data-goal-filter="all">Semua</button></div><div class="goal-list">${visible.length?visible.map(goalMarkup).join(''):'<div class="empty">Belum ada target pada filter ini.</div>'}</div></div>`;
  document.querySelector('#addGoal')?.addEventListener('click',()=>openGoalModal());
  document.querySelectorAll('[data-goal-filter]').forEach(b=>b.addEventListener('click',()=>{goalFilter=b.dataset.goalFilter;renderGoals()}));
  document.querySelectorAll('[data-goal-add]').forEach(b=>b.addEventListener('click',()=>openGoalContributionModal(b.dataset.goalAdd)));
  document.querySelectorAll('[data-goal-edit]').forEach(b=>b.addEventListener('click',()=>openGoalModal(b.dataset.goalEdit)));
  document.querySelectorAll('[data-goal-toggle]').forEach(b=>b.addEventListener('click',()=>toggleGoal(b.dataset.goalToggle)));
  document.querySelectorAll('[data-goal-delete]').forEach(b=>b.addEventListener('click',()=>deleteGoal(b.dataset.goalDelete)));
}

function goalMarkup(goal){
  const percent=goalPercent(goal), status=goalDeadlineStatus(goal);
  return `<article class="goal-row"><div class="goal-main"><div class="goal-icon">☆</div><div><strong>${escapeHtml(goal.name||'Tanpa nama')}</strong><small>${goal.wallet?`Dompet: ${escapeHtml(goal.wallet)}`:'Tanpa dompet khusus'}${goal.deadline?` · Deadline ${escapeHtml(goal.deadline)}`:''}</small></div></div><div class="goal-progress"><div class="goal-progress-head"><span>${money(goal.saved)} / ${money(goal.target)}</span><b>${percent}%</b></div><div class="goal-bar"><i style="width:${percent}%"></i></div><small>Sisa ${money(goalRemaining(goal))}</small></div><span class="goal-status ${status.className}">${escapeHtml(status.label)}</span><div class="goal-actions"><button class="wallet-action" data-goal-add="${goal.id}" ${percent>=100?'disabled':''}>＋ Dana</button><button class="wallet-action" data-goal-edit="${goal.id}">✎</button><button class="wallet-action" data-goal-toggle="${goal.id}">${goal.status==='paused'?'▶':'Ⅱ'}</button><button class="wallet-action danger" data-goal-delete="${goal.id}">×</button></div></article>`;
}

function ensureGoalModal(){
  if(document.querySelector('#goalModal'))return;
  const el=document.createElement('div');el.id='goalModal';el.className='modal-backdrop';
  el.innerHTML=`<div class="modal"><div class="modal-head"><div><p class="eyebrow">TARGET</p><h2 id="goalModalTitle">Tambah Target</h2></div><button class="icon-button" id="closeGoalModal">×</button></div><form id="goalForm"><label>Nama Target<input name="name" required maxlength="80" placeholder="Contoh: Dana Darurat" /></label><div class="form-grid"><label>Target Dana<input name="target" type="number" min="1" required placeholder="10000000" /></label><label>Deadline<input name="deadline" type="date" /></label></div><label>Dompet tujuan<select name="wallet"><option value="">Tidak ditentukan</option></select></label><label>Catatan<textarea name="note" rows="2" maxlength="300" placeholder="Keterangan (opsional)"></textarea></label><button class="primary full" type="submit">Simpan Target</button></form></div>`;
  document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target.id==='goalModal')el.classList.remove('open')});document.querySelector('#closeGoalModal').addEventListener('click',()=>el.classList.remove('open'));document.querySelector('#goalForm').addEventListener('submit',saveGoal);
}

function openGoalModal(id=null){
  ensureGoalModal();editingGoalId=id;const form=document.querySelector('#goalForm');const goal=goals.find(g=>g.id===id);form.reset();form.elements.wallet.innerHTML='<option value="">Tidak ditentukan</option>'+wallets.map(w=>`<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)}</option>`).join('');
  document.querySelector('#goalModalTitle').textContent=goal?'Edit Target':'Tambah Target';
  if(goal){form.elements.name.value=goal.name;form.elements.target.value=goal.target;form.elements.deadline.value=goal.deadline;form.elements.wallet.value=goal.wallet;form.elements.note.value=goal.note;}
  document.querySelector('#goalModal').classList.add('open');form.elements.name.focus();
}

function saveGoal(e){
  e.preventDefault();const data=new FormData(e.currentTarget);const name=String(data.get('name')||'').trim();const target=Number(data.get('target'));const deadline=String(data.get('deadline')||'');const wallet=String(data.get('wallet')||'');const note=String(data.get('note')||'').trim();
  if(!name||!Number.isFinite(target)||target<=0)return;
  if(wallet&&!wallets.some(w=>w.name===wallet)){alert('Dompet tujuan tidak valid.');return;}
  const existing=goals.find(g=>g.id===editingGoalId);
  if(existing){if(target<existing.saved){alert(`Target tidak boleh lebih kecil dari dana yang sudah terkumpul ${money(existing.saved)}.`);return;}Object.assign(existing,{name,target,deadline,wallet,note,status:existing.saved>=target?'active':existing.status});}
  else goals.unshift({id:uid('goal'),name,target,saved:0,deadline,wallet,note,createdDate:localDateKey(new Date()),status:'active'});
  persistGoals();document.querySelector('#goalModal').classList.remove('open');editingGoalId=null;renderGoals();
}

function ensureGoalContributionModal(){
  if(document.querySelector('#goalContributionModal'))return;
  const el=document.createElement('div');el.id='goalContributionModal';el.className='modal-backdrop';
  el.innerHTML=`<div class="modal"><div class="modal-head"><div><p class="eyebrow">TARGET</p><h2 id="goalContributionTitle">Tambah Dana</h2></div><button class="icon-button" id="closeGoalContribution">×</button></div><form id="goalContributionForm"><div class="payment-context" id="goalContributionContext"></div><div class="form-grid"><label>Jumlah<input name="amount" type="number" min="1" required /></label><label>Tanggal<input name="date" type="date" required /></label></div><label>Dompet sumber<select name="wallet"></select></label><label>Catatan<textarea name="note" rows="2" placeholder="Catatan (opsional)"></textarea></label><button class="primary full" type="submit">Simpan & Catat Transaksi</button></form></div>`;
  document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target.id==='goalContributionModal')el.classList.remove('open')});document.querySelector('#closeGoalContribution').addEventListener('click',()=>el.classList.remove('open'));document.querySelector('#goalContributionForm').addEventListener('submit',saveGoalContribution);
}

let contributingGoalId=null;
function openGoalContributionModal(id){
  const goal=goals.find(g=>g.id===id);if(!goal||goalRemaining(goal)<=0)return;ensureGoalContributionModal();contributingGoalId=id;const form=document.querySelector('#goalContributionForm');form.reset();form.elements.amount.max=goalRemaining(goal);form.elements.amount.value=goalRemaining(goal);form.elements.date.value=localDateKey(new Date());form.elements.wallet.innerHTML=wallets.map(w=>`<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)}</option>`).join('');document.querySelector('#goalContributionTitle').textContent=`Tambah Dana — ${goal.name}`;document.querySelector('#goalContributionContext').innerHTML=`<strong>${escapeHtml(goal.name)}</strong><span>Sisa ${money(goalRemaining(goal))}</span>`;document.querySelector('#goalContributionModal').classList.add('open');form.elements.amount.focus();
}

function saveGoalContribution(e){
  e.preventDefault();const goal=goals.find(g=>g.id===contributingGoalId);if(!goal)return;const data=new FormData(e.currentTarget);const amount=Number(data.get('amount'));const date=String(data.get('date')||localDateKey(new Date()));const wallet=String(data.get('wallet')||'');const note=String(data.get('note')||'').trim();
  if(!Number.isFinite(amount)||amount<=0||amount>goalRemaining(goal)){alert(`Jumlah dana harus antara Rp 1 dan ${money(goalRemaining(goal))}.`);return;}if(!wallet||!wallets.some(w=>w.name===wallet)){alert('Pilih dompet yang valid.');return;}
  transactions.unshift({id:uid('tx'),date,description:`Dana Target — ${goal.name}`,category:'Target Keuangan',wallet,fromWallet:'',toWallet:'',amount,type:'expense',note:note||`Alokasi dana untuk target ${goal.name}`,goalId:goal.id,goalContribution:true});
  goal.saved+=amount;if(goal.saved>=goal.target)goal.status='active';persist();persistGoals();document.querySelector('#goalContributionModal').classList.remove('open');contributingGoalId=null;renderStats();renderTransactions();renderWallets();renderGoals();
}

function toggleGoal(id){const goal=goals.find(g=>g.id===id);if(!goal)return;if(goal.saved>=goal.target){alert('Target sudah tercapai.');return;}goal.status=goal.status==='paused'?'active':'paused';persistGoals();renderGoals();}

function deleteGoal(id){const goal=goals.find(g=>g.id===id);if(!goal)return;const linked=transactions.filter(t=>t.goalId===id);if(linked.length){alert(`Target ini memiliki ${linked.length} transaksi alokasi dan tidak dapat dihapus.`);return;}if(!confirm(`Hapus target “${goal.name}”?`))return;goals=goals.filter(g=>g.id!==id);persistGoals();renderGoals();}

const goalStyle=document.createElement('style');goalStyle.textContent=`.goal-summary{margin-bottom:18px}.goal-summary small{display:block;color:#737981;margin-top:5px;font-size:10px}.goal-list{display:grid;gap:8px}.goal-row{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(220px,1.7fr) auto auto;align-items:center;gap:18px;padding:15px;border:1px solid #292d32;border-radius:12px;background:#0d1012}.goal-main{display:flex;gap:12px;align-items:center}.goal-icon{width:36px;height:36px;display:grid;place-items:center;border:1px solid #4a3a1c;border-radius:10px;color:#f2c65f;background:#17130b}.goal-main strong{display:block;font-size:13px}.goal-main small,.goal-progress small{display:block;color:#737981;font-size:10px;margin-top:4px}.goal-progress-head{display:flex;justify-content:space-between;font-size:10px}.goal-progress-head b{color:#f2c65f}.goal-bar{height:6px;background:#24282c;border-radius:10px;overflow:hidden;margin-top:7px}.goal-bar i{display:block;height:100%;background:#b88a31}.goal-status{font-size:9px;padding:6px 8px;border-radius:20px;white-space:nowrap}.goal-status.settled{color:#7fd69a;background:#11251a}.goal-status.overdue{color:#ff7a80;background:#291416}.goal-status.soon{color:#f2c65f;background:#28210f}.goal-status.active{color:#aeb4bc;background:#181b1e}.goal-actions{display:flex;gap:5px}.goal-actions .wallet-action{width:auto;padding:0 8px}.goal-actions button:disabled{opacity:.35;cursor:not-allowed}@media(max-width:950px){.goal-row{grid-template-columns:1fr 1fr}.goal-status{justify-self:start}.goal-actions{justify-self:end}}@media(max-width:650px){.goal-row{grid-template-columns:1fr}.goal-status,.goal-actions{justify-self:stretch}.goal-actions .wallet-action{flex:1}}`;
document.head.appendChild(goalStyle);

const originalShowPageForGoals=showPage;showPage=function(page){originalShowPageForGoals(page);if(page==='goals')renderGoals()};
persistGoals();renderGoals();
