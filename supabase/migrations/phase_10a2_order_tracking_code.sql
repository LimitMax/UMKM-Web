-- Phase 10A.2: Order tracking by tracking code only

-- Add columns if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code_created_at TIMESTAMPTZ DEFAULT now();

-- Helper function to generate tracking code
CREATE OR REPLACE FUNCTION generate_unique_tracking_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing orders that do not have a tracking code
DO $$
DECLARE
  r RECORD;
  new_code text;
  is_unique boolean;
BEGIN
  FOR r IN SELECT id, business_id FROM orders WHERE tracking_code IS NULL LOOP
    LOOP
      new_code := generate_unique_tracking_code();
      -- Check uniqueness for this business_id
      SELECT NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE business_id = r.business_id 
          AND tracking_code = new_code
      ) INTO is_unique;
      IF is_unique THEN
        EXIT;
      END IF;
    END LOOP;
    UPDATE orders SET tracking_code = new_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- Drop function after backfill
DROP FUNCTION IF EXISTS generate_unique_tracking_code();

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS orders_business_tracking_code_idx ON orders(business_id, tracking_code);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
