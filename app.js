const STORAGE = {
  transactions: 'wefinance_transactions',
  wallets: 'wefinance_wallets'
};

const DEFAULT_WALLETS = [
  { id: 'cash', name: 'Cash', type: 'cash', openingBalance: 2250000 },
  { id: 'bca', name: 'Bank BCA', type: 'bank', openingBalance: 5360000 },
  { id: 'ewallet', name: 'E-Wallet', type: 'ewallet', openingBalance: 2390000 }
];

const SEED_TRANSACTIONS = [
  { id:'tx-001', date:'2026-09-25', description:'Kopi & Cemilan', category:'Makanan', wallet:'Cash', amount:35000, type:'expense' },
  { id:'tx-002', date:'2026-09-24', description:'Freelance Project', category:'Penghasilan', wallet:'Bank BCA', amount:1000000, type:'income' },
  { id:'tx-003', date:'2026-09-24', description:'Belanja Supermarket', category:'Belanja', wallet:'E-Wallet', amount:275000, type:'expense' },
  { id:'tx-004', date:'2026-09-23', description:'Bayar Tagihan PLN', category:'Tagihan', wallet:'Bank BCA', amount:250000, type:'expense' },
  { id:'tx-005', date:'2026-09-22', description:'Transfer ke Tabungan', category:'Transfer', fromWallet:'Bank BCA', toWallet:'Cash', wallet:'Bank BCA', amount:1000000, type:'transfer' }
];

let wallets = readJSON(STORAGE.wallets, DEFAULT_WALLETS);
let transactions = readJSON(STORAGE.transactions, SEED_TRANSACTIONS).map(normalizeTransaction);
let modalType = 'income';
let activeFilter = 'semua';
let searchTerm = '';
let editingWalletId = null;

const money = value => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Math.round(Number(value) || 0));
const dateText = value => new Intl.DateTimeFormat('id-ID', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(value + 'T00:00:00'));
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function readJSON(key, fallback){
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed ?? structuredClone(fallback);
  } catch { return structuredClone(fallback); }
}

function normalizeTransaction(t, index){
  const amount = Math.max(0, Number(t.amount) || 0);
  let type = ['income','expense','transfer'].includes(t.type) ? t.type : 'expense';
  if (t.category === 'Transfer' || t.description?.toLowerCase().startsWith('transfer')) type = 'transfer';
  return {
    id: t.id || `legacy-${index}-${Date.now()}`,
    date: t.date || new Date().toISOString().slice(0,10),
    description: String(t.description || 'Transaksi'),
    category: String(t.category || (type === 'income' ? 'Penghasilan' : type === 'transfer' ? 'Transfer' : 'Lainnya')),
    wallet: String(t.wallet || wallets[0]?.name || 'Cash'),
    fromWallet: t.fromWallet || (type === 'transfer' ? t.wallet : ''),
    toWallet: t.toWallet || '',
    amount,
    type
  };
}

function persist(){
  localStorage.setItem(STORAGE.transactions, JSON.stringify(transactions));
  localStorage.setItem(STORAGE.wallets, JSON.stringify(wallets));
}

function totals(){
  return transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    if (t.type === 'expense') acc.expense += t.amount;
    return acc;
  }, { income:0, expense:0 });
}

function walletBalances(){
  const result = Object.fromEntries(wallets.map(w => [w.name, Number(w.openingBalance) || 0]));
  transactions.forEach(t => {
    if (t.type === 'income' && result[t.wallet] !== undefined) result[t.wallet] += t.amount;
    if (t.type === 'expense' && result[t.wallet] !== undefined) result[t.wallet] -= t.amount;
    if (t.type === 'transfer') {
      if (result[t.fromWallet] !== undefined) result[t.fromWallet] -= t.amount;
      if (result[t.toWallet] !== undefined) result[t.toWallet] += t.amount;
    }
  });
  return result;
}

function renderStats(){
  const t = totals();
  const balances = walletBalances();
  const balance = wallets.reduce((sum,w) => sum + (balances[w.name] || 0), 0);
  document.querySelector('#income')?.replaceChildren(document.createTextNode(money(t.income)));
  document.querySelector('#expense')?.replaceChildren(document.createTextNode(money(t.expense)));
  document.querySelector('#balance')?.replaceChildren(document.createTextNode(money(balance)));
}

