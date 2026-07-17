-- Consolidated Migration Phase 3: Seed Data Seeding
-- Seeding default plans, features, coupons, demo businesses, and developer admin profiles.

-- ==========================================
-- 1. Seed Plans & Plan Features
-- ==========================================
INSERT INTO plans (id, code, name, description, price_monthly, price_annual, product_limit, order_limit_monthly, cashier_limit, ai_enabled, midtrans_enabled, report_export_enabled, is_active, sort_order, billing_cycle, price, trial_days, status)
VALUES 
  ('plan-free', 'free', 'Free / Trial', 'Cocok untuk mencoba UMKM Pilot', 0, 0, 20, 100, 1, false, false, false, true, 1, 'monthly', 0.00, 0, 'active'),
  ('plan-starter', 'starter', 'Starter', 'Untuk UMKM kecil yang mulai aktif berjualan', 99000, 990000, 100, 1000, 3, false, true, true, true, 2, 'monthly', 99000.00, 0, 'active'),
  ('plan-pro', 'pro', 'Pro', 'Untuk UMKM yang butuh insight, laporan, dan otomasi lebih lengkap', 199000, 1990000, 500, 5000, 10, true, true, true, true, 3, 'monthly', 199000.00, 0, 'active')
ON CONFLICT (code) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  product_limit = EXCLUDED.product_limit,
  order_limit_monthly = EXCLUDED.order_limit_monthly,
  cashier_limit = EXCLUDED.cashier_limit,
  ai_enabled = EXCLUDED.ai_enabled,
  midtrans_enabled = EXCLUDED.midtrans_enabled,
  report_export_enabled = EXCLUDED.report_export_enabled,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  billing_cycle = EXCLUDED.billing_cycle,
  price = EXCLUDED.price,
  trial_days = EXCLUDED.trial_days,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO plan_features (plan_id, feature_key, feature_limit)
VALUES 
  ('plan-free', 'products', 20),
  ('plan-starter', 'products', 100),
  ('plan-pro', 'products', 500)
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET feature_limit = EXCLUDED.feature_limit;


-- ==========================================
-- 2. Seed Default Coupons
-- ==========================================
INSERT INTO coupons (id, code, discount_type, discount_value, is_active)
VALUES
  ('coupon-pilot-promo', 'PILOTPROMO', 'percentage', 20, true),
  ('coupon-umkm-hebat', 'UMKMHEBAT', 'fixed', 50000, true)
ON CONFLICT (code) DO UPDATE
SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  is_active = EXCLUDED.is_active,
  updated_at = now();


