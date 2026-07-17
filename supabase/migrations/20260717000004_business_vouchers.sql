-- Create business_vouchers table
CREATE TABLE IF NOT EXISTS business_vouchers (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id VARCHAR(255) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(50) NOT NULL CONSTRAINT check_voucher_discount_type CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    max_discount NUMERIC(12, 2),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Prevent duplicate voucher codes within the same business
    CONSTRAINT unique_business_voucher_code UNIQUE (business_id, code)
);

-- Alter orders table to record applied vouchers
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS voucher_discount_amount NUMERIC(12, 2) DEFAULT 0.00;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
