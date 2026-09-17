const DEBT_STORAGE_KEY = 'wefinance_debts';

let debts = readJSON(DEBT_STORAGE_KEY, []).map(normalizeDebt);
let editingDebtId = null;
let debtFilter = 'all';

function normalizeDebt(item){
  const principal = Number(item?.principal) || 0;
  const paid = Math.min(Math.max(Number(item?.paid) || 0, 0), principal);
  return {
    id: item?.id || uid('debt'),
    party: String(item?.party || '').trim(),
    type: item?.type === 'receivable' ? 'receivable' : 'debt',
    principal,
    paid,
    dueDate: item?.dueDate || '',
    createdDate: item?.createdDate || new Date().toISOString().slice(0,10),
    note: String(item?.note || '').trim(),
    status: paid >= principal && principal > 0 ? 'settled' : 'active'
  };
}

function persistDebts(){
  localStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(debts));
}

function debtRemaining(debt){ return Math.max(0, debt.principal - debt.paid); }

function debtStatus(debt){
  if (debtRemaining(debt) <= 0) return { key:'settled', label:'Lunas', className:'settled' };
  if (!debt.dueDate) return { key:'active', label:'Aktif', className:'active' };
  const today = localDateKey(new Date());
  const diff = Math.round((new Date(`${debt.dueDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  if (diff < 0) return { key:'overdue', label:`Terlambat ${Math.abs(diff)} hari`, className:'overdue' };
  if (diff <= 7) return { key:'soon', label:diff === 0 ? 'Jatuh tempo hari ini' : `Jatuh tempo ${diff} hari lagi`, className:'soon' };
  return { key:'active', label:'Aktif', className:'active' };
}

function localDateKey(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function renderDebtPage(){
  const page = document.querySelector('#page-debts');
  if (!page) return;
  const visible = debtFilter === 'all' ? debts : debts.filter(item => item.type === debtFilter);
  const totalDebt = debts.filter(item => item.type === 'debt').reduce((sum,item) => sum + debtRemaining(item), 0);
  const totalReceivable = debts.filter(item => item.type === 'receivable').reduce((sum,item) => sum + debtRemaining(item), 0);
  const overdue = debts.filter(item => debtStatus(item).key === 'overdue').length;
  page.innerHTML = `<div class="page-heading"><div><p class="eyebrow">KEWAJIBAN</p><h1>Hutang & Piutang</h1><p>Kelola kewajiban dan hak tagih dengan ledger terpisah dari transaksi kas.</p></div><button class="primary" id="addDebt">＋ Tambah</button></div>
    <div class="stat-grid debt-summary">
      <article class="stat-card debt-card"><span>Total Hutang</span><strong>${money(totalDebt)}</strong><small>Sisa yang harus dibayar</small></article>
      <article class="stat-card income-card"><span>Total Piutang</span><strong>${money(totalReceivable)}</strong><small>Sisa yang harus diterima</small></article>
      <article class="stat-card expense-card"><span>Jatuh Tempo</span><strong>${overdue}</strong><small>Hutang/piutang terlambat</small></article>
    </div>
    <div class="panel"><div class="filter-row debt-filter-row"><button class="filter ${debtFilter==='all'?'active':''}" data-debt-filter="all">Semua</button><button class="filter ${debtFilter==='debt'?'active':''}" data-debt-filter="debt">Hutang</button><button class="filter ${debtFilter==='receivable'?'active':''}" data-debt-filter="receivable">Piutang</button></div><div class="debt-list">${visible.length ? visible.map(debtMarkup).join('') : '<div class="empty">Belum ada hutang atau piutang.</div>'}</div></div>`;

  document.querySelector('#addDebt')?.addEventListener('click', () => openDebtModal());
  document.querySelectorAll('[data-debt-filter]').forEach(btn => btn.addEventListener('click', () => { debtFilter = btn.dataset.debtFilter; renderDebtPage(); }));
  document.querySelectorAll('[data-debt-edit]').forEach(btn => btn.addEventListener('click', () => openDebtModal(btn.dataset.debtEdit)));
  document.querySelectorAll('[data-debt-delete]').forEach(btn => btn.addEventListener('click', () => deleteDebt(btn.dataset.debtDelete)));
  document.querySelectorAll('[data-debt-pay]').forEach(btn => btn.addEventListener('click', () => openPaymentModal(btn.dataset.debtPay)));
}

function debtMarkup(debt){
  const remaining = debtRemaining(debt);
  const status = debtStatus(debt);
  const progress = debt.principal ? Math.min(100, Math.round(debt.paid / debt.principal * 100)) : 0;
  const typeLabel = debt.type === 'debt' ? 'HUTANG' : 'PIUTANG';
  return `<article class="debt-row"><div class="debt-main"><div class="debt-type ${debt.type}">${typeLabel}</div><strong>${escapeHtml(debt.party || 'Tanpa nama')}</strong><small>${debt.dueDate ? `Jatuh tempo ${escapeHtml(debt.dueDate)}` : 'Tanpa jatuh tempo'}${debt.note ? ` · ${escapeHtml(debt.note)}` : ''}</small></div><div class="debt-amount"><strong>${money(remaining)}</strong><small>dari ${money(debt.principal)}</small><div class="debt-progress"><span style="width:${progress}%"></span></div></div><span class="debt-status ${status.className}">${escapeHtml(status.label)}</span><div class="debt-actions"><button class="wallet-action" data-debt-pay="${debt.id}" ${remaining <= 0 ? 'disabled' : ''}>Bayar</button><button class="wallet-action" data-debt-edit="${debt.id}">✎</button><button class="wallet-action danger" data-debt-delete="${debt.id}">×</button></div></article>`;
}

function ensureDebtModal(){
  if (document.querySelector('#debtModal')) return;
  const el = document.createElement('div');
  el.id = 'debtModal'; el.className = 'modal-backdrop';
  el.innerHTML = `<div class="modal"><div class="modal-head"><div><p class="eyebrow">LEDGER KEWAJIBAN</p><h2 id="debtModalTitle">Tambah Hutang</h2></div><button class="icon-button" id="closeDebtModal">×</button></div><form id="debtForm"><label>Jenis<select name="type"><option value="debt">Hutang — saya harus membayar</option><option value="receivable">Piutang — saya harus menerima</option></select></label><label>Nama pihak<input name="party" required maxlength="80" placeholder="Contoh: Budi" /></label><div class="form-grid"><label>Jumlah<input name="principal" type="number" min="1" required placeholder="2500000" /></label><label>Jatuh tempo<input name="dueDate" type="date" /></label></div><label>Catatan<textarea name="note" rows="3" maxlength="300" placeholder="Keterangan (opsional)"></textarea></label><button class="primary full" type="submit">Simpan</button></form></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', event => { if (event.target.id === 'debtModal') el.classList.remove('open'); });
  document.querySelector('#closeDebtModal').addEventListener('click', () => el.classList.remove('open'));
  document.querySelector('#debtForm').addEventListener('submit', saveDebt);
}

function openDebtModal(id=null){
  ensureDebtModal(); editingDebtId = id;
  const form = document.querySelector('#debtForm'); const debt = debts.find(item => item.id === id);
  form.reset();
  document.querySelector('#debtModalTitle').textContent = debt ? `Edit ${debt.type === 'debt' ? 'Hutang' : 'Piutang'}` : 'Tambah Hutang';
  if (debt) {
    form.elements.type.value = debt.type;
    form.elements.party.value = debt.party;
    form.elements.principal.value = debt.principal;
    form.elements.dueDate.value = debt.dueDate;
    form.elements.note.value = debt.note;
  }
  form.elements.type.onchange = () => { document.querySelector('#debtModalTitle').textContent = `Tambah ${form.elements.type.value === 'debt' ? 'Hutang' : 'Piutang'}`; };
  document.querySelector('#debtModal').classList.add('open'); form.elements.party.focus();
}

function saveDebt(event){
  event.preventDefault();
  const form = event.currentTarget; const data = new FormData(form);
  const type = String(data.get('type')); const party = String(data.get('party') || '').trim(); const principal = Number(data.get('principal')); const dueDate = String(data.get('dueDate') || ''); const note = String(data.get('note') || '').trim();
  if (!party || !['debt','receivable'].includes(type) || !Number.isFinite(principal) || principal <= 0) return;
  const existing = debts.find(item => item.id === editingDebtId);
  if (existing && principal < existing.paid) { alert(`Jumlah pokok tidak boleh lebih kecil dari total pembayaran ${money(existing.paid)}.`); return; }
  if (existing) Object.assign(existing, { type, party, principal, dueDate, note, status: existing.paid >= principal ? 'settled' : 'active' });
  else debts.unshift({ id:uid('debt'), party, type, principal, paid:0, dueDate, createdDate:localDateKey(new Date()), note, status:'active' });
  persistDebts(); document.querySelector('#debtModal').classList.remove('open'); editingDebtId = null; renderDebtPage(); renderDebtDashboard();
}

function deleteDebt(id){
  const debt = debts.find(item => item.id === id); if (!debt) return;
  const linkedPayments = transactions.filter(tx => tx.debtId === id);
  if (linkedPayments.length) { alert(`Tidak dapat menghapus ${debt.type === 'debt' ? 'hutang' : 'piutang'} karena sudah memiliki ${linkedPayments.length} pembayaran. Hapus/refund transaksi pembayaran terlebih dahulu.`); return; }
  if (!confirm(`Hapus ${debt.type === 'debt' ? 'hutang' : 'piutang'} “${debt.party}”?`)) return;
  debts = debts.filter(item => item.id !== id); persistDebts(); renderDebtPage(); renderDebtDashboard();
}

function ensurePaymentModal(){
  if (document.querySelector('#debtPaymentModal')) return;
  const el = document.createElement('div'); el.id='debtPaymentModal'; el.className='modal-backdrop';
  el.innerHTML = `<div class="modal"><div class="modal-head"><div><p class="eyebrow">PEMBAYARAN</p><h2 id="paymentModalTitle">Catat Pembayaran</h2></div><button class="icon-button" id="closePaymentModal">×</button></div><form id="debtPaymentForm"><div class="payment-context" id="paymentContext"></div><div class="form-grid"><label>Jumlah<input name="amount" type="number" min="1" required /></label><label>Tanggal<input name="date" type="date" required /></label></div><label>Dompet<select name="wallet"></select></label><label>Catatan<textarea name="note" rows="2" placeholder="Catatan pembayaran (opsional)"></textarea></label><button class="primary full" type="submit">Simpan Pembayaran</button></form></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', event => { if (event.target.id === 'debtPaymentModal') el.classList.remove('open'); });
  document.querySelector('#closePaymentModal').addEventListener('click', () => el.classList.remove('open'));
  document.querySelector('#debtPaymentForm').addEventListener('submit', saveDebtPayment);
}

let payingDebtId = null;
function openPaymentModal(id){
  const debt = debts.find(item => item.id === id); if (!debt || debtRemaining(debt) <= 0) return;
  ensurePaymentModal(); payingDebtId = id;
  const form = document.querySelector('#debtPaymentForm'); form.reset();
  form.elements.amount.max = debtRemaining(debt); form.elements.amount.value = debtRemaining(debt); form.elements.date.value = localDateKey(new Date());
  form.elements.wallet.innerHTML = wallets.map(wallet => `<option value="${escapeHtml(wallet.name)}">${escapeHtml(wallet.name)}</option>`).join('');
  document.querySelector('#paymentModalTitle').textContent = debt.type === 'debt' ? 'Bayar Hutang' : 'Terima Pembayaran Piutang';
  document.querySelector('#paymentContext').innerHTML = `<strong>${escapeHtml(debt.party)}</strong><span>Sisa ${money(debtRemaining(debt))}</span>`;
  document.querySelector('#debtPaymentModal').classList.add('open'); form.elements.amount.focus();
}

function saveDebtPayment(event){
  event.preventDefault();
  const debt = debts.find(item => item.id === payingDebtId); if (!debt) return;
  const form = event.currentTarget; const data = new FormData(form); const amount = Number(data.get('amount')); const date = String(data.get('date') || localDateKey(new Date())); const wallet = String(data.get('wallet') || ''); const note = String(data.get('note') || '').trim();
  if (!Number.isFinite(amount) || amount <= 0 || amount > debtRemaining(debt)) { alert(`Jumlah pembayaran harus antara Rp 1 dan ${money(debtRemaining(debt))}.`); return; }
  if (!wallet || !wallets.some(item => item.name === wallet)) { alert('Pilih dompet yang valid.'); return; }
  const tx = { id:uid('tx'), date, description:debt.type === 'debt' ? `Pelunasan Hutang — ${debt.party}` : `Pelunasan Piutang — ${debt.party}`, category:debt.type === 'debt' ? 'Pelunasan Hutang' : 'Pelunasan Piutang', wallet, fromWallet:'', toWallet:'', amount, type:debt.type === 'debt' ? 'expense' : 'income', note: note || `Pembayaran terkait ${debt.party}`, debtId:debt.id, debtPayment:true };
  transactions.unshift(tx); debt.paid += amount; debt.status = debtRemaining(debt) <= 0 ? 'settled' : 'active'; persist(); persistDebts();
  document.querySelector('#debtPaymentModal').classList.remove('open'); payingDebtId = null;
  renderStats(); renderTransactions(); renderWallets(); renderDebtPage(); renderDebtDashboard();
}

function renderDebtDashboard(){
  const stat = document.querySelector('.debt-card strong');
  if (stat) stat.textContent = money(debts.filter(item => item.type === 'debt').reduce((sum,item) => sum + debtRemaining(item), 0));
}

const debtStyle = document.createElement('style');
debtStyle.textContent = `.debt-summary{margin-bottom:18px}.debt-summary small{display:block;color:#737981;margin-top:5px;font-size:10px}.debt-filter-row{margin-bottom:16px}.debt-list{display:grid;gap:8px}.debt-row{display:grid;grid-template-columns:minmax(170px,1.5fr) minmax(150px,1fr) auto auto;align-items:center;gap:18px;padding:15px;border:1px solid #292d32;border-radius:12px;background:#0d1012}.debt-main strong{display:block;font-size:13px}.debt-main small,.debt-amount small{display:block;color:#737981;font-size:10px;margin-top:4px}.debt-type{font-size:8px;letter-spacing:1.2px;margin-bottom:6px;font-weight:800}.debt-type.debt{color:#ff7a80}.debt-type.receivable{color:#7fd69a}.debt-amount>strong{font-size:14px}.debt-progress{height:4px;background:#24282c;border-radius:10px;overflow:hidden;margin-top:8px}.debt-progress span{display:block;height:100%;background:#b88a31}.debt-status{font-size:9px;padding:6px 8px;border-radius:20px;white-space:nowrap}.debt-status.settled{color:#7fd69a;background:#11251a}.debt-status.overdue{color:#ff7a80;background:#291416}.debt-status.soon{color:#f2c65f;background:#28210f}.debt-status.active{color:#aeb4bc;background:#181b1e}.debt-actions{display:flex;gap:5px}.debt-actions .wallet-action{padding:0 8px;width:auto}.debt-actions button:disabled{opacity:.35;cursor:not-allowed}.payment-context{display:flex;justify-content:space-between;padding:12px;border:1px solid #292d32;border-radius:10px;background:#0d1012;margin-bottom:14px}.payment-context span{color:#f2c65f;font-size:12px}@media(max-width:900px){.debt-row{grid-template-columns:1fr 1fr}.debt-status{justify-self:start}.debt-actions{justify-self:end}}@media(max-width:600px){.debt-row{grid-template-columns:1fr}.debt-actions,.debt-status{justify-self:stretch}.debt-actions .wallet-action{flex:1}}`;
document.head.appendChild(debtStyle);

const originalShowPageForDebts = showPage;
showPage = function(page){
  originalShowPageForDebts(page);
  if (page === 'debts') renderDebtPage();
};

persistDebts();
renderDebtPage();
renderDebtDashboard();
