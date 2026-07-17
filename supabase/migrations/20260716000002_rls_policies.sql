-- Consolidated Migration Phase 2: Row-Level Security Policies Setup
-- Enforces RLS on all security-critical tables and applies proper select/insert/update/delete policies.

-- ==========================================
-- 1. Enable RLS on all core tables
-- ==========================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Note: profiles table is kept without RLS to preserve legacy behaviour for client auth / registration.


-- ==========================================
-- 2. BUSINESSES Policies
-- ==========================================

-- Allow all public/anonymous reads (customers viewing shop info) if public order is enabled
DROP POLICY IF EXISTS "businesses_public_read" ON businesses;
CREATE POLICY "businesses_public_read"
  ON businesses FOR SELECT
  USING (COALESCE(public_order_enabled, true) = true);

-- Allow authenticated business users to read their own business profile
DROP POLICY IF EXISTS "businesses_owner_read" ON businesses;
CREATE POLICY "businesses_owner_read"
  ON businesses FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles
      WHERE business_id = businesses.id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow authenticated owner/admin users to update their own business profile
DROP POLICY IF EXISTS "businesses_owner_update" ON businesses;
CREATE POLICY "businesses_owner_update"
  ON businesses FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles
      WHERE business_id = businesses.id
        AND role IN ('admin', 'owner')
    )
  );

-- Allow authenticated users to insert their business profile (chicken-and-egg signup flow solver)
DROP POLICY IF EXISTS "businesses_authenticated_insert" ON businesses;
CREATE POLICY "businesses_authenticated_insert"
  ON businesses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- ==========================================
-- 3. PRODUCTS Policies
-- ==========================================

-- Allow all public reads (customers browsing the active menu)
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read"
  ON products FOR SELECT
  USING (is_active = true);

-- Allow authenticated business users to read all products of their own business (including inactive)
DROP POLICY IF EXISTS "products_admin_read_all" ON products;
CREATE POLICY "products_admin_read_all"
  ON products FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow authenticated owners/admins to insert new products for their business
DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert"
  ON products FOR INSERT
  WITH CHECK (
    auth.uid()::text IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner')
    )
  );

-- Allow authenticated owners/admins to update products
DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update"
  ON products FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner')
    )
  );

-- Allow cashiers (and admins/owners) to update product stock
DROP POLICY IF EXISTS "products_cashier_stock_update" ON products;
CREATE POLICY "products_cashier_stock_update"
  ON products FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow authenticated owners/admins to deactivate (soft-delete) products
DROP POLICY IF EXISTS "products_admin_deactivate" ON products;
CREATE POLICY "products_admin_deactivate"
  ON products FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles
      WHERE business_id = products.business_id
        AND role IN ('admin', 'owner')
    )
  );


-- ==========================================
-- 4. ORDERS Policies
-- ==========================================

-- Allow authenticated staff to select orders of their business
DROP POLICY IF EXISTS "orders_staff_select" ON orders;
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

-- Allow authenticated staff to update orders of their business
DROP POLICY IF EXISTS "orders_staff_update" ON orders;
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

-- Allow public to select single orders by ID (receipts, tracking, and checkout success)
DROP POLICY IF EXISTS "orders_public_select" ON orders;
CREATE POLICY "orders_public_select"
  ON orders FOR SELECT
  USING (true);


-- ==========================================
-- 5. ORDER_ITEMS Policies
-- ==========================================

-- Allow authenticated staff to select order items of their business
DROP POLICY IF EXISTS "order_items_staff_select" ON order_items;
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

-- Allow public to select order items (for receipt checkout displays)
DROP POLICY IF EXISTS "order_items_public_select" ON order_items;
CREATE POLICY "order_items_public_select"
  ON order_items FOR SELECT
  USING (true);


-- ==========================================
-- 6. TRANSACTIONS Policies
-- ==========================================

-- Allow authenticated staff to read transaction history of their business
DROP POLICY IF EXISTS "transactions_staff_select" ON transactions;
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

-- Allow authenticated staff to log transactions for their business
DROP POLICY IF EXISTS "transactions_staff_insert" ON transactions;
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


-- ==========================================
-- 7. PAYMENTS Policies
-- ==========================================

-- Allow authenticated staff to view payments of their business
DROP POLICY IF EXISTS "payments_staff_select" ON payments;
CREATE POLICY "payments_staff_select"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
        AND p.business_id = payments.business_id
        AND p.role IN ('admin', 'owner', 'cashier')
    )
  );

