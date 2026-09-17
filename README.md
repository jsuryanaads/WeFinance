# WeFinance

**Premium Dark Personal Finance** — aplikasi pencatatan dan pengelolaan keuangan pribadi.

> Money Today, Better Tomorrow.

## Arah Produk

WeFinance berfokus pada pencatatan transaksi yang cepat sekaligus membantu pengguna memahami kondisi keuangan melalui saldo, cash flow, anggaran, hutang, tagihan, target, dan laporan.

## UI Direction

Versi awal menggunakan **Premium Dark**:

- Charcoal / black sebagai fondasi
- Gold sebagai aksen utama
- Green untuk pemasukan dan progres positif
- Red untuk pengeluaran
- Blue / purple sebagai aksen analitik
- Dashboard desktop-first yang tetap responsif di mobile

## Modul

- Beranda / Dashboard
- Transaksi
- Anggaran
- Hutang
- Tagihan
- Target Keuangan
- Laporan & Analitik
- Dompet & Rekening
- Kategori
- Pengaturan

## Status

**v0.3.0 — Finance foundation + Wallet CRUD**

Aplikasi masih berupa web app ringan tanpa build system. Data transaksi dan dompet disimpan secara local-first melalui `localStorage` browser.

## Menjalankan

Buka `index.html` langsung di browser atau gunakan static server sederhana.

```bash
python -m http.server 8080
```

Kemudian buka `http://localhost:8080`.

## Roadmap

### Phase 1 — Foundation
- [x] Premium Dark dashboard
- [x] Navigasi modul utama
- [x] Ringkasan saldo / pemasukan / pengeluaran
- [x] Cash flow visualization
- [x] Transaksi terbaru
- [x] Form tambah transaksi
- [x] Penyimpanan lokal browser
- [x] Responsive layout

### Phase 2 — Finance Engine
- [x] Model rekening/dompet
- [x] Saldo per dompet
- [x] Transfer antar rekening
- [x] Filter dan pencarian transaksi
- [x] Validasi transaksi
- [x] Persistensi localStorage

### Phase 3 — Finance Management
- [x] Wallet CRUD
- [x] Opening balance per dompet
- [x] Proteksi penghapusan dompet yang masih dipakai transaksi
- [ ] Kategori custom
- [ ] Recurring transaction
- [ ] Anggaran per kategori
- [ ] Hutang/piutang dengan jatuh tempo
- [ ] Tagihan berulang
- [ ] Target tabungan

### Phase 4 — Data & Reporting
- [ ] Database persistence
- [ ] Authentication
- [ ] Backup / restore
- [ ] Export CSV / Excel / PDF
- [ ] Laporan cash flow
- [ ] Analitik kategori dan tren

### Phase 5 — Smart Finance
- [ ] OCR struk
- [ ] Smart categorization
- [ ] Anomaly detection
- [ ] Financial insights

## Prinsip Pengembangan

1. **Transaction-first:** pencatatan harus cepat.
2. **Data integrity:** saldo, transfer, hutang, dan tagihan harus konsisten.
3. **Progressive complexity:** fitur lanjutan tidak mengganggu pencatatan sederhana.
4. **Local-first foundation:** finance engine divalidasi sebelum backend/database.
5. **Privacy by design:** data keuangan tidak dikirim ke layanan eksternal tanpa kebutuhan dan persetujuan yang jelas.
