-- Enable Row-Level Security for business_vouchers
ALTER TABLE business_vouchers ENABLE ROW LEVEL SECURITY;

-- Policy to allow public SELECT for active business vouchers (needed for customer checkouts)
DROP POLICY IF EXISTS "vouchers_public_select" ON business_vouchers;
CREATE POLICY "vouchers_public_select"
  ON business_vouchers FOR SELECT
  USING (is_active = true);

-- Policy to allow business owners/staff full access to their business's vouchers
DROP POLICY IF EXISTS "vouchers_staff_all" ON business_vouchers;
CREATE POLICY "vouchers_staff_all"
  ON business_vouchers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
        AND p.business_id = business_vouchers.business_id
        AND p.role IN ('admin', 'owner', 'cashier')
    )
  );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
