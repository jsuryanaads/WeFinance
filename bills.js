const BILL_STORAGE_KEY = 'wefinance_bills';

let bills = readJSON(BILL_STORAGE_KEY, []).map(normalizeBill);
let editingBillId = null;
let billFilter = 'all';

function normalizeBill(item){
  return {
    id: item?.id || uid('bill'),
    name: String(item?.name || '').trim(),
    amount: Number(item?.amount) || 0,
    dueDate: item?.dueDate || '',
    category: String(item?.category || 'Tagihan'),
    wallet: String(item?.wallet || ''),
    recurring: item?.recurring !== false,
    frequency: ['monthly','weekly','yearly'].includes(item?.frequency) ? item.frequency : 'monthly',
    note: String(item?.note || '').trim(),
    lastPaidDate: item?.lastPaidDate || '',
    paid: Boolean(item?.paid)
  };
}

function persistBills(){ localStorage.setItem(BILL_STORAGE_KEY, JSON.stringify(bills)); }

function billStatus(bill){
  if (bill.paid) return {key:'paid',label:'Lunas',className:'settled'};
  if (!bill.dueDate) return {key:'active',label:'Belum dibayar',className:'active'};
  const today = localDateKey(new Date());
  const diff = Math.round((new Date(`${bill.dueDate}T00:00:00`) - new Date(`${today}T00:00:00`))/86400000);
  if (diff < 0) return {key:'overdue',label:`Terlambat ${Math.abs(diff)} hari`,className:'overdue'};
  if (diff === 0) return {key:'today',label:'Jatuh tempo hari ini',className:'soon'};
  if (diff <= 7) return {key:'soon',label:`${diff} hari lagi`,className:'soon'};
  return {key:'active',label:'Belum dibayar',className:'active'};
}

function billFrequencyLabel(freq){ return {monthly:'Bulanan',weekly:'Mingguan',yearly:'Tahunan'}[freq] || 'Bulanan'; }

function renderBills(){
  const page=document.querySelector('#page-bills'); if(!page)return;
  const visible=billFilter==='all'?bills:bills.filter(b=>billStatus(b).key===billFilter);
  const unpaid=bills.filter(b=>!b.paid).reduce((s,b)=>s+b.amount,0);
  const overdue=bills.filter(b=>billStatus(b).key==='overdue').length;
  const paid=bills.filter(b=>b.paid).reduce((s,b)=>s+b.amount,0);
  page.innerHTML=`<div class="page-heading"><div><p class="eyebrow">KEWAJIBAN</p><h1>Tagihan</h1><p>Catat tagihan rutin, pantau jatuh tempo, dan buat transaksi saat dibayar.</p></div><button class="primary" id="addBill">＋ Tambah Tagihan</button></div>
  <div class="stat-grid bill-summary"><article class="stat-card bill-card"><span>Belum Dibayar</span><strong>${money(unpaid)}</strong><small>${bills.filter(b=>!b.paid).length} tagihan</small></article><article class="stat-card expense-card"><span>Jatuh Tempo</span><strong>${overdue}</strong><small>Perlu perhatian</small></article><article class="stat-card income-card"><span>Sudah Dibayar</span><strong>${money(paid)}</strong><small>Periode tersimpan</small></article></div>
  <div class="panel"><div class="filter-row"><button class="filter ${billFilter==='all'?'active':''}" data-bill-filter="all">Semua</button><button class="filter ${billFilter==='active'?'active':''}" data-bill-filter="active">Belum Dibayar</button><button class="filter ${billFilter==='overdue'?'active':''}" data-bill-filter="overdue">Terlambat</button><button class="filter ${billFilter==='paid'?'active':''}" data-bill-filter="paid">Lunas</button></div><div class="bill-list">${visible.length?visible.map(billMarkup).join(''):'<div class="empty">Belum ada tagihan.</div>'}</div></div>`;
  document.querySelector('#addBill')?.addEventListener('click',()=>openBillModal());
  document.querySelectorAll('[data-bill-filter]').forEach(b=>b.addEventListener('click',()=>{billFilter=b.dataset.billFilter;renderBills()}));
  document.querySelectorAll('[data-bill-pay]').forEach(b=>b.addEventListener('click',()=>payBill(b.dataset.billPay)));
  document.querySelectorAll('[data-bill-edit]').forEach(b=>b.addEventListener('click',()=>openBillModal(b.dataset.billEdit)));
  document.querySelectorAll('[data-bill-delete]').forEach(b=>b.addEventListener('click',()=>deleteBill(b.dataset.billDelete)));
}

