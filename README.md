# UMKM Pilot — AI-Powered Ordering, Cashier, and Insights

UMKM Pilot is a modern, high-performance, full-stack-ready MVP web application designed for small businesses (kafe, rumah makan, retail, laundry). It helps business owners receive digital customer orders, manage cashier workflows, monitor inventory stock levels, and view automated sales reports and AI business insights.

---

## ⚡ Quick Start & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Dev Server**:
   ```bash
   npm run dev
   ```

3. **Access URLs**:
   - Customer Ordering Interface: `http://localhost:3000/order`
   - Cashier Queue Dashboard: `http://localhost:3000/cashier`
   - Owner Overview & Analytics: `http://localhost:3000/admin`
   - Landing Portal: `http://localhost:3000/`

---

## 🎮 Demo Data Management

The app includes a built-in **Demo Data Control Panel** at `/admin/settings` (Alat Demo) for resetting, generating, and managing test data without touching the browser console or DevTools.

### Access the Control Panel

1. Go to `http://localhost:3000/login`
2. Click **Akun Admin** (quick login)
3. In the sidebar, click **Alat Demo** (flask icon)

### Available Operations

| Action | Indonesian Label | What It Does |
|--------|-----------------|--------------|
| Reset All Data | Reset Semua Data | Wipes all orders + restores 7 seed products + resets queue |
| Clear Orders | Bersihkan Semua Pesanan | Removes all orders only; preserves products |
| Restore Products | Pulihkan Katalog Produk | Restores the 7 seed products; orders not touched |
| Generate Sample Orders | Generate Pesanan Demo | Creates 8 realistic demo orders for today with mixed statuses |
| Simulate Low Stock | Simulasikan Stok Kritis | Sets 3 products to very low stock (2–4 units) |

### Expected State After "Generate Pesanan Demo"

After clicking **Generate Pesanan Demo**, the following data is created for today:

| # | Queue | Customer | Items | Amount | Status |
|---|-------|----------|-------|--------|--------|
| 1 | A001 | Budi Santoso | Es Kopi x2, Es Teh x1 | Rp 42.000 | ✅ Selesai |
| 2 | A002 | Siti Rahayu | Nasi Geprek + Es Kopi | Rp 40.000 | ✅ Selesai |
| 3 | A003 | Ahmad Fauzi | Paket Kenyang x2 | Rp 50.000 | ✅ Selesai |
| 4 | A004 | Dewi Kusuma | Mie Goreng + Es Teh x2 | Rp 27.000 | 💳 Lunas (Antrean) |
| 5 | A005 | Rizky Pratama | Kopi Hitam + Roti Bakar | Rp 26.000 | 🔧 Diproses |
| 6 | A006 | Maya Indah | Nasi Geprek | Rp 22.000 | 🍽️ Siap Saji |
| 7 | A007 | Fajar Nugroho | Es Kopi + Roti Bakar | Rp 32.000 | ⏳ Menunggu Bayar |
| 8 | A008 | Lisa Permata | Paket Kenyang x1 | Rp 25.000 | ❌ Dibatalkan |

**Expected Dashboard Metrics:**
- Omzet Hari Ini: **Rp 207.000**
- Pesanan Hari Ini: **7** (excluding cancelled)
- Antrean Aktif Kasir: **4** pesanan
- Produk Terlaris: **Es Kopi Susu Gula Aren** (4 cup)

---

## 🔑 Demo Account Credentials

Both dashboards are protected by role-based mock authentication. You can sign in using these demo credentials directly or by using the **Akses Cepat Pengujian (Quick Login Helpers)** on the login screen:

*   **Owner / Admin Access**:
    *   **Email**: `admin@tokoku.com`
    *   **Role**: `admin` (Has full access to admin panels, products catalog editing, stock adjustments, and AI insights)
*   **Kasir / Cashier Access**:
    *   **Email**: `cashier@tokoku.com`
    *   **Role**: `cashier` (Has terminal access to confirm payments, update order progress steps, and play chime notifications)

---

## ⚙️ Configuration & Supabase Setup (Phase 7A)

UMKM Pilot is built with a swappable repository layer. It operates offline/locally via `localStorage` by default, but it is **Supabase PostgreSQL ready**. 

