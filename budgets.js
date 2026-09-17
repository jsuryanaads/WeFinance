const BUDGET_STORAGE_KEY = 'wefinance_budgets';

let budgets = readJSON(BUDGET_STORAGE_KEY, []);
let editingBudgetId = null;

function persistBudgets(){
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
}

function currentMonthKey(){
  return new Date().toISOString().slice(0,7);
}

function budgetSpent(categoryName, month=currentMonthKey()){
  return transactions.filter(t => t.type === 'expense' && t.category === categoryName && String(t.date || '').slice(0,7) === month).reduce((sum,t) => sum + Number(t.amount || 0), 0);
}

function budgetMonthLabel(month){
  const [year, m] = month.split('-');
  return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(Number(year),Number(m)-1,1));
}

function renderBudgets(){
  const page = document.querySelector('#page-budgets');
  if (!page) return;
  const month = currentMonthKey();
  const rows = budgets.filter(b => b.month === month).map(b => {
    const spent = budgetSpent(b.category, month);
    const percent = b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0;
    const remaining = b.limit - spent;
    const state = remaining < 0 ? 'Melebihi anggaran' : remaining === 0 ? 'Anggaran habis' : 'Tersisa';
    return `<div class="budget-row"><div><strong>${escapeHtml(b.category)}</strong><small>${money(spent)} / ${money(b.limit)}</small></div><div class="progress gold-bg"><i style="width:${percent}%"></i></div><div class="budget-meta"><span>${state}</span><b class="${remaining < 0 ? 'negative' : 'positive'}">${money(Math.abs(remaining))}</b></div><div class="category-admin-actions"><button class="wallet-action" data-budget-edit="${b.id}" title="Edit">✎</button><button class="wallet-action danger" data-budget-delete="${b.id}" title="Hapus">×</button></div></div>`;
  }).join('');
  const totalLimit = budgets.filter(b => b.month === month).reduce((s,b) => s+b.limit,0);
  const totalSpent = budgets.filter(b => b.month === month).reduce((s,b) => s+budgetSpent(b.category,month),0);
  const totalPercent = totalLimit ? Math.min(100,Math.round(totalSpent/totalLimit*100)) : 0;
  page.innerHTML = `<div class="page-heading"><div><p class="eyebrow">PERENCANAAN</p><h1>Anggaran</h1><p>Atur batas pengeluaran per kategori dan pantau penggunaannya.</p></div><button class="primary" id="addBudget">＋ Tambah Anggaran</button></div><div class="stat-grid budget-stats"><article class="stat-card balance-card"><span>Total Anggaran</span><strong>${money(totalLimit)}</strong><div class="trend">${budgetMonthLabel(month)}</div></article><article class="stat-card expense-card"><span>Terpakai</span><strong>${money(totalSpent)}</strong><div class="trend negative">${totalPercent}%</div></article><article class="stat-card income-card"><span>Tersisa</span><strong>${money(totalLimit-totalSpent)}</strong><div class="trend ${totalLimit-totalSpent < 0 ? 'negative':'positive'}">${totalLimit-totalSpent < 0 ? 'Over budget':'Dalam batas'}</div></article></div><div class="panel budget-panel"><div class="panel-head"><h2>Anggaran ${budgetMonthLabel(month)}</h2><span>${budgets.filter(b=>b.month===month).length} kategori</span></div><div class="budget-list">${rows || '<div class="empty">Belum ada anggaran bulan ini. Tambahkan batas pengeluaran per kategori.</div>'}</div></div>`;
  document.querySelector('#addBudget')?.addEventListener('click',()=>openBudgetModal());
  document.querySelectorAll('[data-budget-edit]').forEach(b=>b.addEventListener('click',()=>openBudgetModal(b.dataset.budgetEdit)));
  document.querySelectorAll('[data-budget-delete]').forEach(b=>b.addEventListener('click',()=>deleteBudget(b.dataset.budgetDelete)));
}

function ensureBudgetModal(){
  if(document.querySelector('#budgetModal')) return;
  const el=document.createElement('div'); el.id='budgetModal'; el.className='modal-backdrop';
  el.innerHTML=`<div class="modal"><div class="modal-head"><div><p class="eyebrow">PERENCANAAN</p><h2 id="budgetModalTitle">Tambah Anggaran</h2></div><button class="icon-button" id="closeBudgetModal">×</button></div><form id="budgetForm"><label>Kategori<select name="category"></select></label><label>Batas Anggaran<input name="limit" type="number" min="1" step="1" required placeholder="1000000" /></label><button class="primary full" type="submit">Simpan Anggaran</button></form></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{if(e.target.id==='budgetModal')el.classList.remove('open')});
  document.querySelector('#closeBudgetModal').addEventListener('click',()=>el.classList.remove('open'));
  document.querySelector('#budgetForm').addEventListener('submit',saveBudget);
}

function openBudgetModal(id=null){
  ensureBudgetModal(); editingBudgetId=id;
  const form=document.querySelector('#budgetForm'); const budget=budgets.find(b=>b.id===id);
  const options=getCategoriesByType('expense').map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  form.elements.category.innerHTML=options; form.reset();
  document.querySelector('#budgetModalTitle').textContent=budget?'Edit Anggaran':'Tambah Anggaran';
  if(budget){form.elements.category.value=budget.category;form.elements.limit.value=budget.limit;form.elements.category.disabled=true;}
  else form.elements.category.disabled=false;
  document.querySelector('#budgetModal').classList.add('open'); form.elements.limit.focus();
}

function saveBudget(e){
  e.preventDefault(); const data=new FormData(e.currentTarget); const category=String(data.get('category')||''); const limit=Number(data.get('limit')); const month=currentMonthKey();
  if(!category || !Number.isFinite(limit) || limit<=0) return;
  const existing=budgets.find(b=>b.id===editingBudgetId);
  const duplicate=budgets.some(b=>b.id!==editingBudgetId && b.month===month && b.category===category);
  if(duplicate){alert('Kategori tersebut sudah memiliki anggaran bulan ini.');return;}
  if(existing){existing.limit=limit;}
  else budgets.push({id:uid('budget'),category,limit,month});
  persistBudgets(); document.querySelector('#budgetModal').classList.remove('open'); editingBudgetId=null; renderBudgets();
}

function deleteBudget(id){
  const budget=budgets.find(b=>b.id===id); if(!budget)return;
  if(!confirm(`Hapus anggaran “${budget.category}”?`))return;
  budgets=budgets.filter(b=>b.id!==id); persistBudgets(); renderBudgets();
}

const budgetStyle=document.createElement('style');
budgetStyle.textContent=`.budget-list{display:grid;gap:12px}.budget-row{display:grid;grid-template-columns:1.1fr 2fr 1fr auto;gap:14px;align-items:center;padding:14px;border:1px solid #292d32;border-radius:10px;background:#0d1012}.budget-row strong,.budget-row small{display:block}.budget-row small{color:#737981;font-size:9px;margin-top:5px}.budget-meta{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:10px;color:#737981}.budget-stats{grid-template-columns:repeat(3,1fr);margin-bottom:15px}.budget-panel{margin-top:0}@media(max-width:850px){.budget-row{grid-template-columns:1fr}.budget-meta{justify-content:flex-start}.budget-stats{grid-template-columns:1fr}}`;
document.head.appendChild(budgetStyle);

const originalShowPageForBudgets=showPage;
showPage=function(page){originalShowPageForBudgets(page);if(page==='budgets')renderBudgets()};

persistBudgets();
renderBudgets();
