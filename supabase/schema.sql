-- UMKM Pilot Database Schema (Phase 7A)
-- Setup tables, types, constraints, and indexes.

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. PROFILES TABLE (USERS)
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CONSTRAINT check_profile_role CHECK (role IN ('admin', 'cashier')),
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
    cancelled_at TIMESTAMP WITH TIME ZONE
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 8. INSIGHTS TABLE
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

-- 9. PROMO RECOMMENDATIONS TABLE
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

-- === INDEXES FOR OPTIMAL QUERY PERFORMANCE ===

-- Indexes for orders queries
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);

-- Indexes for order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_promo_recs_business_id ON promo_recommendations(business_id);