### 1. Configure Credentials
Create a `.env.local` file at the root of the project (copying `.env.example`) and fill it with your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
NEXT_PUBLIC_USE_SUPABASE=false
```

> [!CAUTION]
> **Security Notice**: Never expose your `SUPABASE_SERVICE_ROLE_KEY` to client-side code. This key bypasses all Row-Level Security (RLS) policies and must only be used in server-side contexts. Ensure it does not have the `NEXT_PUBLIC_` prefix.

### 2. How to Run schema.sql
Go to your Supabase project dashboard, open the **SQL Editor**, create a new query, copy the contents of [supabase/schema.sql](file:///d:/Riset/UMKM%20Web/supabase/schema.sql), and run it. This creates the DDL structure including check constraints, indexes, and planned RLS definitions.

### 3. How to Run seed.sql
In your Supabase project dashboard, open the **SQL Editor**, create a new query, copy the contents of [supabase/seed.sql](file:///d:/Riset/UMKM%20Web/supabase/seed.sql), and run it. This populates your database with a default business profile (`biz-1`), admin and cashier user profiles, and the initial products catalog matching our mock dataset.

### 4. Database Schema Details
For a detailed review of all columns, relationships, check constraints, indexes, and planned RLS policies, refer to the [docs/SUPABASE_SCHEMA.md](file:///d:/Riset/UMKM%20Web/docs/SUPABASE_SCHEMA.md) file.

### 5. Current Limitation
Although the environment setup, client initialization, database schema, and data source abstractions are ready in Phase 7A, **the app still uses `localStorage` as its active default data source** to preserve local offline capabilities. 

### 6. Next Phase
The next phase (Phase 7C/7D) will implement the migration of the business profile and product catalog over to Supabase while routing transactions securely.

---

## 🧪 UAT Demo Walkthrough (End-to-End Test Guide)

This section documents the complete happy-path flow for verifying the MVP end-to-end.

### Step 1 — Reset Demo Data (Optional)
- Open the landing page at `http://localhost:3000/`
- Click the **"Reset Demo Data"** button in the banner to restore seed products and clear all orders

### Step 2 — Customer Ordering Flow
1. Go to `http://localhost:3000/order`
2. Browse products by category (Makanan, Minuman, Snack, Paket Promo)
3. Use the **search box** to find a product by name
4. Click **Tambah +** to add items to cart
5. Verify products with **stock = 0** show "Stok Habis" and the button is disabled
6. Verify adding more than available stock shows an error message
7. Click the **shopping bag icon** (mobile) or use the **right sidebar** (desktop) to open checkout
8. Fill in Nama Lengkap and No. WhatsApp
9. Select a payment method (Tunai / QRIS / Transfer)
10. Click **Konfirmasi & Bayar**
11. Verify redirect to `/order/success/[orderId]` with correct queue number (A001, A002, ...)
12. Verify the receipt shows correct items and totals
13. Verify the status timeline shows "Menunggu Pembayaran" as active

### Step 3 — Cashier Dashboard Flow
1. Go to `http://localhost:3000/login`
2. Click **Akun Kasir** (quick login) to log in as cashier
3. Verify the incoming order appears in the list with the correct queue number
4. Click on the order to see its details
5. Click **Konfirmasi Pembayaran Lunas** → status becomes "Lunas"
6. Click **Mulai Proses / Kirim Dapur** → status becomes "Diproses"
7. Click **Tandai Siap Saji** → status becomes "Siap"
8. Click **Selesaikan / Ambil** → status becomes "Selesai"
9. Verify the order moves out of "Antrean Aktif" filter
10. Test **Cancel Order** on a fresh order → verify stock is restored
11. Use the **search bar** to search by queue number (e.g. A001) or customer name
12. Go back to the customer's success page → verify timeline updates in real-time (polling)

### Step 4 — Admin Dashboard Flow
1. Log out and go back to `/login`
2. Click **Akun Admin** (quick login) to log in as admin/owner
3. Verify the dashboard shows:
   - Today's revenue from completed/paid orders
   - Total orders count
   - Average order value
   - Best-selling product
   - Low stock warnings
