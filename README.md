# UMKM Pilot — Multi-Tenant SaaS Platform with AI Insights & Tenant-Split Payments

UMKM Pilot is a production-ready, high-performance, full-stack multi-tenant SaaS application designed for micro, small, and medium enterprises (UMKM). It enables business owners to receive real-time digital customer orders, manage cashier workflows, monitor inventory stock levels, generate detailed reports, analyze operations with an AI Assistant, set up independent payment gateways, and configure sub-accounts for their cashiers.

---

## 🚀 Key Features

1. **Multi-Tenant Separation**: Database rows are strictly isolated using PostgreSQL policies and filters, ensuring no tenant business can access or modify another business's data.
2. **Staff Role Guarding**: Active role-based permissions (`admin` and `cashier`) managed via Supabase Auth and metadata profiles.
3. **Cashier Queue Management**: Interactive cashier queue interface featuring status transitions (Paid, Processing, Ready, Completed, Cancelled) with automatic stock restoration upon cancellation.
4. **Real-Time Client Tracking**: Customers order via a mobile-responsive catalog and track order status/ETA changes live, powered by Supabase Realtime subscriptions.
5. **Dynamic Delivery Fee**: Supports flat-rate or distance-based delivery fees calculated dynamically with custom decimal rounding modes (Ceil, Round, Floor) configured by each merchant.
6. **LLM-Powered AI Assistant**: Real-time sales insights and promo recommendation generators powered by LLM, along with a floating conversational AI Chat Pilot.
7. **Platform Owner Portal (Developer Account)**: A restricted admin suite for platform owners to customize monthly/annual pricing plans and manage coupon codes.
8. **Monthly vs Annual Billing**: Toggle billing periods during SaaS activation with instant discount coupon code validation.
9. **Dynamic Tenant-Split Payments**:
   - **SaaS Subscriptions**: Managed dynamically using the platform owner's Midtrans merchant credentials.
   - **UMKM Orders**: Billed directly to individual merchant accounts using custom Midtrans server keys configured in the merchant's settings.
10. **Dynamic Image Fallbacks**: Fallback category-specific high-definition photos (Makanan, Minuman, Snack, Promo) for products and professional storefront illustrations for business logos when inputs are omitted.

---

## ⚡ Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file at the root of the project (copying `.env.example`) and fill in your keys:
```env
# Client-Safe Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-your-sandbox-client-key
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
NEXT_PUBLIC_DEVELOPER_EMAILS=owner@platform.com,developer@platform.com

# Server-Only Configurations
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://router.bynara.id/v1
LLM_MODEL=mistral-large
MIDTRANS_SERVER_KEY=SB-Mid-server-your-sandbox-server-key
MIDTRANS_SNAP_BASE_URL=https://app.sandbox.midtrans.com
MIDTRANS_CORE_API_BASE_URL=https://api.sandbox.midtrans.com
```

### 3. Apply SQL Migrations
Apply all migration files located in `supabase/migrations/` in chronological order via your Supabase SQL Editor:
1. `phase_7c_business_products_rls.sql` - Core products & businesses schema with RLS.
2. `phase_7d_orders_rls.sql` / `phase_7d2_fix_order_read_policies.sql` - Orders schema, order items, and RLS.
3. `phase_7e_realtime_policies.sql` - Enable real-time updates for checkout and queue trackers.
4. `phase_9a_midtrans_payments.sql` / `phase_9c_midtrans_webhook.sql` - Payment processing tables and webhooks.
5. `phase_10a_package_plans.sql` - SaaS pricing plans and default seed plans.
6. `phase_10b_subscription_trials_payments.sql` - Email-based subscription trial tracking.
7. `phase_10c_individual_business_midtrans.sql` - Dynamic per-tenant Midtrans credential columns.
8. `phase_10d_annual_and_coupons.sql` - Annual pricing columns, coupons management tables, and RLS.

### 4. Run Dev Server
```bash
npm run dev
```

---

## 🛣️ URLs & Application Routings

- **Landing Portal**: `http://localhost:3000/`
- **Customer Ordering Page**: `http://localhost:3000/order/[businessSlug]`
- **Customer Order Tracker**: `http://localhost:3000/order/[businessSlug]/track`
- **Admin Dashboard**: `http://localhost:3000/admin`
- **Platform Owner Portal**: `http://localhost:3000/admin/platform-owner`
- **Cashier Dashboard**: `http://localhost:3000/cashier`
- **Login Portal**: `http://localhost:3000/login`
- **Registration Wizard**: `http://localhost:3000/register`

---

## 🛡️ Role-Based Access Controls (RBAC)

- **Admin/Owner**: Full management capabilities. Configures business profile settings, registers cashiers, manages products/stock, exports reports, generates AI insights, and subscribes/renews SaaS plans.
- **Staf Kasir**: Queue operational access. Manages active incoming order pipelines, triggers status updates, and views receipts. Administrative pages are blocked.
- **Pemilik Platform**: Access-restricted to emails matching the `NEXT_PUBLIC_DEVELOPER_EMAILS` variable. Grants access to the **Platform Owner Portal** to set pricing rates and coupon databases.
- **Customer**: Public access to browse menu items, place orders, complete online payments, and monitor orders.

---

## 💳 Payment Gateway Configurations

### SaaS Subscriptions (Platform Level)
Processed using the global credentials defined in `.env.local` (`MIDTRANS_SERVER_KEY`). Webhook notifications matching the order prefix `SUB-` route subscription updates and calculate monthly/annual expiration periods.

### UMKM Transactions (Tenant Level)
Managed per-tenant in **Pengaturan Bisnis** -> **Status Pembayaran**.
- Enter your store's Midtrans Server Key and Client Key.
- Client orders are dynamically signed and routed using the store's keys.
- Webhook notifications verify signatures dynamically and record payments.

---

## 🤖 AI Features Configuration

The conversational chat pilot and analytical insight widgets rely on the server-side LLM configs (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`). 
- **AI Insights**: Generates automated summaries of sales trends, best-selling categories, and low stock actions.
- **Tanya AI Pilot**: A floating chat assistant that can answer general business operations questions, evaluate product stock levels, and suggest custom promo ideas.
