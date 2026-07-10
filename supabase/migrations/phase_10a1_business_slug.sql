-- Phase 10A.1: Business slug for tenant-specific public order links

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS public_order_enabled BOOLEAN DEFAULT true;

WITH slug_candidates AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        trim(
          both '-' from regexp_replace(
            regexp_replace(lower(COALESCE(name, 'bisnis')), '[^a-z0-9]+', '-', 'g'),
            '-+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'bisnis'
    ) AS base_slug
  FROM businesses
  WHERE slug IS NULL OR trim(slug) = ''
),
numbered_candidates AS (
  SELECT
    id,
    base_slug,
    row_number() OVER (PARTITION BY base_slug ORDER BY id) AS duplicate_index
  FROM slug_candidates
)
UPDATE businesses b
SET slug = CASE
  WHEN n.duplicate_index = 1
    AND NOT EXISTS (
      SELECT 1 FROM businesses existing
      WHERE existing.slug = n.base_slug
        AND existing.id <> n.id
    )
    THEN n.base_slug
  ELSE n.base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text || n.id), 1, 4)
END
FROM numbered_candidates n
WHERE b.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique_idx ON businesses(slug);

DROP POLICY IF EXISTS "businesses_public_read" ON businesses;
CREATE POLICY "businesses_public_read"
  ON businesses FOR SELECT
  USING (COALESCE(public_order_enabled, true) = true);

DROP POLICY IF EXISTS "businesses_owner_read" ON businesses;
CREATE POLICY "businesses_owner_read"
  ON businesses FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE business_id = businesses.id
        AND role IN ('admin', 'owner', 'cashier')
    )
  );

NOTIFY pgrst, 'reload schema';