4. Navigate to **Kelola Produk** → add a new product, edit an existing one, toggle active status, delete
5. Navigate to **Kelola Stok** → adjust stock with +1, -1, +5, -5 buttons
6. Navigate to **Transaksi** → verify only paid/completed orders appear; test search and method filters
7. Navigate to **AI Insights** → verify rule-based insights load from real localStorage data; test the chatbot

### Step 5 — Data Persistence Verification
- Refresh the browser on any page → data persists (not lost on refresh)
- Close and reopen the browser tab → data still persists
- Click **Reset Demo Data** on the landing page → all orders cleared, products restored to seed

## 📊 Laporan dan Ekspor Data (Phase 5C)

UMKM Pilot menyediakan modul **Laporan & Ekspor Data** di `/admin/reports` bagi pemilik bisnis untuk memfilter, meringkas, dan mengekspor data transaksi ke file format CSV.

### Cara Memfilter dan Mengekspor Laporan
1. Masuk sebagai **Admin/Owner** (`admin@tokoku.com`).
2. Klik menu **Laporan** pada sidebar kiri.
3. Gunakan filter untuk menyaring data:
   - **Tanggal Mulai & Selesai**: Memfilter berdasarkan rentang waktu pembuatan pesanan.
   - **Status Pesanan**: Menyaring status tertentu. Secara default, pesanan dibatalkan (*Cancelled*) dikecualikan agar tidak mengacaukan perhitungan omzet utama.
   - **Status Pembayaran & Metode**: Menyaring tunai, QRIS, atau transfer bank.
4. Klik **Ekspor CSV** untuk mengunduh laporan. File akan diunduh dengan nama dinamis, misalnya `umkm-pilot-transactions-YYYY-MM-DD-to-YYYY-MM-DD.csv`.
5. Klik **Reset Filter** untuk mengembalikan filter ke kondisi default.

### Kolom Data yang Diekspor
Spreadsheet CSV yang diunduh menyertakan kolom-kolom berikut:
- **Informasi Transaksi**: ID Pesanan, No. Antrean, Nama Pelanggan, No. WhatsApp, Tanggal Pesanan (Format Lokal).
- **Metode & Status**: Metode Pembayaran (Tunai/Transfer/QRIS), Status Pembayaran (Lunas/Pending/Gagal), Status Pesanan.
- **Rincian Produk**: Daftar Menu (contoh: `"Es Kopi Susu x2, Roti Bakar x1"`), Total Qty barang terjual, Catatan pelanggan.
- **Rincian Biaya**: Subtotal, Biaya Layanan, Pajak, Total Akhir (Omzet bersih).
- **Informasi Toko**: Nama Toko, Kategori Toko (dari Profil Bisnis aktif).

### Batasan Saat Ini (Technical Limitations)
- **Data Source**: Data laporan diambil dan dihitung secara lokal dari `localStorage` browser pengguna aktif. Jika data demo direset atau dibersihkan di browser tersebut, riwayat transaksi pada laporan juga akan terhapus.
- **Future Integration**: Setelah koneksi Supabase diaktifkan, data laporan akan diambil secara realtime dari tabel `orders` PostgreSQL via API query.

## 👥 Simulasi Peran & Switcher Peran Demo (Phase 5D)

UMKM Pilot menyertakan sistem simulasi peran (*Demo Role Switcher*) untuk memudahkan penguji menjelajahi aplikasi dari tiga sudut pandang pengguna yang berbeda: **Pemilik UMKM (Admin)**, **Kasir**, dan **Pelanggan** secara instan tanpa perlu mendaftar atau login manual secara berulang.

### Cara Kerja Demo Role Switcher
Sistem mendeteksi role aktif dari penyimpanan lokal (`localStorage`). Tampilan antarmuka dan panel navigasi akan otomatis menyesuaikan berdasarkan peran yang dipilih:
1. **Pemilik UMKM (Admin)**:
   - Mengakses Dashboard Admin, Kelola Produk, Stok, Transaksi, Laporan Penjualan, AI Insights, dan Pengaturan Toko.
   - Menggunakan komponen `DemoRoleSwitcher` untuk berpindah ke mode lain kapan saja.
2. **Kasir**:
   - Mengakses Dashboard Kasir Pintar, menyaring antrean pesanan masuk, memproses status dapur, dan mencetak struk digital.
   - Batasan: Navigasi sidebar admin akan otomatis disederhanakan hanya untuk menampilkan link kasir dan daftar struk.
