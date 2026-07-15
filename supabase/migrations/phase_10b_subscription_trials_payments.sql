-- Phase 10B: Email-based subscription trial and SaaS subscription payments.

ALTER TABLE businesses
  ALTER COLUMN subscription_status SET DEFAULT 'trialing';

ALTER TABLE business_subscriptions
  ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_business_subscriptions_owner_email
  ON business_subscriptions (lower(owner_email));

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
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_payments_admin_read ON subscription_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.business_id = subscription_payments.business_id
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY subscription_payments_service_all ON subscription_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_business_id
  ON subscription_payments (business_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_provider_reference_id
  ON subscription_payments (provider_reference_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_status
  ON subscription_payments (status);

NOTIFY pgrst, 'reload schema';