function txMarkup(t){
  const isTransfer = t.type === 'transfer';
  const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄';
  const walletText = isTransfer ? `${t.fromWallet || t.wallet} → ${t.toWallet || '—'}` : t.wallet;
  const amountClass = t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : 'transfer';
  return `<div class="tx"><div><strong>${escapeHtml(t.description)}</strong><small>${dateText(t.date)}</small></div><div>${escapeHtml(t.category)}</div><div>${escapeHtml(walletText)}</div><div class="amount ${amountClass}">${sign} ${money(t.amount)}</div></div>`;
}

function filteredTransactions(){
  return transactions.filter(t => activeFilter === 'semua' || t.type === activeFilter).filter(t => `${t.description} ${t.category} ${t.wallet} ${t.fromWallet} ${t.toWallet}`.toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));
}

function renderTransactions(){
  const filtered = filteredTransactions();
  const header = '<div class="tx tx-head"><span>Tanggal / Deskripsi</span><span>Kategori</span><span>Dompet</span><span>Jumlah</span></div>';
  const empty = '<div class="empty">Belum ada transaksi yang sesuai.</div>';
  const list = document.querySelector('#transactionList');
  const pageList = document.querySelector('#transactionPageList');
  if (list) list.innerHTML = header + (filtered.slice(0,8).map(txMarkup).join('') || empty);
  if (pageList) pageList.innerHTML = header + (filtered.map(txMarkup).join('') || empty);
}

function renderChart(){
  const values = [72,48,61,82,55,84,62,70,91,100,83,76];
  const out = [42,31,34,49,35,52,43,38,54,57,48,45];
  const chart = document.querySelector('#cashflowChart');
  if (!chart) return;
  chart.innerHTML = values.map((income,i) => `<div class="bar-group"><i class="bar in" style="height:${income}%"></i><i class="bar out" style="height:${out[i]}%"></i></div>`).join('');
}

function walletTypeLabel(type){
  return ({cash:'Tunai',bank:'Bank',ewallet:'E-Wallet',other:'Lainnya'})[type] || 'Lainnya';
}

function renderWallets(){
  const balances = walletBalances();
  const panel = document.querySelector('#page-wallets .placeholder-grid');
  if (!panel) return;
  panel.innerHTML = `<div style="grid-column:1/-1;display:flex;justify-content:flex-end;margin-bottom:-2px"><button class="primary" id="addWallet">＋ Tambah Dompet</button></div>` + wallets.map(w => `
    <div class="panel feature-card" style="position:relative">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
        <div><h2>${escapeHtml(w.name)}</h2><span style="color:#888;font-size:10px">${walletTypeLabel(w.type)}</span></div>
        <div style="display:flex;gap:5px"><button class="wallet-action" data-wallet-edit="${w.id}" title="Edit">✎</button><button class="wallet-action danger" data-wallet-delete="${w.id}" title="Hapus">×</button></div>
      </div>
      <strong>${money(balances[w.name] || 0)}</strong>
      <p>Saldo awal ${money(w.openingBalance)}</p>
    </div>`).join('');
  document.querySelector('#addWallet')?.addEventListener('click', () => openWalletModal());
  document.querySelectorAll('[data-wallet-edit]').forEach(btn => btn.addEventListener('click', () => openWalletModal(btn.dataset.walletEdit)));
  document.querySelectorAll('[data-wallet-delete]').forEach(btn => btn.addEventListener('click', () => deleteWallet(btn.dataset.walletDelete)));
}

