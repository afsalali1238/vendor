-- ============================================================
-- MIGRATION 009: vendor_os_bootstrap
-- Ensures the jobs table has all client-contact and vendor
-- columns, enforces the inc-VAT price convention, and seeds
-- two demo vendor rows for the multi-vendor demo portal.
-- Also fixes RLS gaps for public booking flow.
-- ============================================================

-- ── 1–5. Column Guards ───────────────────────────────────────────
-- Guarding column additions in case they weren't in the base schema.

DO $$
BEGIN
  -- vendor_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'vendor_id') THEN
    ALTER TABLE jobs ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
  END IF;

  -- source (used for categorizing enquiries)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'source') THEN
    ALTER TABLE jobs ADD COLUMN source TEXT DEFAULT 'vendor_direct' CHECK (source IN ('vendor_direct','kasper_marketplace','book_form'));
  END IF;

  -- client_phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'client_phone') THEN
    ALTER TABLE jobs ADD COLUMN client_phone TEXT;
  END IF;

  -- client_email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'client_email') THEN
    ALTER TABLE jobs ADD COLUMN client_email TEXT;
  END IF;

  -- client_company
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'client_company') THEN
    ALTER TABLE jobs ADD COLUMN client_company TEXT;
  END IF;

  -- client_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'client_name') THEN
    ALTER TABLE jobs ADD COLUMN client_name TEXT;
  END IF;
END
$$;

-- ── 6. Price convention ──────────────────────────────────────────
-- quoted_price is ALWAYS total inc-VAT (AED).
COMMENT ON COLUMN jobs.quoted_price IS 'Total inc-VAT amount. Ex-VAT is computed at display time (price / 1.05).';

-- ── 7. Seed demo vendors ─────────────────────────────────────────

INSERT INTO vendors (
  id, company_name, owner_name, phone, whatsapp, trn,
  bank_name, bank_iban, plan, active
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Al Noor Transport LLC',
  'Demo Owner 1',
  '+971501234567',
  '+971501234567',
  '100123456700003',
  'Emirates NBD',
  'AE070331234567890123456',
  'pro',
  true
), (
  '22222222-2222-2222-2222-222222222222',
  'Gulf Freight Co.',
  'Demo Owner 2',
  '+971559876543',
  '+971559876543',
  '100987654300003',
  'ADCB',
  'AE450030009876543210987',
  'growth',
  true
) ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  whatsapp     = EXCLUDED.whatsapp,
  trn          = EXCLUDED.trn;

-- ── 8. Fix RLS Gaps for Public Booking ───────────────────────────

-- Drop existing if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "public_select_vendors_for_booking" ON vendors;
DROP POLICY IF EXISTS "public_insert_job_enquiry" ON jobs;

-- Allow public to see basic vendor info (needed for book.html header)
CREATE POLICY "public_select_vendors_for_booking"
  ON vendors FOR SELECT
  TO anon
  USING (active = true);

-- Allow public to submit enquiries via book.html
CREATE POLICY "public_insert_job_enquiry"
  ON jobs FOR INSERT
  TO anon
  WITH CHECK (
    status = 'enquiry' AND 
    source = 'book_form'
  );

-- Ensure the 'anon' role can actually use the sequence/table
GRANT INSERT ON jobs TO anon;
GRANT SELECT ON vendors TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
