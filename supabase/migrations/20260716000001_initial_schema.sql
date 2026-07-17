-- Consolidated Migration Phase 1: Initial Schema Setup
-- Creating all tables, constraints, indexes, functions, triggers, and realtime publication setup.

-- 1. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS businesses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) DEFAULT 'makanan_minuman',
    description TEXT,
    logo_url TEXT,
    address TEXT,
    whatsapp_number VARCHAR(50),
    opening_hours VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'IDR',
    tax_enabled BOOLEAN DEFAULT false NOT NULL,
    tax_percentage NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    service_charge_enabled BOOLEAN DEFAULT false NOT NULL,
    service_charge_percentage NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    delivery_settings JSONB DEFAULT '{}'::jsonb NOT NULL,
    eta_settings JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    plan_code VARCHAR(100) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ,
    slug TEXT,
    public_order_enabled BOOLEAN DEFAULT true,
    midtrans_server_key TEXT,
    midtrans_client_key TEXT,
    midtrans_merchant_id TEXT,
    status VARCHAR(50) DEFAULT 'active' CONSTRAINT check_business_status CHECK (status IN ('trial', 'active', 'suspended', 'archived')),
    suspended_reason TEXT,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

-- 2. PROFILES TABLE (USERS)
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) REFERENCES businesses(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CONSTRAINT check_profile_role CHECK (role IN ('admin', 'cashier', 'platform_owner')),
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    queue_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    fulfillment_type VARCHAR(50) NOT NULL CONSTRAINT check_order_fulfillment CHECK (fulfillment_type IN ('dine_in', 'pickup', 'delivery')),
    recipient_name VARCHAR(255),
    delivery_phone VARCHAR(50),
    delivery_address TEXT,
    delivery_notes TEXT,
    delivery_distance_km NUMERIC(6, 2) DEFAULT 0.00,
    delivery_fee_calculation_type VARCHAR(50) CONSTRAINT check_delivery_fee_type CHECK (delivery_fee_calculation_type IN ('fixed', 'distance_based')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    service_charge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_admin_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    free_delivery_applied BOOLEAN NOT NULL DEFAULT false,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL CONSTRAINT check_order_payment_method CHECK (payment_method IN ('cash', 'qris', 'bank_transfer', 'non_cash')),
    payment_status VARCHAR(50) NOT NULL CONSTRAINT check_order_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    order_status VARCHAR(50) NOT NULL CONSTRAINT check_order_status CHECK (order_status IN ('pending', 'paid', 'processing', 'ready', 'delivering', 'completed', 'cancelled')),
    notes TEXT,
    estimated_preparation_minutes INTEGER,
    estimated_delivery_minutes INTEGER,
    estimated_total_minutes INTEGER,
    estimated_ready_at TIMESTAMP WITH TIME ZONE,
    estimated_arrival_at TIMESTAMP WITH TIME ZONE,
    eta_label VARCHAR(100),
    eta_updated_at TIMESTAMP WITH TIME ZONE,
    eta_manually_adjusted BOOLEAN NOT NULL DEFAULT false,
    eta_adjustment_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    tracking_code TEXT,
    tracking_code_created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL CONSTRAINT check_transaction_payment_method CHECK (payment_method IN ('cash', 'qris', 'bank_transfer', 'non_cash')),
    payment_status VARCHAR(50) NOT NULL CONSTRAINT check_transaction_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    transaction_status VARCHAR(50) NOT NULL CONSTRAINT check_transaction_status CHECK (transaction_status IN ('pending', 'paid', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider VARCHAR(100) DEFAULT 'midtrans',
    provider_reference_id VARCHAR(255),
    payment_method VARCHAR(50) NOT NULL CONSTRAINT check_payments_payment_method CHECK (payment_method IN ('cash', 'qris', 'bank_transfer', 'non_cash')),
    qris_url TEXT,
    qris_string TEXT,
    va_number VARCHAR(100),
    va_bank VARCHAR(50),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    raw_callback_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    snap_token TEXT,
    snap_redirect_url TEXT,
    payment_type VARCHAR(100),
    fraud_status VARCHAR(100),
    transaction_time TIMESTAMP WITH TIME ZONE,
    settlement_time TIMESTAMP WITH TIME ZONE,
    webhook_received_at TIMESTAMP WITH TIME ZONE,
    last_webhook_status VARCHAR(100),
    last_webhook_transaction_status VARCHAR(100)
);

-- 8. PAYMENT_EVENTS TABLE
CREATE TABLE IF NOT EXISTS payment_events (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    payment_id VARCHAR(255),
    provider VARCHAR(100) DEFAULT 'midtrans',
    provider_reference_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    transaction_status VARCHAR(100),
    fraud_status VARCHAR(100),
    raw_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 9. INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS insights (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'rule_engine',
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 10. PROMO RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS promo_recommendations (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    reason TEXT,
    main_product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    bundle_product_id VARCHAR(255) REFERENCES products(id),
    suggested_promo_name VARCHAR(255) NOT NULL,
    normal_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    suggested_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estimated_savings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    target_time VARCHAR(100),
    target_customer VARCHAR(255),
    campaign_goal TEXT,
    whatsapp_caption TEXT,
    instagram_caption TEXT,
    short_caption TEXT,
    confidence_score NUMERIC(5, 2) DEFAULT 0.00,
    based_on_signals JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 11. PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly INTEGER DEFAULT 0,
    price_annual INTEGER DEFAULT 0,
    product_limit INTEGER,
    order_limit_monthly INTEGER,
    cashier_limit INTEGER,
    ai_enabled BOOLEAN DEFAULT false,
    midtrans_enabled BOOLEAN DEFAULT false,
    report_export_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    price NUMERIC(12, 2) DEFAULT 0.00,
    trial_days INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CONSTRAINT check_plan_status CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. BUSINESS_SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS business_subscriptions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id VARCHAR(255) REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id VARCHAR(255) REFERENCES plans(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    owner_email VARCHAR(255),
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    coupon_code VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. SUBSCRIPTION_PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS subscription_payments (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subscription_id VARCHAR(255) REFERENCES business_subscriptions(id) ON DELETE SET NULL,
    plan_id VARCHAR(255) REFERENCES plans(id) ON DELETE SET NULL,
    owner_email VARCHAR(255) NOT NULL,
    provider VARCHAR(100) DEFAULT 'midtrans' NOT NULL,
    provider_reference_id VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    snap_token TEXT,
    snap_redirect_url TEXT,
    payment_type VARCHAR(100),
    fraud_status VARCHAR(100),
    transaction_time TIMESTAMPTZ,
    settlement_time TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    raw_callback_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    webhook_received_at TIMESTAMPTZ,
    last_webhook_status VARCHAR(100),
    last_webhook_transaction_status VARCHAR(100),
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    coupon_code VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 14. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id VARCHAR(255) REFERENCES plans(id) ON DELETE SET NULL,
    pending_plan_id VARCHAR(255) REFERENCES plans(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'trial' CONSTRAINT check_subscription_status CHECK (status IN ('trial', 'active', 'grace_period', 'expired', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    renewal_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(255) PRIMARY KEY,
    subscription_id VARCHAR(255) NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CONSTRAINT check_invoice_status CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
    payment_method VARCHAR(100),
    midtrans_order_id VARCHAR(255),
    midtrans_transaction_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. PLAN_FEATURES TABLE
CREATE TABLE IF NOT EXISTS plan_features (
    plan_id VARCHAR(255) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_limit INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (plan_id, feature_key)
);

-- 17. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(50) NOT NULL, -- 'percentage' or 'fixed'
    discount_value INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- === INDEXES FOR OPTIMAL QUERY PERFORMANCE ===
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_promo_recs_business_id ON promo_recommendations(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference_id ON payments(provider_reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_created_at ON payments(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique_idx ON businesses(slug);
CREATE UNIQUE INDEX IF NOT EXISTS orders_business_tracking_code_idx ON orders(business_id, tracking_code);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_owner_email ON business_subscriptions (lower(owner_email));
CREATE INDEX IF NOT EXISTS idx_subscription_payments_business_id ON subscription_payments (business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_provider_reference_id ON subscription_payments (provider_reference_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments (status);


-- === TRIGGERS & FUNCTIONS ===

-- 1. check_business_status_update
CREATE OR REPLACE FUNCTION check_business_status_update()
RETURNS TRIGGER AS $$
DECLARE
  caller_role VARCHAR(50);
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status OR
      OLD.suspended_reason IS DISTINCT FROM NEW.suspended_reason OR
      OLD.suspended_at IS DISTINCT FROM NEW.suspended_at OR
      OLD.suspended_by IS DISTINCT FROM NEW.suspended_by OR
      OLD.deleted_at IS DISTINCT FROM NEW.deleted_at OR
      OLD.deleted_by IS DISTINCT FROM NEW.deleted_by) THEN

    IF (auth.uid() IS NOT NULL) THEN
      SELECT role INTO caller_role FROM profiles WHERE id = auth.uid()::text;
      
      IF (caller_role IS NULL OR caller_role != 'platform_owner') THEN
        RAISE EXCEPTION 'Only platform_owner can modify business status, suspension, or deletion fields.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_business_status_update ON businesses;
CREATE TRIGGER trg_check_business_status_update
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION check_business_status_update();


-- 2. sync_legacy_to_subscription
CREATE OR REPLACE FUNCTION sync_legacy_to_subscription()
RETURNS TRIGGER AS $$
BEGIN
  IF (pg_trigger_depth() > 1) THEN
    RETURN NEW;
  END IF;

  INSERT INTO subscriptions (
    id,
    business_id,
    plan_id,
    status,
    started_at,
    trial_start,
    trial_end,
    expires_at,
    renewal_at,
    cancelled_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.business_id,
    NEW.plan_id,
    CASE 
      WHEN NEW.status = 'trialing' THEN 'trial'
      WHEN NEW.status = 'past_due' THEN 'grace_period'
      ELSE NEW.status 
    END,
    NEW.started_at,
    NEW.started_at,
    NEW.trial_ends_at,
    NEW.current_period_end,
    NEW.current_period_start,
    NEW.cancelled_at,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    trial_end = EXCLUDED.trial_end,
    expires_at = EXCLUDED.expires_at,
    renewal_at = EXCLUDED.renewal_at,
    cancelled_at = EXCLUDED.cancelled_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_legacy_to_subscription ON business_subscriptions;
CREATE TRIGGER trg_sync_legacy_to_subscription
  AFTER INSERT OR UPDATE ON business_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_legacy_to_subscription();


-- 3. sync_subscription_to_legacy
CREATE OR REPLACE FUNCTION sync_subscription_to_legacy()
RETURNS TRIGGER AS $$
DECLARE
  plan_code_val VARCHAR(100);
BEGIN
  IF (pg_trigger_depth() > 1) THEN
    RETURN NEW;
  END IF;

  SELECT code INTO plan_code_val FROM plans WHERE id = NEW.plan_id;

  UPDATE businesses
  SET 
    plan_code = COALESCE(plan_code_val, 'free'),
    subscription_status = CASE 
      WHEN NEW.status = 'trial' THEN 'trialing'
      WHEN NEW.status = 'grace_period' THEN 'past_due'
      ELSE NEW.status 
    END,
    trial_ends_at = NEW.trial_end,
    updated_at = NOW()
  WHERE id = NEW.business_id;

  INSERT INTO business_subscriptions (
    id,
    business_id,
    plan_id,
    status,
    billing_cycle,
    started_at,
    trial_ends_at,
    current_period_start,
    current_period_end,
    created_at,
    updated_at,
    cancelled_at
  )
  VALUES (
    NEW.id,
    NEW.business_id,
    NEW.plan_id,
    CASE 
      WHEN NEW.status = 'trial' THEN 'trialing'
      WHEN NEW.status = 'grace_period' THEN 'past_due'
      ELSE NEW.status 
    END,
    'monthly',
    NEW.started_at,
    NEW.trial_end,
    NEW.renewal_at,
    NEW.expires_at,
    NEW.created_at,
    NEW.updated_at,
    NEW.cancelled_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = NOW(),
    cancelled_at = EXCLUDED.cancelled_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_subscription_to_legacy ON subscriptions;
CREATE TRIGGER trg_sync_subscription_to_legacy
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_legacy();


-- 4. sync_payment_to_invoice
CREATE OR REPLACE FUNCTION sync_payment_to_invoice()
RETURNS TRIGGER AS $$
DECLARE
  sub_id VARCHAR(255);
BEGIN
  IF (pg_trigger_depth() > 1) THEN
    RETURN NEW;
  END IF;

  sub_id := NEW.subscription_id;
  IF (sub_id IS NULL) THEN
    SELECT id INTO sub_id FROM subscriptions WHERE business_id = NEW.business_id LIMIT 1;
  END IF;

  IF (sub_id IS NOT NULL) THEN
    INSERT INTO invoices (
      id,
      subscription_id,
      invoice_number,
      amount,
      status,
      payment_method,
      midtrans_order_id,
      midtrans_transaction_id,
      paid_at,
      created_at
    )
    VALUES (
      NEW.id,
      sub_id,
      NEW.provider_reference_id,
      NEW.amount,
      CASE 
        WHEN NEW.status = 'paid' THEN 'paid'
        WHEN NEW.status = 'failed' THEN 'failed'
        WHEN NEW.status = 'expired' THEN 'expired'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
      END,
      NEW.payment_type,
      NEW.provider_reference_id,
      NEW.provider_reference_id,
      NEW.paid_at,
      NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE
    SET
      status = EXCLUDED.status,
      payment_method = EXCLUDED.payment_method,
      paid_at = EXCLUDED.paid_at,
      midtrans_transaction_id = EXCLUDED.midtrans_transaction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payment_to_invoice ON subscription_payments;
CREATE TRIGGER trg_sync_payment_to_invoice
  AFTER INSERT OR UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_to_invoice();


-- === ENABLE REALTIME ===
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime SET TABLE orders, order_items, transactions, products;

ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;

-- Notify PostgREST schema refresh
NOTIFY pgrst, 'reload schema';
