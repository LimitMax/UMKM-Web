-- Phase 7E: Enable Supabase Realtime for Core Tables
-- Run this migration in your Supabase SQL editor or via CLI

-- 1. Ensure supabase_realtime publication exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Configure tables within the publication
ALTER PUBLICATION supabase_realtime SET TABLE orders, order_items, transactions, products;

-- 3. Set REPLICA IDENTITY FULL to ensure all old/new fields are replicated on updates
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
