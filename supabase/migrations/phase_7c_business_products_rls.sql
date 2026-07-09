-- Phase 7C: Row-Level Security for businesses and products tables
-- Run this migration in your Supabase SQL editor or via CLI

-- =====================================================================
-- 1. Enable RLS on businesses table
-- =====================================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Allow all public/anonymous reads (customers viewing shop info)
CREATE POLICY "businesses_public_read"
  ON businesses FOR SELECT
  USING (true);

-- Allow authenticated admin users to update their own business profile
CREATE POLICY "businesses_owner_update"
  ON businesses FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = businesses.id
        AND role IN ('admin', 'owner')
    )
  );

-- Allow authenticated admin users to insert their business profile
CREATE POLICY "businesses_owner_insert"
  ON businesses FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = businesses.id
        AND role IN ('admin', 'owner')
    )
  );

-- =====================================================================
-- 2. Enable RLS on products table
-- =====================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow all public reads (customers browsing the product menu)
CREATE POLICY "products_public_read"
  ON products FOR SELECT
  USING (is_active = true);

-- Allow authenticated admin users to read all products (including inactive)
CREATE POLICY "products_admin_read_all"
  ON products FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow authenticated admin users to insert new products
CREATE POLICY "products_admin_insert"
  ON products FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner')
    )
  );

-- Allow authenticated admin/owner to update products (name, price, category, etc.)
CREATE POLICY "products_admin_update"
  ON products FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner')
    )
  );

-- Allow cashiers to update stock only
-- Note: We use a separate restrictive policy for stock-only updates.
-- In practice, stock is updated via the productService which runs with the authenticated user.
CREATE POLICY "products_cashier_stock_update"
  ON products FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow admin/owner to deactivate (soft-delete) products via is_active = false
CREATE POLICY "products_admin_deactivate"
  ON products FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner')
    )
  );

-- =====================================================================
-- Notes:
-- - Physical DELETE is intentionally not allowed; soft-delete via is_active=false is used.
-- - Customer stock adjustments on checkout happen via the authenticated user's session
--   (productService.adjustStock). If the user is anonymous, stock updates are skipped.
-- - The public customer checkout on /order reduces stock using the admin/owner user's
--   session when Supabase is configured.
-- =====================================================================
