const CATEGORY_STORAGE_KEY = 'wefinance_categories';

const DEFAULT_CATEGORIES = [
  { id:'income-general', name:'Penghasilan', type:'income', system:true },
  { id:'income-bonus', name:'Bonus', type:'income', system:false },
  { id:'income-freelance', name:'Freelance', type:'income', system:false },
  { id:'income-other', name:'Lainnya', type:'income', system:true },
  { id:'income-debt-payment', name:'Pelunasan Piutang', type:'income', system:true },
  { id:'expense-food', name:'Makanan', type:'expense', system:false },
  { id:'expense-shopping', name:'Belanja', type:'expense', system:false },
  { id:'expense-bills', name:'Tagihan', type:'expense', system:false },
  { id:'expense-transport', name:'Transportasi', type:'expense', system:false },
  { id:'expense-entertainment', name:'Hiburan', type:'expense', system:false },
  { id:'expense-health', name:'Kesehatan', type:'expense', system:false },
  { id:'expense-education', name:'Pendidikan', type:'expense', system:false },
  { id:'expense-other', name:'Lainnya', type:'expense', system:true },
  { id:'expense-debt-payment', name:'Pelunasan Hutang', type:'expense', system:true },
  { id:'expense-goal-contribution', name:'Target Keuangan', type:'expense', system:true }
];

let categories = readJSON(CATEGORY_STORAGE_KEY, DEFAULT_CATEGORIES);
let editingCategoryId = null;

