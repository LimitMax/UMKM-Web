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

## ⚙️ Swappable Database Configuration

UMKM Pilot is built with a swappable repository layer. It operates offline/locally via `localStorage` by default, but it is **Supabase PostgreSQL ready**. 

To migrate to a live Supabase backend:

1.  **Configure Credentials**:
    Create a `.env.local` file at the root of the project and fill it with your live keys (see template in `.env.example`):
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    NEXT_PUBLIC_USE_SUPABASE=true
    ```
2.  **Toggle the Flag**:
    By setting `NEXT_PUBLIC_USE_SUPABASE=true`, all services (`productService`, `orderService`, etc.) will bypass localStorage and route queries directly to your Supabase tables.

---

## 🗄️ Database Schemas (Supabase / PostgreSQL)

Run the following SQL DDL query inside your Supabase SQL Editor to generate all required tables and relationships:

```sql
-- 1. Businesses Table (Enables multi-tenancy SaaS partitioning)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Profiles Table (Extends Supabase auth.users with custom roles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Products Table (Inventory & Menus)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) CHECK (category IN ('Makanan', 'Minuman', 'Snack', 'Paket Promo')) NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Orders Table (Checkout queue ledger)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  queue_number VARCHAR(10) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  notes TEXT,
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('Cash', 'QRIS', 'Bank Transfer')) NOT NULL,
  payment_status VARCHAR(50) CHECK (payment_status IN ('Waiting for Payment', 'Paid', 'Failed')) DEFAULT 'Waiting for Payment' NOT NULL,
  status VARCHAR(50) CHECK (status IN ('Waiting for Payment', 'Paid', 'Processing', 'Ready', 'Completed', 'Cancelled')) DEFAULT 'Waiting for Payment' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Order Items Table (Detailed items cart expansion)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0)
);

-- 6. Transactions Table (Accounting ledger)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Insights Table (Weekly cache for AI advice)
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  recommendations TEXT[] NOT NULL,
  promo_title VARCHAR(255) NOT NULL,
  promo_description TEXT NOT NULL,
  promo_caption TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id, date)
);
```

### Row Level Security (RLS) Recommendations

To isolate client data between separate businesses, enable Row Level Security (RLS) on your tables:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Example: Select only products belonging to the user's business_id
CREATE POLICY business_isolation_policy ON products
  FOR ALL
  USING (
    business_id = (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## 🚀 Supabase Integration Steps

Follow these steps to connect your Next.js application to your active database:

1.  **Run SQL schemas**: Copy the SQL DDL commands above and run them inside your Supabase project's SQL editor.
2.  **Enable Supabase Auth**: Configure Email Auth providers inside your Supabase Auth settings console.
3.  **Insert Seed Data**: In your Supabase dashboard table editor, insert initial catalog items into the `products` table matching your business ID.
4.  **Connect Auth triggers**: Write a database trigger function inside Supabase to automatically create a `profiles` row in the public schema whenever a user registers through Supabase auth:
    ```sql
    CREATE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, name, email, role)
      VALUES (new.id, new.raw_user_meta_data->>'name', new.email, 'cashier');
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

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
