const seedTransactions = [
  {date:'2026-09-25',description:'Kopi & Cemilan',category:'Makanan',wallet:'Cash',amount:35000,type:'expense'},
  {date:'2026-09-24',description:'Freelance Project',category:'Penghasilan',wallet:'Bank BCA',amount:1000000,type:'income'},
  {date:'2026-09-24',description:'Belanja Supermarket',category:'Belanja',wallet:'E-Wallet',amount:275000,type:'expense'},
  {date:'2026-09-23',description:'Bayar Tagihan PLN',category:'Tagihan',wallet:'Bank BCA',amount:250000,type:'expense'},
  {date:'2026-09-22',description:'Transfer ke Tabungan',category:'Transfer',wallet:'Bank BCA',amount:1000000,type:'expense'}
];

let transactions = JSON.parse(localStorage.getItem('wefinance_transactions') || 'null') || seedTransactions;
let modalType = 'income';

const money = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
const dateText = value => new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T00:00:00'));
const save = () => localStorage.setItem('wefinance_transactions', JSON.stringify(transactions));

function totals(){
  const income = transactions.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const expense = transactions.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  return {income,expense,balance:income-expense};
}

function renderStats(){
  const t = totals();
  document.querySelector('#income').textContent = money(t.income);
  document.querySelector('#expense').textContent = money(t.expense);
  document.querySelector('#balance').textContent = money(t.balance + 10000000);
}

function txMarkup(t){
  const sign = t.type === 'income' ? '+' : '-';
  return `<div class="tx"><div><strong>${escapeHtml(t.description)}</strong><small>${dateText(t.date)}</small></div><div>${escapeHtml(t.category)}</div><div>${escapeHtml(t.wallet)}</div><div class="amount ${t.type}">${sign} ${money(t.amount).replace('Rp','Rp')}</div></div>`;
}

function renderTransactions(filter=''){
  const filtered = transactions.filter(t => `${t.description} ${t.category} ${t.wallet}`.toLowerCase().includes(filter.toLowerCase()));
  const list = document.querySelector('#transactionList');
  const pageList = document.querySelector('#transactionPageList');
  const rows = filtered.slice(0,8).map(txMarkup).join('');
  const header = '<div class="tx tx-head"><span>Tanggal / Deskripsi</span><span>Kategori</span><span>Dompet</span><span>Jumlah</span></div>';
  if(list) list.innerHTML = header + (rows || '<div class="empty">Belum ada transaksi.</div>');
  if(pageList) pageList.innerHTML = header + filtered.map(txMarkup).join('') || '<div class="empty">Belum ada transaksi.</div>';
}

function renderChart(){
  const values = [
    [72,42],[48,31],[61,34],[82,49],[55,35],[84,52],[62,43],[70,38],[91,54],[100,57],[83,48],[76,45]
  ];
  document.querySelector('#cashflowChart').innerHTML = values.map(([a,b])=>`<div class="bar-group"><i class="bar in" style="height:${a}%"></i><i class="bar out" style="height:${b}%"></i></div>`).join('');
}

function escapeHtml(text){return String(text).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page'));
  document.querySelector(`#page-${page}`)?.classList.add('active-page');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
  document.querySelector('#sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.page)));
document.querySelector('#menuBtn').addEventListener('click',()=>document.querySelector('#sidebar').classList.toggle('open'));
document.querySelector('#searchInput').addEventListener('input',e=>renderTransactions(e.target.value));
document.querySelector('#transactionSearch').addEventListener('input',e=>renderTransactions(e.target.value));

document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
  const type = btn.textContent.toLowerCase();
  if(type==='semua') return renderTransactions();
  const filtered = transactions.filter(t=>type==='pemasukan'?t.type==='income':type==='pengeluaran'?t.type==='expense':t.type==='transfer');
  document.querySelector('#transactionPageList').innerHTML = '<div class="tx tx-head"><span>Tanggal / Deskripsi</span><span>Kategori</span><span>Dompet</span><span>Jumlah</span></div>' + filtered.map(txMarkup).join('');
}));

function openModal(type='income'){
  modalType=type;
  document.querySelector('#modal').classList.add('open');
  document.querySelector('#transactionForm input[name=date]').value = new Date().toISOString().slice(0,10);
  document.querySelectorAll('[data-modal-type]').forEach(b=>b.classList.toggle('active',b.dataset.modalType===type));
}

document.querySelector('#addTransaction').addEventListener('click',()=>openModal());
document.querySelector('#addTransaction2').addEventListener('click',()=>openModal());
document.querySelectorAll('.quick-actions button[data-type]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.type)));
document.querySelector('#closeModal').addEventListener('click',()=>document.querySelector('#modal').classList.remove('open'));
document.querySelector('#modal').addEventListener('click',e=>{if(e.target.id==='modal')e.currentTarget.classList.remove('open')});
document.querySelectorAll('[data-modal-type]').forEach(b=>b.addEventListener('click',()=>{modalType=b.dataset.modalType;document.querySelectorAll('[data-modal-type]').forEach(x=>x.classList.toggle('active',x===b));}));

document.querySelector('#transactionForm').addEventListener('submit',e=>{
  e.preventDefault();
  const data=new FormData(e.currentTarget);
  transactions.unshift({date:data.get('date'),description:data.get('description'),category:data.get('category'),wallet:data.get('wallet'),amount:Number(data.get('amount')),type:modalType});
  save(); renderStats(); renderTransactions(); e.currentTarget.reset(); document.querySelector('#modal').classList.remove('open'); showPage('transactions');
});

renderStats();renderTransactions();renderChart();
