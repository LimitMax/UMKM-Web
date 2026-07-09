-- Phase 7D: Row-Level Security for orders, order_items, and transactions
-- Run this migration in your Supabase SQL editor or via CLI

-- =====================================================================
-- 1. Enable RLS on orders table
-- =====================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admin/cashier to read orders of their own business
CREATE POLICY "orders_staff_select"
  ON orders FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = orders.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow authenticated admin/cashier to update orders of their own business
CREATE POLICY "orders_staff_update"
  ON orders FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = orders.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow public to select single orders by ID (for receipt & order success pages)
CREATE POLICY "orders_public_select"
  ON orders FOR SELECT
  USING (true);

-- Note: No INSERT policy for public/anon is needed since orders are created
-- via the /api/orders backend endpoint using the bypass-RLS Service Role key.


-- =====================================================================
-- 2. Enable RLS on order_items table
-- =====================================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff to select order items of their business
CREATE POLICY "order_items_staff_select"
  ON order_items FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = (SELECT business_id FROM orders WHERE id = order_items.order_id)
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow public to read order items (for receipt & success page listing)
CREATE POLICY "order_items_public_select"
  ON order_items FOR SELECT
  USING (true);

-- Note: No INSERT policy for public/anon is needed as it is created by the backend endpoint.


-- =====================================================================
-- 3. Enable RLS on transactions table
-- =====================================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated staff to select transaction records
CREATE POLICY "transactions_staff_select"
  ON transactions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = transactions.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow authenticated staff to insert new transaction records
CREATE POLICY "transactions_staff_insert"
  ON transactions FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = transactions.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );
