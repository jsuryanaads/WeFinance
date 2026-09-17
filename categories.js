const CATEGORY_STORAGE_KEY = 'wefinance_categories';

const DEFAULT_CATEGORIES = [
  { id:'income-general', name:'Penghasilan', type:'income', system:true },
  { id:'income-bonus', name:'Bonus', type:'income', system:false },
  { id:'income-freelance', name:'Freelance', type:'income', system:false },
  { id:'income-other', name:'Lainnya', type:'income', system:true },
  { id:'expense-food', name:'Makanan', type:'expense', system:false },
  { id:'expense-shopping', name:'Belanja', type:'expense', system:false },
  { id:'expense-bills', name:'Tagihan', type:'expense', system:false },
  { id:'expense-transport', name:'Transportasi', type:'expense', system:false },
  { id:'expense-entertainment', name:'Hiburan', type:'expense', system:false },
  { id:'expense-health', name:'Kesehatan', type:'expense', system:false },
  { id:'expense-education', name:'Pendidikan', type:'expense', system:false },
  { id:'expense-other', name:'Lainnya', type:'expense', system:true }
];

let categories = readJSON(CATEGORY_STORAGE_KEY, DEFAULT_CATEGORIES);
let editingCategoryId = null;

function persistCategories(){
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

function getCategoriesByType(type){
  return categories.filter(category => category.type === type);
}

function renderCategoryOptions(){
  const select = document.querySelector('#transactionForm select[name="category"]');
  if (!select) return;
  if (typeof modalType !== 'undefined' && modalType === 'transfer') {
    select.innerHTML = '<option value="Transfer">Transfer</option>';
    select.disabled = true;
    return;
  }
  const type = typeof modalType !== 'undefined' ? modalType : 'expense';
  const selected = select.value;
  select.disabled = false;
  const options = getCategoriesByType(type);
  select.innerHTML = options.map(category => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join('');
  if (options.some(category => category.name === selected)) select.value = selected;
}

function renderCategories(){
  const page = document.querySelector('#page-categories');
  if (!page) return;
  page.innerHTML = `<div class="page-heading"><div><p class="eyebrow">MASTER DATA</p><h1>Kategori</h1><p>Kelola kategori pemasukan dan pengeluaran tanpa mengubah riwayat transaksi.</p></div><button class="primary" id="addCategory">＋ Tambah Kategori</button></div>
    <div class="dashboard-grid top-grid">
      <section class="panel"><div class="panel-head"><h2>Pemasukan</h2><span>${getCategoriesByType('income').length} kategori</span></div><div class="category-admin-list">${categoryAdminMarkup('income')}</div></section>
      <section class="panel"><div class="panel-head"><h2>Pengeluaran</h2><span>${getCategoriesByType('expense').length} kategori</span></div><div class="category-admin-list">${categoryAdminMarkup('expense')}</div></section>
    </div>`;
  document.querySelector('#addCategory')?.addEventListener('click', () => openCategoryModal());
  document.querySelectorAll('[data-category-edit]').forEach(button => button.addEventListener('click', () => openCategoryModal(button.dataset.categoryEdit)));
  document.querySelectorAll('[data-category-delete]').forEach(button => button.addEventListener('click', () => deleteCategory(button.dataset.categoryDelete)));
}

function categoryAdminMarkup(type){
  return getCategoriesByType(type).map(category => {
    const usedCount = transactions.filter(transaction => transaction.category === category.name).length;
    return `<div class="category-admin-row"><div><strong>${escapeHtml(category.name)}</strong><small>${usedCount} transaksi${category.system ? ' · bawaan' : ''}</small></div><div class="category-admin-actions"><button class="wallet-action" data-category-edit="${category.id}" title="Edit">✎</button>${category.system ? '' : `<button class="wallet-action danger" data-category-delete="${category.id}" title="Hapus">×</button>`}</div></div>`;
  }).join('') || '<div class="empty">Belum ada kategori.</div>';
}

function ensureCategoryModal(){
  if (document.querySelector('#categoryModal')) return;
  const el = document.createElement('div');
  el.id = 'categoryModal';
  el.className = 'modal-backdrop';
  el.innerHTML = `<div class="modal"><div class="modal-head"><div><p class="eyebrow">MASTER DATA</p><h2 id="categoryModalTitle">Tambah Kategori</h2></div><button class="icon-button" id="closeCategoryModal">×</button></div><form id="categoryForm"><label>Nama Kategori<input name="name" required maxlength="40" placeholder="Contoh: Langganan" /></label><label>Jenis<select name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label><button class="primary full" type="submit">Simpan Kategori</button></form></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', event => { if (event.target.id === 'categoryModal') el.classList.remove('open'); });
  document.querySelector('#closeCategoryModal').addEventListener('click', () => el.classList.remove('open'));
  document.querySelector('#categoryForm').addEventListener('submit', saveCategory);
}

function openCategoryModal(id=null){
  ensureCategoryModal();
  editingCategoryId = id;
  const form = document.querySelector('#categoryForm');
  const category = categories.find(item => item.id === id);
  form.reset();
  form.elements.type.disabled = false;
  document.querySelector('#categoryModalTitle').textContent = category ? 'Edit Kategori' : 'Tambah Kategori';
  if (category) {
    form.elements.name.value = category.name;
    form.elements.type.value = category.type;
    form.elements.type.disabled = Boolean(category.system);
  }
  document.querySelector('#categoryModal').classList.add('open');
  form.elements.name.focus();
}

function saveCategory(event){
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const category = categories.find(item => item.id === editingCategoryId);
  const type = category?.system ? category.type : String(data.get('type') || 'expense');
  if (!name || !['income','expense'].includes(type)) return;
  const duplicate = categories.some(item => item.id !== editingCategoryId && item.type === type && item.name.toLowerCase() === name.toLowerCase());
  if (duplicate) { alert('Kategori dengan nama tersebut sudah ada pada jenis transaksi yang sama.'); return; }
  if (category) {
    const oldName = category.name;
    const usedTransactions = transactions.filter(transaction => transaction.category === oldName);
    if (!category.system && type !== category.type && usedTransactions.length) {
      alert(`Jenis kategori tidak dapat dipindahkan karena masih digunakan oleh ${usedTransactions.length} transaksi.`);
      return;
    }
    category.name = name;
    if (!category.system) category.type = type;
    transactions.forEach(transaction => {
      if (transaction.category === oldName) transaction.category = name;
    });
  } else {
    categories.push({ id:uid('category'), name, type, system:false });
  }
  persistCategories();
  persist();
  document.querySelector('#categoryModal').classList.remove('open');
  editingCategoryId = null;
  renderCategories();
  renderCategoryOptions();
  renderTransactions();
}

function deleteCategory(id){
  const category = categories.find(item => item.id === id);
  if (!category || category.system) return;
  const usedCount = transactions.filter(transaction => transaction.category === category.name).length;
  if (usedCount) {
    alert(`Kategori “${category.name}” tidak dapat dihapus karena masih digunakan oleh ${usedCount} transaksi.`);
    return;
  }
  if (!confirm(`Hapus kategori “${category.name}”?`)) return;
  categories = categories.filter(item => item.id !== id);
  persistCategories();
  renderCategories();
  renderCategoryOptions();
}

const categoryStyle = document.createElement('style');
categoryStyle.textContent = `.category-admin-list{display:grid;gap:8px}.category-admin-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid #292d32;border-radius:10px;background:#0d1012}.category-admin-row strong{display:block;font-size:12px}.category-admin-row small{display:block;color:#737981;font-size:9px;margin-top:4px}.category-admin-actions{display:flex;gap:5px}.wallet-action{width:30px;height:30px;border:1px solid #30343a;border-radius:7px;background:#14171a;color:#bbbfc6}.wallet-action:hover{border-color:#a27a2a;color:#f2c65f}.wallet-action.danger:hover{border-color:#9d343b;color:#ff6a70}.empty{padding:20px;text-align:center;color:#737981;font-size:11px}`;
document.head.appendChild(categoryStyle);

const originalSyncModalTypeForCategories = syncModalType;
syncModalType = function(){
  originalSyncModalTypeForCategories();
  renderCategoryOptions();
};

const originalShowPageForCategories = showPage;
showPage = function(page){
  originalShowPageForCategories(page);
  if (page === 'categories') renderCategories();
};

persistCategories();
renderCategoryOptions();
renderCategories();
