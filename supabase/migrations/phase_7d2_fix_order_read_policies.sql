-- Phase 7D.2: Fix RLS Select and Update Policies for Orders, Order Items, and Transactions
-- Run this migration in your Supabase SQL editor or via CLI

-- Drop old order policies
DROP POLICY IF EXISTS "orders_staff_select" ON orders;
DROP POLICY IF EXISTS "orders_staff_update" ON orders;
DROP POLICY IF EXISTS "orders_public_select" ON orders;

-- Drop old order_items policies
DROP POLICY IF EXISTS "order_items_staff_select" ON order_items;
DROP POLICY IF EXISTS "order_items_public_select" ON order_items;

-- Drop old transactions policies
DROP POLICY IF EXISTS "transactions_staff_select" ON transactions;
DROP POLICY IF EXISTS "transactions_staff_insert" ON transactions;

-- =====================================================================
-- 1. Orders policies
-- =====================================================================
CREATE POLICY "orders_staff_select"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
        AND p.business_id = orders.business_id
        AND p.role IN ('admin', 'owner', 'cashier')
    )
  );

CREATE POLICY "orders_staff_update"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
        AND p.business_id = orders.business_id
        AND p.role IN ('admin', 'owner', 'cashier')
    )
  );

-- =====================================================================
-- 2. Order Items policies
-- =====================================================================
CREATE POLICY "order_items_staff_select"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN orders o ON o.business_id = p.business_id
      WHERE p.id = auth.uid()::text
        AND o.id = order_items.order_id
        AND p.role IN ('admin', 'owner', 'cashier')
    )
  );

-- =====================================================================
-- 3. Transactions policies
-- =====================================================================
CREATE POLICY "transactions_staff_select"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
        AND p.business_id = transactions.business_id
        AND p.role IN ('admin', 'owner', 'cashier')
    )
  );

CREATE POLICY "transactions_staff_insert"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
        AND p.business_id = transactions.business_id
        AND p.role IN ('admin', 'owner', 'cashier')
    )
  );