3. **Pelanggan**:
   - Mengakses menu pesanan mandiri (`/order`), berbelanja makanan/minuman, melihat banner toko, dan meninjau status antrean digital.

### Panduan Akses Halaman (Soft Route Guard)
Untuk memudahkan peninjauan demo, aplikasi menggunakan **Soft Route Access Guidance** (bukan blokade keamanan produksi keras):
- Jika peran aktif Anda saat ini adalah **Pelanggan** tetapi Anda membuka halaman `/admin` atau `/cashier`, aplikasi akan menampilkan banner peringatan berwarna kuning di bagian atas:
  - *“Anda sedang berada dalam mode Pelanggan. Halaman ini biasanya digunakan oleh Admin/Owner.”*
- Anda dapat mengklik **Ganti ke Admin/Kasir Demo** untuk menyesuaikan peran secara instan, atau klik **Lanjutkan** untuk tetap meninjau halaman tersebut tanpa dialihkan secara pasang.

### Batasan Saat Ini (Technical Limitations)
- **Bukan Otentikasi Riil**: Fitur switcher ini murni untuk kebutuhan demonstrasi dan simulasi alur kerja visual. Belum ada enkripsi sandi atau pengamanan token API JWT di sisi server.
- **Rencana Mendatang**: Integrasi otentikasi nyata menggunakan Supabase Auth dengan aturan Row-Level Security (RLS) PostgreSQL untuk membatasi akses data secara permanen di database.

## 📱 Pengalaman Pemesanan Pelanggan (Phase 5E)

UMKM Pilot menyertakan fitur pemesanan mandiri digital (`/order`) yang dirancang khusus untuk layar mobile (smartphone) agar mempermudah pelanggan dalam memilih menu, melihat ketersediaan stok, dan memantau status antrean secara real-time.

### Alur Pemesanan Pelanggan
1. **Navigasi ke Halaman Menu**:
   - Masuk lewat Landing Page (`/`) dan klik **Buka Menu Pesanan** pada kartu Pelanggan. Role Anda akan otomatis diset menjadi `customer`.
2. **Menjelajahi Menu & Memilih Produk**:
   - Kategori menu bersifat *horizontally scrollable* di layar mobile.
   - Bilah pencarian (search bar) bekerja bersama filter kategori untuk mempersempit pencarian secara responsif.
   - Produk yang tidak aktif (*Inactive*) tidak akan ditampilkan ke pelanggan.
   - Produk dengan sisa stok `1 - 5` akan menampilkan indikator berwarna kuning **“Stok Terbatas”**.
   - Produk dengan stok `0` akan menampilkan tanda **“HABIS”** dan tombol tambah dinonaktifkan.
   - Jika gambar produk gagal dimuat atau URL kosong, sistem akan menampilkan gradien inisial nama menu secara otomatis.
3. **Keranjang Belanja (Mobile Cart Drawer)**:
   - Ketika ada item di keranjang, bilah melayang (**Sticky Bottom Cart Bar**) akan muncul di bagian bawah layar mobile menampilkan jumlah item dan total belanja.
   - Tapping bilah tersebut akan memicu *checkout sheet/drawer* geser dari bawah/kanan.
   - Di dalam drawer, pelanggan dapat menambah/mengurangi jumlah belanjaan (dibatasi sesuai limit stok maksimum produk), melihat rincian biaya layanan & pajak, serta mengisi formulir data pemesanan.
4. **Formulir Checkout & Validasi**:
   - **Nama Lengkap**: Wajib diisi.
   - **No. WhatsApp**: Opsional. Namun jika diisi, sistem akan memvalidasi agar hanya berisi angka sebanyak 9 hingga 14 digit.
   - **Metode Pembayaran**: Memilih opsi Tunai, QRIS, atau Transfer Bank. Terdapat petunjuk ringkas (*Indonesian microcopy helper*) di bawah setiap pilihan metode untuk memandu tindakan lanjutan pelanggan.
5. **Halaman Sukses & Pelacakan Antrean (`/order/success/[orderId]`)**:
   - Menampilkan nomor antrean utama secara mencolok.
   - Menyertakan panduan teks instruksi langkah berikutnya sesuai dengan metode pembayaran yang dipilih (misal: *"Silakan scan QRIS toko di kasir"*).
   - Menyertakan **Timeline Tracker** dengan label bahasa Indonesia: *Menunggu Pembayaran*, *Sudah Dibayar*, *Sedang Diproses*, *Siap Diambil*, *Selesai*. Status ini diperbarui secara dinamis (live polling interval 3 detik).
   - Menyertakan tombol **Lihat Struk Digital** dan tombol **Hubungi WhatsApp Toko** (jika nomor WhatsApp terdaftar di profil bisnis) untuk mempermudah koordinasi langsung.

### Batasan Saat Ini (Technical Limitations)
- **Simulasi Pembayaran**: Metode pembayaran bersifat simulasi. Klik konfirmasi akan langsung memotong stok produk lokal di browser pelanggan dan meneruskannya ke dashboard kasir tanpa melalui portal gerbang pembayaran (payment gateway) riil.
- **Real-time Tracking**: Halaman antrean melakukan polling data berkala ke `localStorage` browser setiap 3 detik. Integrasi server-sent events atau WebSockets akan diaktifkan setelah database Supabase dihubungkan di fase produksi.

---

## 🚚 Pengaturan Delivery & Ongkir Berdasarkan Jarak (Phase 6.6 & 6.6B)

Aplikasi UMKM Pilot mendukung perhitungan ongkos kirim fleksibel dengan dua tipe perhitungan:
1. **Flat / Tetap**: Tarif ongkir flat seragam untuk semua pengiriman.
2. **Berdasarkan Jarak KM**: Perhitungan dinamis dengan rumus:
   `Biaya Dasar + ((Jarak Pembulatan - Jarak Biaya Dasar) * Tarif per KM)`

### Parameter Konfigurasi:
- **Biaya Dasar**: Tarif minimal untuk pengiriman jarak awal (misal: Rp 8.000).
- **Jarak Dasar**: Jarak maksimum yang dicover biaya dasar (misal: 2 KM).
- **Tarif per KM**: Tarif tambahan per KM berikutnya (misal: Rp 2.500/KM).
- **Batas Jarak Maksimum**: Batas jangkauan maksimal pengiriman dari toko (misal: 10 KM).
- **Aturan Pembulatan**: Pilihan aturan pembulatan jarak desimal:
  - *Ceil (Ke atas)*: Jarak 2.1 KM dibulatkan menjadi 3 KM.
  - *Round (Terdekat)*: Jarak 2.4 KM dibulatkan menjadi 2 KM.
  - *Floor (Ke bawah)*: Jarak 2.9 KM dibulatkan menjadi 2 KM.
- **Mode Hitung Jarak**:
  - *Manual*: Pelanggan memasukkan estimasi jarak sendiri di checkout untuk demo.
  - *Simulasi / Mock*: Tombol simulasi jarak acak di halaman checkout.
  - *Maps API*: Rencana integrasi Google Maps API setelah backend siap.

---

## 🛣️ Remaining Technical Debt

| Area | Issue | Priority |
|------|-------|----------|
| Auth | Password is ignored in mock login (any password accepted) | Medium |
| Auth | Registered users reset on page reload (in-memory MOCK_PROFILES) | Medium |
| Stock | Stock not re-validated in cart if another user orders while cart is open | Low |
| Orders | No pagination for large order lists | Low |
| Admin | Weekly trend chart uses seeded fake data for past days | Low |
| DB | Not connected to Supabase yet | When ready |
| AI | Insights are rule-based, not real LLM | When ready |

---

## 📋 Recommended Next Steps

1. **Connect Supabase**: Set `NEXT_PUBLIC_USE_SUPABASE=true` and populate `.env.local`
2. **Enable Supabase Auth**: Replace mock auth with `supabase.auth.signInWithPassword()`
3. **Real-time subscriptions**: Replace polling with `supabase.channel().on()` listeners
4. **Connect an LLM API**: Replace `insightService.generateInsights()` with a GPT/Gemini API call
5. **Print receipt**: Add a print/PDF receipt button on the cashier detail panel
6. **Multi-tenancy**: Add `business_id` scoping to all queries for SaaS isolation
