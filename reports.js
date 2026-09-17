let reportPeriod = 'month';
let reportDate = new Date();

function reportMonthKey(d=reportDate){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function reportMonthLabel(d=reportDate){ return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(d); }
function reportTx(){ return transactions.filter(t => t.type !== 'transfer'); }
function reportMonthTx(){ const key=reportMonthKey(); return reportTx().filter(t => String(t.date).slice(0,7)===key); }
function reportMoney(n){ return money(n); }

function renderReports(){
  const page=document.querySelector('#page-reports');if(!page)return;
  const tx=reportPeriod==='month'?reportMonthTx():reportTx();
  const income=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const savings=income-expense;
  const expenseTx=tx.filter(t=>t.type==='expense');
  const byCategory={};expenseTx.forEach(t=>{byCategory[t.category]=(byCategory[t.category]||0)+t.amount});
  const categoriesSorted=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  const maxCategory=categoriesSorted[0]?.[1]||1;
  const incomeByCategory={};tx.filter(t=>t.type==='income').forEach(t=>{incomeByCategory[t.category]=(incomeByCategory[t.category]||0)+t.amount});
  const walletRows=wallets.map(w=>{const list=tx.filter(t=>t.wallet===w.name);const inc=list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);const out=list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);return {name:w.name,income:inc,expense:out,net:inc-out}});
  const goalsActive=typeof goals!=='undefined'?goals.filter(g=>g.status!=='completed'&&g.target>0):[];
  const goalSaved=typeof goals!=='undefined'?goals.reduce((s,g)=>s+g.saved,0):0;
  const debtRemaining=typeof debts!=='undefined'?debts.filter(d=>d.type==='debt').reduce((s,d)=>s+Math.max(0,d.principal-d.paid),0):0;
  const receivable=typeof debts!=='undefined'?debts.filter(d=>d.type==='receivable').reduce((s,d)=>s+Math.max(0,d.principal-d.paid),0):0;
  const unpaidBills=typeof bills!=='undefined'?bills.filter(b=>!b.paid).reduce((s,b)=>s+Number(b.amount||0),0):0;

  page.innerHTML=`<div class="page-heading"><div><p class="eyebrow">INSIGHT</p><h1>Laporan & Analitik</h1><p>Ringkasan keuangan dari sumber data yang sama dengan finance engine.</p></div><div class="report-period"><button class="filter ${reportPeriod==='month'?'active':''}" data-report-period="month">Bulan ini</button><button class="filter ${reportPeriod==='all'?'active':''}" data-report-period="all">Semua data</button></div></div>
  ${reportPeriod==='month'?`<div class="report-month"><button class="wallet-action" id="reportPrev">‹</button><strong>${reportMonthLabel()}</strong><button class="wallet-action" id="reportNext">›</button></div>`:''}
  <div class="stat-grid"><article class="stat-card balance-card"><span>Pemasukan</span><strong>${reportMoney(income)}</strong><small>${tx.filter(t=>t.type==='income').length} transaksi</small></article><article class="stat-card expense-card"><span>Pengeluaran</span><strong>${reportMoney(expense)}</strong><small>${expenseTx.length} transaksi</small></article><article class="stat-card income-card"><span>Net Cash Flow</span><strong>${reportMoney(savings)}</strong><small>${savings>=0?'Surplus':'Defisit'} periode</small></article><article class="stat-card bill-card"><span>Target Terkumpul</span><strong>${reportMoney(goalSaved)}</strong><small>${goalsActive.length} target aktif</small></article></div>
  <div class="dashboard-grid top-grid"><section class="panel"><div class="panel-head"><h2>Pengeluaran per Kategori</h2><span>${categoriesSorted.length} kategori</span></div><div class="report-bars">${categoriesSorted.length?categoriesSorted.slice(0,8).map(([name,value])=>`<div class="report-bar-row"><div><span>${escapeHtml(name)}</span><b>${reportMoney(value)}</b></div><i><em style="width:${Math.max(3,value/maxCategory*100)}%"></em></i></div>`).join(''):'<div class="empty">Belum ada pengeluaran.</div>'}</div></section>
  <section class="panel"><div class="panel-head"><h2>Pemasukan per Kategori</h2><span>${Object.keys(incomeByCategory).length} kategori</span></div><div class="report-list">${Object.entries(incomeByCategory).sort((a,b)=>b[1]-a[1]).map(([name,value])=>`<div><span>${escapeHtml(name)}</span><strong>${reportMoney(value)}</strong></div>`).join('')||'<div class="empty">Belum ada pemasukan.</div>'}</div></section></div>
  <div class="dashboard-grid top-grid"><section class="panel"><div class="panel-head"><h2>Performa Dompet</h2><span>${wallets.length} dompet</span></div><div class="report-list">${walletRows.map(w=>`<div><span>${escapeHtml(w.name)}<small>${w.net>=0?'Net positif':'Net negatif'}</small></span><strong class="${w.net>=0?'report-positive':'report-negative'}">${w.net>=0?'+':''}${reportMoney(w.net)}</strong></div>`).join('')}</div></section>
  <section class="panel"><div class="panel-head"><h2>Posisi Kewajiban</h2><span>Snapshot</span></div><div class="report-list"><div><span>Hutang</span><strong class="report-negative">${reportMoney(debtRemaining)}</strong></div><div><span>Piutang</span><strong class="report-positive">${reportMoney(receivable)}</strong></div><div><span>Tagihan belum dibayar</span><strong>${reportMoney(unpaidBills)}</strong></div></div></section></div>
  <section class="panel"><div class="panel-head"><h2>Insight</h2><span>Periode terpilih</span></div><div class="insight-grid"><div><strong>${reportMoney(Math.max(0,savings))}</strong><span>Surplus kas</span></div><div><strong>${reportMoney(expenseTx.filter(t=>t.goalContribution).reduce((s,t)=>s+t.amount,0))}</strong><span>Alokasi target</span></div><div><strong>${tx.length}</strong><span>Total transaksi</span></div></div></section>`;
  document.querySelectorAll('[data-report-period]').forEach(b=>b.addEventListener('click',()=>{reportPeriod=b.dataset.reportPeriod;renderReports()}));
  document.querySelector('#reportPrev')?.addEventListener('click',()=>{reportDate=new Date(reportDate.getFullYear(),reportDate.getMonth()-1,1);renderReports()});
  document.querySelector('#reportNext')?.addEventListener('click',()=>{reportDate=new Date(reportDate.getFullYear(),reportDate.getMonth()+1,1);renderReports()});
}