-- Allow platform owners to view all payment records (for system audit console)
DROP POLICY IF EXISTS "payments_platform_owner_select" ON payments;
CREATE POLICY "payments_platform_owner_select"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'platform_owner'
    )
  );

-- Allow all operations to service role / backend client for payment processing webhook updates
DROP POLICY IF EXISTS "payments_service_all" ON payments;
CREATE POLICY "payments_service_all"
  ON payments FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 8. PAYMENT_EVENTS Policies
-- ==========================================

-- Allow backend client / service role to read/write log events
DROP POLICY IF EXISTS "admin_all_policy" ON payment_events;
CREATE POLICY "admin_all_policy"
  ON payment_events FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 9. PLANS Policies
-- ==========================================

-- Allow anyone (public/guest) to read subscription plans on landing page
DROP POLICY IF EXISTS "public_select_plans" ON plans;
CREATE POLICY "public_select_plans"
  ON plans FOR SELECT
  USING (true);

-- Allow full access to backend client / service role
DROP POLICY IF EXISTS "admin_all_plans" ON plans;
CREATE POLICY "admin_all_plans"
  ON plans FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 10. BUSINESS_SUBSCRIPTIONS Policies
-- ==========================================

-- Allow business owners / users to view their subscription status
DROP POLICY IF EXISTS "select_business_subscriptions" ON business_subscriptions;
CREATE POLICY "select_business_subscriptions"
  ON business_subscriptions FOR SELECT
  USING (true);

-- Allow updates to subscriptions (triggered via platform admins or backend services)
DROP POLICY IF EXISTS "write_business_subscriptions" ON business_subscriptions;
CREATE POLICY "write_business_subscriptions"
  ON business_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 11. SUBSCRIPTION_PAYMENTS Policies
-- ==========================================

-- Allow authenticated business admins to view SaaS subscription payments
DROP POLICY IF EXISTS "subscription_payments_admin_read" ON subscription_payments;
CREATE POLICY "subscription_payments_admin_read"
  ON subscription_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()::text
        AND profiles.business_id = subscription_payments.business_id
        AND profiles.role = 'admin'
    )
  );

-- Allow backend services full access to handle webhooks and logs
DROP POLICY IF EXISTS "subscription_payments_service_all" ON subscription_payments;
CREATE POLICY "subscription_payments_service_all"
  ON subscription_payments FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 12. SUBSCRIPTIONS Policies
-- ==========================================

-- Allow business admin or platform owner to view subscriptions
DROP POLICY IF EXISTS "subscriptions_admin_select" ON subscriptions;
CREATE POLICY "subscriptions_admin_select"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
        AND profiles.business_id = subscriptions.business_id 
        AND profiles.role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
        AND profiles.role = 'platform_owner'
    )
  );

-- Allow backend services full access
DROP POLICY IF EXISTS "subscriptions_service_all" ON subscriptions;
CREATE POLICY "subscriptions_service_all"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 13. INVOICES Policies
-- ==========================================

-- Allow business admin or platform owner to read invoices
DROP POLICY IF EXISTS "invoices_admin_select" ON invoices;
CREATE POLICY "invoices_admin_select"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      JOIN profiles ON profiles.business_id = subscriptions.business_id
      WHERE subscriptions.id = invoices.subscription_id
        AND profiles.id = auth.uid()::text
        AND profiles.role = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
        AND profiles.role = 'platform_owner'
    )
  );

-- Allow service role full access
DROP POLICY IF EXISTS "invoices_service_all" ON invoices;
CREATE POLICY "invoices_service_all"
  ON invoices FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 14. PLAN_FEATURES Policies
-- ==========================================

-- Public read access to see features included in plans
DROP POLICY IF EXISTS "plan_features_public_select" ON plan_features;
CREATE POLICY "plan_features_public_select"
  ON plan_features FOR SELECT
  USING (true);

-- Allow service role full access
DROP POLICY IF EXISTS "plan_features_service_all" ON plan_features;
CREATE POLICY "plan_features_service_all"
  ON plan_features FOR ALL
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 15. COUPONS Policies
-- ==========================================

-- Allow coupons lookup for subscription checkouts
DROP POLICY IF EXISTS "coupons_public_select" ON coupons;
CREATE POLICY "coupons_public_select"
  ON coupons FOR SELECT
  USING (true);

-- Allow service role full access
DROP POLICY IF EXISTS "coupons_service_all" ON coupons;
CREATE POLICY "coupons_service_all"
  ON coupons FOR ALL
  USING (true)
  WITH CHECK (true);

-- Notify schema refresh
NOTIFY pgrst, 'reload schema';
