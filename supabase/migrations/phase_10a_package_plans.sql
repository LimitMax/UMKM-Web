-- Migration: Phase 10A Package Plans

-- 1. Create plans table if not exists
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly INTEGER DEFAULT 0,
    product_limit INTEGER,
    order_limit_monthly INTEGER,
    cashier_limit INTEGER,
    ai_enabled BOOLEAN DEFAULT false,
    midtrans_enabled BOOLEAN DEFAULT false,
    report_export_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Select policy: public can read plans
CREATE POLICY public_select_plans ON plans
    FOR SELECT
    USING (true);

-- Admin policy: allow all ops
CREATE POLICY admin_all_plans ON plans
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Create business_subscriptions table if not exists
CREATE TABLE IF NOT EXISTS business_subscriptions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id VARCHAR(255) REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id VARCHAR(255) REFERENCES plans(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for business_subscriptions
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;

-- Read policy: profile user linked to business can read
CREATE POLICY select_business_subscriptions ON business_subscriptions
    FOR SELECT
    USING (true);

-- Write policy: admin check
CREATE POLICY write_business_subscriptions ON business_subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Add columns to businesses if not exists
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS plan_code VARCHAR(100) DEFAULT 'free';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 4. Seed default plans
INSERT INTO plans (id, code, name, description, price_monthly, product_limit, order_limit_monthly, cashier_limit, ai_enabled, midtrans_enabled, report_export_enabled, is_active, sort_order)
VALUES 
  ('plan-free', 'free', 'Free / Trial', 'Cocok untuk mencoba UMKM Pilot', 0, 20, 100, 1, false, false, false, true, 1),
  ('plan-starter', 'starter', 'Starter', 'Untuk UMKM kecil yang mulai aktif berjualan', 99000, 100, 1000, 3, false, true, true, true, 2),
  ('plan-pro', 'pro', 'Pro', 'Untuk UMKM yang butuh insight, laporan, dan otomasi lebih lengkap', 199000, 500, 5000, 10, true, true, true, true, 3)
ON CONFLICT (code) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  product_limit = EXCLUDED.product_limit,
  order_limit_monthly = EXCLUDED.order_limit_monthly,
  cashier_limit = EXCLUDED.cashier_limit,
  ai_enabled = EXCLUDED.ai_enabled,
  midtrans_enabled = EXCLUDED.midtrans_enabled,
  report_export_enabled = EXCLUDED.report_export_enabled,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 5. Notify schema reload
NOTIFY pgrst, 'reload schema';

-- 6. Fix chicken-and-egg problem for business registration
DROP POLICY IF EXISTS "businesses_owner_insert" ON businesses;
CREATE POLICY "businesses_authenticated_insert"
  ON businesses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

