-- Phase 10E: Seed developer admin app profile for an existing Supabase Auth user.
--
-- Important:
-- - This migration does not create or set an Auth password.
-- - Create the user first in Supabase Auth using this email, or register once from the app.
-- - Developer privileges are still controlled by NEXT_PUBLIC_DEVELOPER_EMAILS in .env.local.

DO $$
DECLARE
  developer_email TEXT := 'lim.dev@gmail.com';
  developer_user_id TEXT;
  developer_business_id TEXT := 'biz-platform-owner';
BEGIN
  SELECT id::TEXT
  INTO developer_user_id
  FROM auth.users
  WHERE lower(email) = lower(developer_email)
  LIMIT 1;

  IF developer_user_id IS NULL THEN
    RAISE NOTICE 'Developer auth user % was not found. Create the user in Supabase Auth first, then rerun this migration if needed.', developer_email;
    RETURN;
  END IF;

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
    developer_business_id,
    'Platform Owner',
    'Platform',
    NULL,
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

  INSERT INTO profiles (
    id,
    business_id,
    full_name,
    role,
    email
  )
  VALUES (
    developer_user_id,
    developer_business_id,
    'Platform Owner',
    'admin',
    lower(developer_email)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'admin',
    email = lower(developer_email),
    updated_at = NOW();
END $$;

NOTIFY pgrst, 'reload schema';
