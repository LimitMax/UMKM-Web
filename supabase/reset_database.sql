/*
===========================================================
UMKM PILOT - RESET DATABASE FOR UAT

WARNING
-------
This script will DELETE ALL:

✓ Businesses
✓ Profiles
✓ Products
✓ Orders
✓ Order Items
✓ Payments
✓ Transactions
✓ AI Insights
✓ Promo Recommendations
✓ Business Subscriptions

This script DOES NOT delete:

✗ plans
✗ schema
✗ migrations
✗ auth.users (Supabase Authentication)

Run ONLY for Development / UAT.
===========================================================
*/

BEGIN;

-- =====================================
-- CHILD TABLES
-- =====================================

TRUNCATE TABLE
promo_recommendations,
insights,
order_items,
payments,
transactions,
business_subscriptions
RESTART IDENTITY CASCADE;

-- =====================================
-- MAIN TABLES
-- =====================================

TRUNCATE TABLE
orders,
products,
profiles,
businesses
RESTART IDENTITY CASCADE;

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';