function billMarkup(bill){
  const status=billStatus(bill);
  return `<article class="bill-row"><div class="bill-main"><div class="bill-type">${bill.recurring?'RECURRING · ':''}${escapeHtml(billFrequencyLabel(bill.frequency).toUpperCase())}</div><strong>${escapeHtml(bill.name||'Tanpa nama')}</strong><small>${escapeHtml(bill.category)}${bill.dueDate?` · Jatuh tempo ${escapeHtml(bill.dueDate)}`:''}${bill.wallet?` · ${escapeHtml(bill.wallet)}`:''}</small></div><div class="bill-amount"><strong>${money(bill.amount)}</strong><small>${bill.note?escapeHtml(bill.note):'Tagihan'}</small></div><span class="bill-status ${status.className}">${escapeHtml(status.label)}</span><div class="bill-actions"><button class="wallet-action" data-bill-pay="${bill.id}" ${bill.paid?'disabled':''}>Bayar</button><button class="wallet-action" data-bill-edit="${bill.id}">✎</button><button class="wallet-action danger" data-bill-delete="${bill.id}">×</button></div></article>`;
}

function ensureBillModal(){
  if(document.querySelector('#billModal'))return;
  const el=document.createElement('div');el.id='billModal';el.className='modal-backdrop';
  el.innerHTML=`<div class="modal"><div class="modal-head"><div><p class="eyebrow">KEWAJIBAN</p><h2 id="billModalTitle">Tambah Tagihan</h2></div><button class="icon-button" id="closeBillModal">×</button></div><form id="billForm"><label>Nama Tagihan<input name="name" required maxlength="80" placeholder="Contoh: Internet" /></label><div class="form-grid"><label>Jumlah<input name="amount" type="number" min="1" required placeholder="350000" /></label><label>Jatuh tempo<input name="dueDate" type="date" /></label></div><div class="form-grid"><label>Kategori<select name="category"></select></label><label>Dompet<select name="wallet"></select></label></div><label>Frekuensi<select name="frequency"><option value="monthly">Bulanan</option><option value="weekly">Mingguan</option><option value="yearly">Tahunan</option></select></label><label class="checkbox-line"><input name="recurring" type="checkbox" checked /> Tagihan berulang</label><label>Catatan<textarea name="note" rows="2" maxlength="300" placeholder="Keterangan (opsional)"></textarea></label><button class="primary full" type="submit">Simpan Tagihan</button></form></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{if(e.target.id==='billModal')el.classList.remove('open')});
  document.querySelector('#closeBillModal').addEventListener('click',()=>el.classList.remove('open'));
  document.querySelector('#billForm').addEventListener('submit',saveBill);
}

function openBillModal(id=null){
  ensureBillModal();editingBillId=id;
  const form=document.querySelector('#billForm');const bill=bills.find(b=>b.id===id);form.reset();
  form.elements.category.innerHTML=getCategoriesByType('expense').map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  form.elements.wallet.innerHTML=wallets.map(w=>`<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)}</option>`).join('');
  document.querySelector('#billModalTitle').textContent=bill?'Edit Tagihan':'Tambah Tagihan';
  if(bill){form.elements.name.value=bill.name;form.elements.amount.value=bill.amount;form.elements.dueDate.value=bill.dueDate;form.elements.category.value=bill.category;form.elements.wallet.value=bill.wallet;form.elements.frequency.value=bill.frequency;form.elements.recurring.checked=bill.recurring;form.elements.note.value=bill.note;}
  document.querySelector('#billModal').classList.add('open');form.elements.name.focus();
}

function saveBill(e){
  e.preventDefault();const data=new FormData(e.currentTarget);const name=String(data.get('name')||'').trim();const amount=Number(data.get('amount'));const dueDate=String(data.get('dueDate')||'');const category=String(data.get('category')||'Tagihan');const wallet=String(data.get('wallet')||'');const frequency=String(data.get('frequency')||'monthly');const recurring=e.currentTarget.elements.recurring.checked;const note=String(data.get('note')||'').trim();
  if(!name||!Number.isFinite(amount)||amount<=0)return;
  if(wallet&&!wallets.some(w=>w.name===wallet)){alert('Dompet tidak valid.');return;}
  const existing=bills.find(b=>b.id===editingBillId);
  if(existing)Object.assign(existing,{name,amount,dueDate,category,wallet,frequency,recurring,note});
  else bills.unshift({id:uid('bill'),name,amount,dueDate,category,wallet,recurring,frequency,note,lastPaidDate:'',paid:false});
  persistBills();document.querySelector('#billModal').classList.remove('open');editingBillId=null;renderBills();
}

function payBill(id){
  const bill=bills.find(b=>b.id===id);if(!bill||bill.paid)return;
  if(!bill.wallet){alert('Atur dompet pembayaran terlebih dahulu melalui Edit Tagihan.');return;}
  if(!wallets.some(w=>w.name===bill.wallet)){alert('Dompet pembayaran tidak ditemukan. Edit tagihan dan pilih dompet yang valid.');return;}
  if(!confirm(`Catat pembayaran ${money(bill.amount)} untuk “${bill.name}”?`))return;
  const tx={id:uid('tx'),date:localDateKey(new Date()),description:`Bayar Tagihan — ${bill.name}`,category:bill.category,wallet:bill.wallet,fromWallet:'',toWallet:'',amount:bill.amount,type:'expense',note:bill.note||`Pembayaran tagihan ${bill.name}`,billId:bill.id,billPayment:true};
  transactions.unshift(tx);bill.lastPaidDate=tx.date;
  if(bill.recurring){bill.paid=true;bill.dueDate=nextDueDate(bill.dueDate||tx.date,bill.frequency);}
  else bill.paid=true;
  persist();persistBills();renderStats();renderTransactions();renderWallets();renderBills();
}

function nextDueDate(dateString,frequency){
  const d=new Date(`${dateString}T00:00:00`);
  if(frequency==='weekly')d.setDate(d.getDate()+7);
  else if(frequency==='yearly')d.setFullYear(d.getFullYear()+1);
  else d.setMonth(d.getMonth()+1);
  return localDateKey(d);
}

function deleteBill(id){
  const bill=bills.find(b=>b.id===id);if(!bill)return;
  const linked=transactions.filter(t=>t.billId===id);
  if(linked.length){alert(`Tagihan ini memiliki ${linked.length} transaksi pembayaran dan tidak dapat dihapus.`);return;}
  if(!confirm(`Hapus tagihan “${bill.name}”?`))return;
  bills=bills.filter(b=>b.id!==id);persistBills();renderBills();
}

const billStyle=document.createElement('style');billStyle.textContent=`.bill-summary{margin-bottom:18px}.bill-summary small{display:block;color:#737981;margin-top:5px;font-size:10px}.bill-list{display:grid;gap:8px}.bill-row{display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(130px,1fr) auto auto;align-items:center;gap:18px;padding:15px;border:1px solid #292d32;border-radius:12px;background:#0d1012}.bill-type{font-size:8px;letter-spacing:1.2px;color:#b88a31;font-weight:800;margin-bottom:6px}.bill-main strong{display:block;font-size:13px}.bill-main small,.bill-amount small{display:block;color:#737981;font-size:10px;margin-top:4px}.bill-amount strong{font-size:14px}.bill-status{font-size:9px;padding:6px 8px;border-radius:20px;white-space:nowrap}.bill-status.settled{color:#7fd69a;background:#11251a}.bill-status.overdue{color:#ff7a80;background:#291416}.bill-status.soon{color:#f2c65f;background:#28210f}.bill-status.active{color:#aeb4bc;background:#181b1e}.bill-actions{display:flex;gap:5px}.bill-actions .wallet-action{width:auto;padding:0 8px}.bill-actions button:disabled{opacity:.35;cursor:not-allowed}.checkbox-line{display:flex;align-items:center;gap:8px}.checkbox-line input{width:auto}@media(max-width:900px){.bill-row{grid-template-columns:1fr 1fr}.bill-status{justify-self:start}.bill-actions{justify-self:end}}@media(max-width:600px){.bill-row{grid-template-columns:1fr}.bill-actions,.bill-status{justify-self:stretch}.bill-actions .wallet-action{flex:1}}`;
document.head.appendChild(billStyle);

const originalShowPageForBills=showPage;showPage=function(page){originalShowPageForBills(page);if(page==='bills')renderBills()};
persistBills();renderBills();