-- ==========================================
-- 3. Seed Demo Business & Products
-- ==========================================
INSERT INTO businesses (
    id,
    name,
    business_type,
    description,
    logo_url,
    address,
    whatsapp_number,
    opening_hours,
    currency,
    tax_enabled,
    tax_percentage,
    service_charge_enabled,
    service_charge_percentage,
    delivery_settings,
    eta_settings,
    plan_code,
    subscription_status,
    trial_ends_at,
    slug,
    public_order_enabled
) VALUES (
    'biz-1',
    'Kopi & Cemilan Pilot',
    'makanan_minuman',
    'Warung Kopi Pintar dengan sistem pemesanan modern QR Code.',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80',
    'Jl. Teknologi No. 42, Silicon Valley Indonesia, Jakarta',
    '6281234567890',
    '08.00 - 22.00',
    'IDR',
    true,
    10.00,
    true,
    5.00,
    '{"maxDeliveryDistanceKm": 10, "deliveryFeePerKm": 3000, "freeDeliveryThreshold": 50000, "freeDeliveryEnabled": true, "deliveryFeeCalculationType": "distance_based"}'::jsonb,
    '{"etaEnabled": true, "defaultPreparationMinutes": 15, "defaultDeliveryMinutesPerKm": 5, "bufferMinutes": 5}'::jsonb,
    'pro',
    'active',
    NULL,
    'kopi-cemilan-pilot',
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    slug = EXCLUDED.slug,
    public_order_enabled = EXCLUDED.public_order_enabled,
    plan_code = EXCLUDED.plan_code,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();

INSERT INTO products (
    id,
    business_id,
    name,
    category,
    description,
    price,
    stock,
    low_stock_threshold,
    image_url,
    is_active
) VALUES 
(
    'prod-1',
    'biz-1',
    'Es Kopi Susu Gula Aren',
    'Minuman',
    'Kopi susu dingin khas nusantara dengan rasa manis legit gula aren alami.',
    18000.00,
    25,
    5,
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-2',
    'biz-1',
    'Nasi Ayam Geprek Level 5',
    'Makanan',
    'Nasi ayam goreng renyah yang digeprek dengan cabai rawit super pedas level 5.',
    22000.00,
    15,
    5,
    'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-3',
    'biz-1',
    'Mie Goreng Spesial + Telur',
    'Makanan',
    'Mie goreng legendaris dengan tambahan telur dadar/mata sapi, sawi hijau, dan bawang goreng.',
    15000.00,
    30,
    5,
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-4',
    'biz-1',
    'Roti Bakar Cokelat Keju',
    'Snack',
    'Roti panggang mentega bertabur meises cokelat melimpah dan parutan keju gurih.',
    14000.00,
    10,
    5,
    'https://images.unsplash.com/photo-1584776296984-48cd02b0c497?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-5',
    'biz-1',
    'Es Teh Manis Jumbo',
    'Minuman',
    'Teh melati manis dingin berukuran gelas jumbo, pelepas dahaga yang sangat segar.',
    6000.00,
    50,
    10,
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-6',
    'biz-1',
    'Kopi Hitam Mandheling',
    'Minuman',
    'Kopi hitam single origin Arabika Sumatra Mandheling yang diseduh manual.',
    12000.00,
    20,
    5,
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-7',
    'biz-1',
    'Paket Kenyang A (Geprek + Es Teh)',
    'Paket Promo',
    'Paket hemat kombinasi Nasi Ayam Geprek Level 5 dengan Es Teh Manis Jumbo.',
    25000.00,
    12,
    5,
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active;


-- =========================================================================================
-- 4. Safe Profile Seeding for Developer / Platform Owner Accounts (Safe DO block)
--    If auth.users matches, maps their profiles immediately.
-- =========================================================================================

-- Seed Platform Owner business container first
INSERT INTO businesses (
  id,
  name,
  business_type,
  slug,
  public_order_enabled,
  plan_code,
  subscription_status,
  trial_ends_at,
  delivery_settings,
  eta_settings
)
VALUES (
  'biz-platform-owner',
  'Platform Owner Container',
  'Platform',
  'platform-owner-container',
  false,
  'pro',
  'active',
  NULL,
  '{}'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET
  plan_code = 'pro',
  subscription_status = 'active',
  trial_ends_at = NULL,
  updated_at = NOW();

DO $$
DECLARE
  po_email TEXT := 'taufiqqurohman98@gmail.com';
  dev_email TEXT := 'lim.dev@gmail.com';
  po_user_id TEXT;
  dev_user_id TEXT;
BEGIN
  -- 1. Try to find Platform Owner Auth ID
  SELECT id::TEXT INTO po_user_id FROM auth.users WHERE lower(email) = lower(po_email) LIMIT 1;
  IF po_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, business_id, full_name, role, email)
    VALUES (po_user_id, NULL, 'Platform Owner', 'platform_owner', lower(po_email))
    ON CONFLICT (id) DO UPDATE
    SET
      business_id = NULL,
      role = 'platform_owner',
      email = lower(po_email),
      updated_at = NOW();
    RAISE NOTICE 'Seeded profile for platform owner: %', po_email;
  ELSE
    RAISE NOTICE 'Platform owner user % not found in auth.users. Profile seeding skipped.', po_email;
  END IF;

  -- 2. Try to find Developer Auth ID
  SELECT id::TEXT INTO dev_user_id FROM auth.users WHERE lower(email) = lower(dev_email) LIMIT 1;
  IF dev_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, business_id, full_name, role, email)
    VALUES (dev_user_id, 'biz-platform-owner', 'Developer Admin', 'admin', lower(dev_email))
    ON CONFLICT (id) DO UPDATE
    SET
      business_id = 'biz-platform-owner',
      role = 'admin',
      email = lower(dev_email),
      updated_at = NOW();
    RAISE NOTICE 'Seeded profile for developer: %', dev_email;
  ELSE
    RAISE NOTICE 'Developer user % not found in auth.users. Profile seeding skipped.', dev_email;
  END IF;

END $$;

-- Notify schema refresh
NOTIFY pgrst, 'reload schema';
