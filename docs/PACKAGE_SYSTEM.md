# SaaS Package Plan & Business Registration System (Phase 10A)

Platform UMKM Pilot kini mendukung model bisnis SaaS multi-tenant dengan registrasi mandiri, pemilihan paket langganan (Free/Trial, Starter, Pro), dan pembagian data transaksi yang aman per entitas bisnis (multi-tenant isolation).

---

## 1. Makna Pendaftaran Bisnis ("Daftar UMKM")

Tautan **"Daftar Bisnis"** di halaman depan mengalihkan pengguna ke form registrasi tiga langkah:
1. **Pilih Paket**: Pemilik usaha memilih paket langganan (`free`, `starter`, atau `pro`).
2. **Buat Akun Owner**: Registrasi kredensial administrator utama (owner) di Supabase Auth.
3. **Profil Bisnis**: Konfigurasi nama toko, jenis usaha, WhatsApp, dan alamat.

Setelah form diserahkan:
- Dibuat UUID bisnis baru di tabel `businesses` (mencegah bentrok dengan `biz-1`).
- Dibuat profil pengguna di tabel `profiles` dengan peran `admin` yang terikat pada `business_id` baru tersebut.
- Dibuat data langganan baru di tabel `business_subscriptions` berdasarkan kode paket yang dipilih.
- Pengguna dialihkan langsung ke dashboard admin yang sudah disaring otomatis hanya untuk bisnisnya sendiri.

---

## 2. Rincian Paket Langganan

Aplikasi menyediakan tiga paket langganan awal:

| Fitur | Free / Trial | Starter | Pro |
| :--- | :--- | :--- | :--- |
| **Kode Paket** | `free` | `starter` | `pro` |
| **Harga Bulanan** | Rp 0 | Rp 99.000 | Rp 199.000 |
| **Limit Produk** | 20 produk | 100 produk | 500 produk |
| **Limit Pesanan** | 100 / bulan | 1.000 / bulan | 5.000 / bulan |
| **Limit Staf/Kasir** | 1 staf | 3 staf | 10 staf |
| **Midtrans Payment** | ❌ Tidak Aktif | ✅ Aktif | ✅ Aktif |
| **Ekspor Laporan** | ❌ Tidak Aktif | ✅ Aktif | ✅ Aktif |
| **AI Insights** | ❌ Tidak Aktif | ❌ Tidak Aktif | ✅ Aktif |

---

## 3. Batasan & Limitasi Saat Ini (Pilot Mode)

- **Tanpa Pembayaran Paket**: Pembayaran atau pemotongan saldo untuk pemilihan paket Starter / Pro **belum diaktifkan**. Semua paket saat registrasi dapat dicoba secara gratis.
- **Midtrans Terbatas**: Sistem pembayaran online menggunakan Midtrans Sandbox tetap **dikhususkan untuk pesanan pelanggan** di menu digital `/order`, bukan untuk pembayaran langganan SaaS.
- **Soft Gating (Feature Gating)**:
  - Halaman **AI Insights** menampilkan peringatan jika akun tidak berada pada paket Pro, tetapi data rekomendasi tetap dapat diakses untuk kebutuhan pengujian.
  - Halaman **Ekspor Laporan** menampilkan peringatan jika akun berada pada paket Free, tetapi tombol ekspor CSV tetap aktif.
  - Menu Checkout Pelanggan menampilkan peringatan bahwa pembayaran online membutuhkan paket Starter/Pro jika bisnis menggunakan paket Free, tetapi simulasi sandbox tetap diperbolehkan berjalan.

---

## 4. Rencana Pengembangan Mendatang (Future Roadmap)

1. **Subscription Billing**: Mengintegrasikan pembayaran langganan paket bulanan (SaaS billing) menggunakan produk **Midtrans Subscription API** (recurring billing) atau snap paylink terotomasi.
2. **Hard Feature Gating**: Membatasi secara ketat pembuatan produk baru di atas limit paket, memblokir pengiriman transaksi di atas kuota bulanan, dan menonaktifkan tombol ekspor/fitur AI secara permanen bagi pengguna non-premium.
3. **Multi-Tenant Dashboard**: Pengelolaan daftar tenant bisnis oleh Super Admin untuk kontrol status penangguhan (suspended) atau pembatalan (cancelled) paket langsung dari dashboard utama.
