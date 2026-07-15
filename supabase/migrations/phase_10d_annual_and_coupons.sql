-- Phase 10D: Subscription annual pricing, billing cycles, and coupon codes configuration.

-- 1. Add price_annual to plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_annual INTEGER DEFAULT 0;

-- Update seeded plans with default annual prices (Starter = Rp 990.000, Pro = Rp 1.990.000 - equivalent to 10 months)
UPDATE plans SET price_annual = 0 WHERE code = 'free';
UPDATE plans SET price_annual = 990000 WHERE code = 'starter';
UPDATE plans SET price_annual = 1990000 WHERE code = 'pro';

-- 2. Add billing_cycle to subscriptions and payments
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE business_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly';

-- 3. Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(50) NOT NULL, -- 'percentage' or 'fixed'
    discount_value INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Allow select to everyone (authenticated or public checkout)
CREATE POLICY coupons_public_select ON coupons
    FOR SELECT
    USING (true);

-- Allow all operations to authenticated users with service role (or handled in APIs by admin bypass)
CREATE POLICY coupons_service_all ON coupons
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Reload schema notification
NOTIFY pgrst, 'reload schema';