function ensureSystemCategories(){
  let changed = false;
  DEFAULT_CATEGORIES.filter(item => item.system).forEach(systemCategory => {
    if (!categories.some(item => item.id === systemCategory.id)) {
      categories.push({ ...systemCategory });
      changed = true;
    }
  });
  if (changed) persistCategories();
}
function persistCategories(){ localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories)); }
function getCategoriesByType(type){ return categories.filter(category => category.type === type); }
function renderCategoryOptions(){
  const select=document.querySelector('#transactionForm select[name="category"]');if(!select)return;
  if(typeof modalType!=='undefined'&&modalType==='transfer'){select.innerHTML='<option value="Transfer">Transfer</option>';select.disabled=true;return;}
  const type=typeof modalType!=='undefined'?modalType:'expense';const selected=select.value;select.disabled=false;const options=getCategoriesByType(type);select.innerHTML=options.map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');if(options.some(c=>c.name===selected))select.value=selected;
}
function renderCategories(){
  const page=document.querySelector('#page-categories');if(!page)return;
  page.innerHTML=`<div class="page-heading"><div><p class="eyebrow">MASTER DATA</p><h1>Kategori</h1><p>Kelola kategori pemasukan dan pengeluaran tanpa mengubah riwayat transaksi.</p></div><button class="primary" id="addCategory">＋ Tambah Kategori</button></div><div class="dashboard-grid top-grid"><section class="panel"><div class="panel-head"><h2>Pemasukan</h2><span>${getCategoriesByType('income').length} kategori</span></div><div class="category-admin-list">${categoryAdminMarkup('income')}</div></section><section class="panel"><div class="panel-head"><h2>Pengeluaran</h2><span>${getCategoriesByType('expense').length} kategori</span></div><div class="category-admin-list">${categoryAdminMarkup('expense')}</div></section></div>`;
  document.querySelector('#addCategory')?.addEventListener('click',()=>openCategoryModal());document.querySelectorAll('[data-category-edit]').forEach(b=>b.addEventListener('click',()=>openCategoryModal(b.dataset.categoryEdit)));document.querySelectorAll('[data-category-delete]').forEach(b=>b.addEventListener('click',()=>deleteCategory(b.dataset.categoryDelete)));
}
function categoryAdminMarkup(type){return getCategoriesByType(type).map(c=>{const used=transactions.filter(t=>t.category===c.name).length;return `<div class="category-admin-row"><div><strong>${escapeHtml(c.name)}</strong><small>${used} transaksi${c.system?' · bawaan':''}</small></div><div class="category-admin-actions"><button class="wallet-action" data-category-edit="${c.id}" title="Edit">✎</button>${c.system?'':`<button class="wallet-action danger" data-category-delete="${c.id}" title="Hapus">×</button>`}</div></div>`}).join('')||'<div class="empty">Belum ada kategori.</div>';}
function ensureCategoryModal(){if(document.querySelector('#categoryModal'))return;const el=document.createElement('div');el.id='categoryModal';el.className='modal-backdrop';el.innerHTML=`<div class="modal"><div class="modal-head"><div><p class="eyebrow">MASTER DATA</p><h2 id="categoryModalTitle">Tambah Kategori</h2></div><button class="icon-button" id="closeCategoryModal">×</button></div><form id="categoryForm"><label>Nama Kategori<input name="name" required maxlength="40" placeholder="Contoh: Langganan" /></label><label>Jenis<select name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label><button class="primary full" type="submit">Simpan Kategori</button></form></div>`;document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target.id==='categoryModal')el.classList.remove('open')});document.querySelector('#closeCategoryModal').addEventListener('click',()=>el.classList.remove('open'));document.querySelector('#categoryForm').addEventListener('submit',saveCategory);}
function openCategoryModal(id=null){ensureCategoryModal();editingCategoryId=id;const form=document.querySelector('#categoryForm');const c=categories.find(x=>x.id===id);form.reset();form.elements.type.disabled=false;document.querySelector('#categoryModalTitle').textContent=c?'Edit Kategori':'Tambah Kategori';if(c){form.elements.name.value=c.name;form.elements.type.value=c.type;form.elements.type.disabled=Boolean(c.system)}document.querySelector('#categoryModal').classList.add('open');form.elements.name.focus();}
function saveCategory(e){e.preventDefault();const form=e.currentTarget,data=new FormData(form),name=String(data.get('name')||'').trim(),c=categories.find(x=>x.id===editingCategoryId),type=c?.system?c.type:String(data.get('type')||'expense');if(!name||!['income','expense'].includes(type))return;const duplicate=categories.some(x=>x.id!==editingCategoryId&&x.type===type&&x.name.toLowerCase()===name.toLowerCase());if(duplicate){alert('Kategori dengan nama tersebut sudah ada pada jenis transaksi yang sama.');return;}if(c){const old=c.name,used=transactions.filter(t=>t.category===old);if(!c.system&&type!==c.type&&used.length){alert(`Jenis kategori tidak dapat dipindahkan karena masih digunakan oleh ${used.length} transaksi.`);return;}c.name=name;if(!c.system)c.type=type;transactions.forEach(t=>{if(t.category===old)t.category=name;});}else categories.push({id:uid('category'),name,type,system:false});persistCategories();persist();document.querySelector('#categoryModal').classList.remove('open');editingCategoryId=null;renderCategories();renderCategoryOptions();renderTransactions();}
function deleteCategory(id){const c=categories.find(x=>x.id===id);if(!c||c.system)return;const used=transactions.filter(t=>t.category===c.name).length;if(used){alert(`Kategori “${c.name}” tidak dapat dihapus karena masih digunakan oleh ${used} transaksi.`);return;}if(!confirm(`Hapus kategori “${c.name}”?`))return;categories=categories.filter(x=>x.id!==id);persistCategories();renderCategories();renderCategoryOptions();}
const categoryStyle=document.createElement('style');categoryStyle.textContent=`.category-admin-list{display:grid;gap:8px}.category-admin-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid #292d32;border-radius:10px;background:#0d1012}.category-admin-row strong{display:block;font-size:12px}.category-admin-row small{display:block;color:#737981;font-size:9px;margin-top:4px}.category-admin-actions{display:flex;gap:5px}.wallet-action{width:30px;height:30px;border:1px solid #30343a;border-radius:7px;background:#14171a;color:#bbbfc6}.wallet-action:hover{border-color:#a27a2a;color:#f2c65f}.wallet-action.danger:hover{border-color:#9d343b;color:#ff6a70}.empty{padding:20px;text-align:center;color:#737981;font-size:11px}`;document.head.appendChild(categoryStyle);
const originalSyncModalTypeForCategories=syncModalType;syncModalType=function(){originalSyncModalTypeForCategories();renderCategoryOptions()};const originalShowPageForCategories=showPage;showPage=function(page){originalShowPageForCategories(page);if(page==='categories')renderCategories()};ensureSystemCategories();persistCategories();renderCategoryOptions();renderCategories();
