-- Phase 10C: Add individual Midtrans payment settings to businesses table.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS midtrans_server_key TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS midtrans_client_key TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS midtrans_merchant_id TEXT;
