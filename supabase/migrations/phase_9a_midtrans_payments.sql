-- Phase 9A: Midtrans Sandbox Snap payment metadata.
-- Keeps the existing payments table and adds Snap-specific fields idempotently.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS snap_token TEXT,
  ADD COLUMN IF NOT EXISTS snap_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fraud_status VARCHAR(100),
  ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS settlement_time TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_payments_provider_reference_id ON payments(provider_reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_created_at ON payments(order_id, created_at DESC);

-- Ask Supabase/PostgREST to refresh its schema cache after adding columns.
-- This prevents API errors like "Could not find the 'payment_type' column".
NOTIFY pgrst, 'reload schema';
