/*
===========================================================
UMKM PILOT - RESET DATABASE FOR UAT
===========================================================
WARNING:
This script will DELETE ALL transactional and tenant data:

✓ Businesses
✓ Profiles
✓ Products
✓ Orders & Order Items
✓ Payments & Payment Events
✓ Transactions
✓ AI Insights & Promo Recommendations
✓ Subscriptions (Legacy & New) & Invoices
✓ Coupons

This script DOES NOT delete:
✗ plans (subscription packages)
✗ schema structure
✗ migrations history
✗ auth.users (Supabase Authentication accounts)

Run ONLY for Development / UAT testing.
===========================================================
*/

DO $$
DECLARE
  tab text;
  tables_to_truncate text[] := ARRAY[
    'promo_recommendations',
    'insights',
    'order_items',
    'payments',
    'payment_events',
    'transactions',
    'business_subscriptions',
    'subscription_payments',
    'subscriptions',
    'invoices',
    'orders',
    'products',
    'profiles',
    'businesses',
    'coupons'
  ];
  existing_tables text := '';
BEGIN
  FOREACH tab IN ARRAY tables_to_truncate LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = tab
    ) THEN
      IF existing_tables = '' THEN
        existing_tables := tab;
      ELSE
        existing_tables := existing_tables || ', ' || tab;
      END IF;
    END IF;
  END LOOP;

  IF existing_tables <> '' THEN
    EXECUTE 'TRUNCATE TABLE ' || existing_tables || ' RESTART IDENTITY CASCADE';
    RAISE NOTICE 'Truncated tables: %', existing_tables;
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
