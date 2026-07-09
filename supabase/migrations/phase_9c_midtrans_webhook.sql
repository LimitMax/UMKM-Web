-- Phase 9C: Midtrans webhook audit/status fields and refunded status support.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS snap_token TEXT,
  ADD COLUMN IF NOT EXISTS snap_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fraud_status VARCHAR(100),
  ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS settlement_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS check_order_payment_status;

ALTER TABLE orders
  ADD CONSTRAINT check_order_payment_status
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS check_transaction_payment_status;

ALTER TABLE transactions
  ADD CONSTRAINT check_transaction_payment_status
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS check_transaction_status;

ALTER TABLE transactions
  ADD CONSTRAINT check_transaction_status
  CHECK (transaction_status IN ('pending', 'paid', 'failed', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);

NOTIFY pgrst, 'reload schema';
