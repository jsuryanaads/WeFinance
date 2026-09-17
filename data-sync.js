(() => {
  let syncing = false;
  let remote = { wallets: [], categories: [] };
  const walletToLocal = w => ({ id: w.id, name: w.name, type: w.walletType, openingBalance: Number(w.openingBalance) || 0 });
  function txToLocal(t) {
    const wallet = remote.wallets.find(w => w.id === t.walletId);
    const fromWallet = remote.wallets.find(w => w.id === t.fromWalletId);
    const toWallet = remote.wallets.find(w => w.id === t.toWalletId);
    const category = remote.categories.find(c => c.id === t.categoryId);
    return normalizeTransaction({ id: t.id, date: t.date, description: t.description, category: category?.name || (t.type === 'income' ? 'Penghasilan' : t.type === 'transfer' ? 'Transfer' : 'Lainnya'), wallet: wallet?.name || fromWallet?.name || '', amount: t.amount, type: t.type, note: t.note, fromWallet: fromWallet?.name || '', toWallet: toWallet?.name || '' });
  }
  async function loadRemoteData() {
    if (syncing || !window.wefinanceApi) return;
    syncing = true;
    try {
      const [walletResponse, categoryResponse, transactionResponse] = await Promise.all([wefinanceApi.get('/wallets'), wefinanceApi.get('/categories'), wefinanceApi.get('/transactions?limit=200')]);
      remote.wallets = walletResponse.data || []; remote.categories = categoryResponse.data || [];
      wallets = remote.wallets.map(walletToLocal); transactions = (transactionResponse.data || []).map(txToLocal);
      renderStats(); renderTransactions(); renderWallets(); setModalWalletOptions(); syncModalType();
      window.dispatchEvent(new CustomEvent('wefinance:data-ready'));
    } catch (error) { console.error('WeFinance data sync failed:', error); alert(`Data belum dapat dimuat dari server: ${error.message}`); }
    finally { syncing = false; }
  }
  function categoryIdFor(name, type) { return remote.categories.find(c => c.name === name && c.type === type)?.id || remote.categories.find(c => c.name === name)?.id || null; }
  async function saveTransactionRemote(event) {
    event.preventDefault(); event.stopImmediatePropagation(); if (syncing) return;
    const form = event.currentTarget, data = new FormData(form), type = modalType;
    const amount = Number(data.get('amount')), date = String(data.get('date') || ''), description = String(data.get('description') || '').trim();
    if (!date || !description || !Number.isFinite(amount) || amount <= 0) return alert('Lengkapi transaksi dengan benar.');
    const walletName = type === 'transfer' ? String(data.get('fromWallet') || '') : String(data.get('wallet') || '');
    const wallet = remote.wallets.find(w => w.name === walletName);
    if (type !== 'transfer' && !wallet) return alert('Dompet tidak ditemukan.');
    try {
      const payload = { walletId: wallet?.id || null, categoryId: type === 'transfer' ? null : categoryIdFor(String(data.get('category') || ''), type), type, amount, date, description, note: String(data.get('note') || '') || null };
      if (type === 'transfer') {
        const from = remote.wallets.find(w => w.name === String(data.get('fromWallet') || ''));
        const to = remote.wallets.find(w => w.name === String(data.get('toWallet') || ''));
        if (!from || !to || from.id === to.id) return alert('Pilih dompet asal dan tujuan yang berbeda.');
        payload.fromWalletId = from.id; payload.toWalletId = to.id;
      }
      const response = await wefinanceApi.post('/transactions', payload);
      await loadRemoteData(); form.reset(); document.querySelector('#modal')?.classList.remove('open'); showPage('transactions');
    } catch (error) { alert(`Gagal menyimpan transaksi: ${error.message}`); }
  }
  async function saveWalletRemote(event) {
    event.preventDefault(); event.stopImmediatePropagation(); if (syncing) return;
    const form = event.currentTarget, data = new FormData(form);
    const payload = { name: String(data.get('name') || '').trim(), walletType: String(data.get('type') || 'other'), openingBalance: Number(data.get('openingBalance')) };
    if (!payload.name || !Number.isFinite(payload.openingBalance) || payload.openingBalance < 0) return;
    try {
      const response = editingWalletId ? await wefinanceApi.put(`/wallets/${editingWalletId}`, payload) : await wefinanceApi.post('/wallets', payload);
      const next = walletToLocal(response.data), index = wallets.findIndex(w => w.id === next.id);
      if (index >= 0) wallets[index] = next; else wallets.push(next);
      await loadRemoteData(); document.querySelector('#walletModal')?.classList.remove('open'); editingWalletId = null;
    } catch (error) { alert(`Gagal menyimpan dompet: ${error.message}`); }
  }
  function interceptWalletDelete() {
    document.querySelectorAll('[data-wallet-delete]').forEach(button => {
      if (button.dataset.remoteBound) return; button.dataset.remoteBound = '1';
      button.onclick = async event => {
        event.preventDefault(); event.stopPropagation(); const id = button.dataset.walletDelete, wallet = wallets.find(w => w.id === id);
        if (!wallet || !confirm(`Hapus dompet “${wallet.name}”?`)) return;
        try { await wefinanceApi.delete(`/wallets/${id}`); await loadRemoteData(); }
        catch (error) { alert(`Gagal menghapus dompet: ${error.message}`); }
      };
    });
  }
  document.addEventListener('submit', event => { if (event.target?.id === 'transactionForm') saveTransactionRemote(event); if (event.target?.id === 'walletForm') saveWalletRemote(event); }, true);
  window.addEventListener('wefinance:data-ready', interceptWalletDelete);
  window.addEventListener('wefinance:ready', loadRemoteData);
})();