const reportStyle=document.createElement('style');reportStyle.textContent=`.report-period{display:flex;gap:5px}.report-month{display:flex;justify-content:center;align-items:center;gap:12px;margin:-4px 0 16px}.report-month strong{text-transform:capitalize;font-size:13px;min-width:130px;text-align:center}.report-bars{display:grid;gap:14px}.report-bar-row>div{display:flex;justify-content:space-between;gap:12px;font-size:10px}.report-bar-row b{font-weight:600}.report-bar-row i{display:block;height:7px;background:#24282c;border-radius:10px;overflow:hidden;margin-top:7px}.report-bar-row em{display:block;height:100%;background:#b88a31;border-radius:10px}.report-list{display:grid;gap:2px}.report-list>div{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid #22262a;font-size:11px}.report-list>div:last-child{border-bottom:0}.report-list small{display:block;color:#737981;font-size:9px;margin-top:3px}.report-positive{color:#75d39a}.report-negative{color:#ff7076}.insight-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.insight-grid>div{padding:15px;border:1px solid #292d32;border-radius:10px;background:#0d1012}.insight-grid strong{display:block;font-size:15px}.insight-grid span{display:block;color:#737981;font-size:9px;margin-top:5px}@media(max-width:700px){.report-period{margin-top:10px}.insight-grid{grid-template-columns:1fr}.report-period .filter{flex:1}}`;
document.head.appendChild(reportStyle);

const originalShowPageForReports=showPage;
showPage=function(page){originalShowPageForReports(page);if(page==='reports'){reportDate=new Date();renderReports()}};
renderReports();
