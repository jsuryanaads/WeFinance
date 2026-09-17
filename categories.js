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

function persistCategories(){
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

function categoryTypeLabel(type){
  return type === 'income' ? 'Pemasukan' : 'Pengeluaran';
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
  select.innerHTML = getCategoriesByType(type).map(category => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join('');
  if (getCategoriesByType(type).some(category => category.name === selected)) select.value = selected;
}

function renderCategories(){
  const page = document.querySelector('#page-categories');
  if (!page) return;
  page.innerHTML = `<div class="page-heading"><div><p class="eyebrow">MASTER DATA</p><h1>Kategori</h1><p>Kelola kategori pemasukan dan pengeluaran tanpa mengubah riwayat transaksi.</p></div><button class="primary" id="addCategory">＋ Tambah Kategori</button></div>
    <div class="dashboard-grid top-grid">
      <section class="panel">
        <div class="panel-head"><h2>Pemasukan</h2><span>${getCategoriesByType('income').length} kategori</span></div>
        <div class="category-admin-list">${categoryAdminMarkup('income')}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Pengeluaran</h2><span>${getCategoriesByType('expense').length} kategori</span></div>
        <div class="category-admin-list">${categoryAdminMarkup('expense')}</div>
      </section>
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

let editingCategoryId = null;

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
  document.querySelector('#categoryModalTitle').textContent = category ? 'Edit Kategori' : 'Tambah Kategori';
  if (category) {
    form.elements.name.value = category.name;
    form.elements.type.value = category.type;
    if (category.system) form.elements.type.disabled = true;
  } else {
    form.elements.type.disabled = false;
  }
  document.querySelector('#categoryModal').classList.add('open');
  form.elements.name.focus();
}

function saveCategory(event){
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const type = String(data.get('type') || 'expense');
  if (!name || !['income','expense'].includes(type)) return;
  const category = categories.find(item => item.id === editingCategoryId);
  const duplicate = categories.some(item => item.id !== editingCategoryId && item.type === type && item.name.toLowerCase() === name.toLowerCase());
  if (duplicate) { alert('Kategori dengan nama tersebut sudah ada pada jenis transaksi yang sama.'); return; }
  if (category) {
    const oldName = category.name;
    if (category.system && type !== category.type) return;
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
  const used = transactions.some(transaction => transaction.category === category.name);
  if (used) {
    alert(`Kategori “${category.name}” tidak dapat dihapus karena masih digunakan oleh ${transactions.filter(transaction => transaction.category === category.name).length} transaksi.`);
    return;
  }
  if (!confirm(`Hapus kategori “${category.name}”?`)) return;
  categories = categories.filter(item => item.id !== id);
  persistCategories();
  renderCategories();
  renderCategoryOptions();
}

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
