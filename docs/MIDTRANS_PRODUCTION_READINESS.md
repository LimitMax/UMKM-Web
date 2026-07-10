# Midtrans Production Readiness & Go-Live Guide

Dokumen ini memandu langkah-langkah migrasi sistem pembayaran online (Midtrans Gateway) UMKM Pilot dari Sandbox ke mode Production dengan aman.

---

## 1. Perbedaan Sandbox vs Production

| Fitur | Sandbox Mode | Production Mode |
| :--- | :--- | :--- |
| **Kredensial Key** | Diambil dari Dashboard Sandbox | Diambil dari Dashboard Production |
| **Nilai Uang** | Uang mainan / Simulasi | Transaksi nyata (memotong saldo/dana) |
| **Snap Base URL** | `https://app.sandbox.midtrans.com` | `https://app.midtrans.com` |
| **Core API Base URL** | `https://api.sandbox.midtrans.com` | `https://api.midtrans.com` |
| **Keamanan Endpoint** | HTTP diperbolehkan | Wajib menggunakan HTTPS |
| **Webhook Signature** | SHA512 menggunakan Sandbox Server Key | SHA512 menggunakan Production Server Key |

---

## 2. Konfigurasi Environment Variables

### A. Konfigurasi Lokal (Development / Testing)
Secara default, aplikasi berjalan di **Sandbox Mode**. Gunakan variabel berikut di `.env.local`:
```bash
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_MERCHANT_ID=Gxxxxxxxx
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxx
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### B. Konfigurasi Hosting Produksi (Vercel / VPS / Cloud)
Untuk mengaktifkan pembayaran nyata di lingkungan live, konfigurasikan key berikut:
```bash
MIDTRANS_IS_PRODUCTION=true
ENABLE_PRODUCTION_PAYMENTS=true
MIDTRANS_MERCHANT_ID=Mxxxxxxxx
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxx
MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxx
NEXT_PUBLIC_APP_URL=https://nama-umkm-anda.com
MIDTRANS_WEBHOOK_URL=https://nama-umkm-anda.com/api/webhooks/midtrans
```

---

## 3. Langkah Mendapatkan Kredensial Produksi

1. Masuk ke [Midtrans Merchant Dashboard](https://dashboard.midtrans.com).
2. Di pojok kiri atas, pastikan mode aktif berada pada **Production** (bukan Sandbox).
3. Buka menu **Settings > Access Keys** untuk mendapatkan:
   - **Merchant ID**
   - **Client Key**
   - **Server Key**
4. Masukkan kunci-kunci tersebut ke environment variables hosting web Anda.

---

## 4. Konfigurasi Webhook Notification URL

Agar status pembayaran otomatis diperbarui secara realtime di database toko:
1. Di Midtrans Dashboard, buka menu **Settings > Configuration**.
2. Pada field **Payment Notification URL**, isi dengan:
   `https://domain-anda.com/api/webhooks/midtrans`
3. Set **Transaction Status Association** ke default.
4. Klik **Save**.

---

## 5. Checklist Go-Live

Lakukan langkah verifikasi berikut sebelum meluncurkan fitur pembayaran online ke pelanggan:

- [ ] Domain utama toko sudah menggunakan protokol aman **HTTPS**.
- [ ] `NEXT_PUBLIC_APP_URL` di konfigurasi server menunjuk ke URL HTTPS domain production Anda.
- [ ] `MIDTRANS_IS_PRODUCTION` diset ke `true`.
- [ ] `ENABLE_PRODUCTION_PAYMENTS` diset ke `true`.
- [ ] Kredensial client dan server key sandbox telah dihapus dari server production.
- [ ] URL Notifikasi Webhook sudah dikonfigurasi di dashboard Midtrans.
- [ ] Integrasi handshake signature SHA512 aktif (terverifikasi otomatis oleh sistem API).
- [ ] Metode pembayaran (QRIS, e-wallet, VA) telah diaktifkan di dashboard Midtrans Merchant.
- [ ] Fitur manual override lunas kasir terverifikasi dengan alasan log audit.
- [ ] Menjalankan transaksi test kecil (misal Rp 10.000 via QRIS asli) untuk memvalidasi aliran:
  - Pelanggan checkout.
  - Pembayaran berhasil di HP.
  - Halaman sukses otomatis berubah menjadi paid (Supabase Realtime).
  - Data pesanan terperinci masuk ke database `payments` dan log audit `payment_events`.
  - Pesanan berpindah ke antrean kasir dengan label status pembayaran lunas.

---

## 6. Rencana Rollback (Rollback Plan)

Jika terjadi kesalahan teknis pada pembayaran produksi:

### Langkah Darurat A: Menonaktifkan Pembayaran Non-Tunai
Untuk mematikan transaksi online seketika dan memaksa pelanggan menggunakan pembayaran tunai saja:
1. Ubah variabel lingkungan berikut di panel hosting Anda:
   ```bash
   ENABLE_PRODUCTION_PAYMENTS=false
   ```
2. Aplikasi akan memblokir pembuatan Snap token Midtrans, dan menampilkan pesan kesalahan ramah kepada pelanggan:
   *“Pembayaran online sedang tidak tersedia. Silakan pilih Tunai atau hubungi kasir.”*

### Langkah Darurat B: Migrasi Kembali ke Sandbox
Untuk menguji coba ulang sistem Sandbox di lingkungan staging:
1. Ubah variabel lingkungan:
   ```bash
   MIDTRANS_IS_PRODUCTION=false
   ENABLE_PRODUCTION_PAYMENTS=false
   ```
2. Pastikan Server Key & Client Key dikembalikan menggunakan Sandbox Access Keys.

---

## 7. Batasan & Limitasi Sistem (Known Limitations)

- **Idempotensi Webhook**: Sistem memverifikasi kecocokan order ID dan mengabaikan downgrade status (misal status paid tidak bisa diturunkan kembali menjadi pending jika ada delay pengiriman webhook).
- **Penggunaan Kunci**: Kunci Server Key dilindungi agar hanya dapat dibaca di lingkungan backend Server-Side Next.js (tidak terekspos ke bundel Javascript browser klien).
- **Manual Override Audit**: Kasir dapat menandai lunas pesanan non-tunai secara paksa melalui dasbor kasir dengan memasukkan alasan verifikasi manual. Alasan ini terekam permanen di log audit `payment_events` untuk kebutuhan rekonsiliasi keuangan.
