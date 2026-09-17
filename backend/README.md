# WeFinance Backend

Node.js + Express + PostgreSQL backend untuk WeFinance.

## Prasyarat

- Node.js 20+
- PostgreSQL 14+

## Instalasi

```bash
cd backend
npm install
```

Salin `.env.example` menjadi `.env`, lalu sesuaikan `DATABASE_URL`.

## Membuat database

Buat database `wefinance`, kemudian jalankan:

```bash
psql -U postgres -d wefinance -f db/schema.sql
```

## Menjalankan API

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Health check:

```text
GET http://localhost:3000/api/health
```

## Catatan arsitektur

Backend ini adalah fondasi tahap migrasi. Frontend localStorage tetap dipertahankan sampai API, autentikasi, dan migrasi data tervalidasi. Referensi wallet dan kategori di database menggunakan UUID, bukan nama, agar perubahan nama tidak merusak transaksi lama.