function ensureWalletModal(){
  if (document.querySelector('#walletModal')) return;
  const el = document.createElement('div');
  el.id = 'walletModal';
  el.className = 'modal-backdrop';
  el.innerHTML = `<div class="modal"><div class="modal-head"><div><p class="eyebrow">DOMPET & REKENING</p><h2 id="walletModalTitle">Tambah Dompet</h2></div><button class="icon-button" id="closeWalletModal">×</button></div><form id="walletForm"><label>Nama Dompet<input name="name" required maxlength="40" placeholder="Contoh: Bank BRI" /></label><div class="form-grid"><label>Jenis<select name="type"><option value="cash">Tunai</option><option value="bank">Bank</option><option value="ewallet">E-Wallet</option><option value="other">Lainnya</option></select></label><label>Saldo Awal<input name="openingBalance" type="number" min="0" step="1" required placeholder="0" /></label></div><button class="primary full" type="submit">Simpan Dompet</button></form></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target.id === 'walletModal') el.classList.remove('open'); });
  document.querySelector('#closeWalletModal').addEventListener('click', () => el.classList.remove('open'));
  document.querySelector('#walletForm').addEventListener('submit', saveWallet);
}

function openWalletModal(id=null){
  ensureWalletModal();
  editingWalletId = id;
  const modal = document.querySelector('#walletModal');
  const form = document.querySelector('#walletForm');
  const wallet = wallets.find(w => w.id === id);
  form.reset();
  document.querySelector('#walletModalTitle').textContent = wallet ? 'Edit Dompet' : 'Tambah Dompet';
  if (wallet) {
    form.elements.name.value = wallet.name;
    form.elements.type.value = wallet.type;
    form.elements.openingBalance.value = wallet.openingBalance;
  }
  modal.classList.add('open');
  form.elements.name.focus();
}

function saveWallet(e){
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  const name = String(data.get('name') || '').trim();
  const openingBalance = Number(data.get('openingBalance'));
  const type = String(data.get('type') || 'other');
  if (!name || !Number.isFinite(openingBalance) || openingBalance < 0) return;
  const duplicate = wallets.some(w => w.name.toLowerCase() === name.toLowerCase() && w.id !== editingWalletId);
  if (duplicate) { alert('Nama dompet sudah digunakan.'); return; }
  if (editingWalletId) {
    const wallet = wallets.find(w => w.id === editingWalletId);
    if (!wallet) return;
    const oldName = wallet.name;
    wallet.name = name;
    wallet.type = type;
    wallet.openingBalance = openingBalance;
    transactions.forEach(t => {
      if (t.wallet === oldName) t.wallet = name;
      if (t.fromWallet === oldName) t.fromWallet = name;
      if (t.toWallet === oldName) t.toWallet = name;
    });
  } else {
    wallets.push({id:uid('wallet'),name,type,openingBalance});
  }
  persist();
  document.querySelector('#walletModal').classList.remove('open');
  editingWalletId = null;
  renderStats();
  renderWallets();
  setModalWalletOptions();
  syncModalType();
}

function deleteWallet(id){
  const wallet = wallets.find(w => w.id === id);
  if (!wallet) return;
  const used = transactions.some(t => t.wallet === wallet.name || t.fromWallet === wallet.name || t.toWallet === wallet.name);
  if (used) {
    alert(`Dompet “${wallet.name}” tidak dapat dihapus karena masih digunakan oleh transaksi. Edit nama/jenis atau hapus transaksi terkait terlebih dahulu.`);
    return;
  }
  if (wallets.length <= 1) { alert('Minimal harus ada satu dompet.'); return; }
  if (!confirm(`Hapus dompet “${wallet.name}”?`)) return;
  wallets = wallets.filter(w => w.id !== id);
  persist();
  renderStats();
  renderWallets();
  setModalWalletOptions();
  syncModalType();
}

function escapeHtml(text){
  return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function showPage(page){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  document.querySelector(`#page-${page}`)?.classList.add('active-page');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelector('#sidebar')?.classList.remove('open');
  if (page === 'wallets') renderWallets();
  window.scrollTo({top:0,behavior:'smooth'});
}

function setModalWalletOptions(){
  const select = document.querySelector('#transactionForm select[name="wallet"]');
  if (!select) return;
  select.innerHTML = wallets.map(w => `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)}</option>`).join('');
}

function ensureTransferFields(){
  const form = document.querySelector('#transactionForm');
  if (!form || document.querySelector('#transferFields')) return;
  const walletLabel = form.querySelector('select[name="wallet"]')?.closest('label');
  if (!walletLabel) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'transferFields';
  wrapper.className = 'form-grid';
  wrapper.innerHTML = `<label>Dari<select name="fromWallet"></select></label><label>Ke<select name="toWallet"></select></label>`;
  walletLabel.after(wrapper);
  wrapper.hidden = true;
}

