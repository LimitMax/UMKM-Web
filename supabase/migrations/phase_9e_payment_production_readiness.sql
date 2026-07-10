-- Migration: Phase 9E Payment Production Readiness

-- 1. Add optional audit columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS last_webhook_status VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS last_webhook_transaction_status VARCHAR(100);

-- 2. Create payment_events audit logging table
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

-- Enable RLS for payment_events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Allow admin read/write
CREATE POLICY admin_all_policy ON payment_events
    FOR ALL
    USING (true)
    WITH CHECK (true);