function syncModalType(){
  ensureTransferFields();
  const transferFields = document.querySelector('#transferFields');
  const walletLabel = document.querySelector('#transactionForm select[name="wallet"]')?.closest('label');
  const category = document.querySelector('#transactionForm select[name="category"]');
  if (transferFields) transferFields.hidden = modalType !== 'transfer';
  if (walletLabel) walletLabel.hidden = modalType === 'transfer';
  if (category) category.disabled = modalType === 'transfer';
  const from = document.querySelector('[name="fromWallet"]');
  const to = document.querySelector('[name="toWallet"]');
  const options = wallets.map(w => `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)}</option>`).join('');
  if (from) from.innerHTML = options;
  if (to) to.innerHTML = options;
  if (from && to && wallets.length > 1) to.selectedIndex = 1;
}

function openModal(type='income'){
  modalType = type;
  const modal = document.querySelector('#modal');
  const form = document.querySelector('#transactionForm');
  if (!modal || !form) return;
  setModalWalletOptions();
  modal.classList.add('open');
  const date = form.querySelector('input[name="date"]');
  if (date) date.value = new Date().toISOString().slice(0,10);
  document.querySelectorAll('[data-modal-type]').forEach(b => b.classList.toggle('active', b.dataset.modalType === type));
  syncModalType();
}

function bindFilters(){
  document.querySelectorAll('.filter').forEach(btn => btn.addEventListener('click', () => {
    activeFilter = ({'Semua':'semua','Pemasukan':'income','Pengeluaran':'expense','Transfer':'transfer'})[btn.textContent.trim()] || 'semua';
    document.querySelectorAll('.filter').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    renderTransactions();
  }));
}

document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => showPage(el.dataset.page)));
document.querySelector('#menuBtn')?.addEventListener('click', () => document.querySelector('#sidebar')?.classList.toggle('open'));
document.querySelector('#searchInput')?.addEventListener('input', e => { searchTerm = e.target.value; renderTransactions(); });
document.querySelector('#transactionSearch')?.addEventListener('input', e => { searchTerm = e.target.value; renderTransactions(); });

document.querySelector('#addTransaction')?.addEventListener('click', () => openModal());
document.querySelector('#addTransaction2')?.addEventListener('click', () => openModal());
document.querySelectorAll('.quick-actions button[data-type]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.type)));
document.querySelector('#closeModal')?.addEventListener('click', () => document.querySelector('#modal')?.classList.remove('open'));
document.querySelector('#modal')?.addEventListener('click', e => { if (e.target.id === 'modal') e.currentTarget.classList.remove('open'); });
document.querySelectorAll('[data-modal-type]').forEach(b => b.addEventListener('click', () => {
  modalType = b.dataset.modalType;
  document.querySelectorAll('[data-modal-type]').forEach(x => x.classList.toggle('active', x === b));
  syncModalType();
}));

document.querySelector('#transactionForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  const amount = Number(data.get('amount'));
  if (!Number.isFinite(amount) || amount <= 0) return;
  if (modalType === 'transfer' && data.get('fromWallet') === data.get('toWallet')) { alert('Dompet asal dan tujuan harus berbeda.'); return; }
  const transaction = {
    id: uid('tx'), date: data.get('date'), description: String(data.get('description') || '').trim(),
    category: modalType === 'transfer' ? 'Transfer' : data.get('category'),
    wallet: modalType === 'transfer' ? data.get('fromWallet') : data.get('wallet'),
    fromWallet: modalType === 'transfer' ? data.get('fromWallet') : '',
    toWallet: modalType === 'transfer' ? data.get('toWallet') : '', amount, type: modalType
  };
  if (!transaction.description) return;
  transactions.unshift(transaction);
  persist(); renderStats(); renderTransactions(); renderWallets();
  e.currentTarget.reset(); document.querySelector('#modal')?.classList.remove('open'); showPage('transactions');
});

bindFilters();
ensureTransferFields();
renderStats();
renderTransactions();
renderChart();
renderWallets();
