-- ============================================================
-- MIGRATION 001: vendors
-- The root SaaS tenant table. One row per company.
-- vendor_id = auth.uid() from Supabase Auth
-- ============================================================

CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Auth: this must match auth.users.id (set on insert via trigger)
  company_name    TEXT NOT NULL,
  owner_name      TEXT NOT NULL,
  phone           TEXT NOT NULL,          -- UAE format e.g. +971501234567
  whatsapp        TEXT,                   -- Business WhatsApp number
  email           TEXT,
  trn             TEXT,                   -- UAE Tax Registration Number (15 digits)
  bank_name       TEXT,
  bank_iban       TEXT,
  logo_url        TEXT,                   -- Supabase Storage public URL
  plan            TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','growth','pro','kasper_vendor')),
  wa_api_key      TEXT,                   -- 360dialog key (Growth+ only, encrypted at rest)
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Vendors can only read/update their own row
CREATE POLICY "vendor_select_own"
  ON vendors FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "vendor_update_own"
  ON vendors FOR UPDATE
  USING (auth.uid() = id);

-- Only Supabase service role (Edge Functions) can INSERT
-- (onboard.html calls an Edge Function which uses service role to insert)
CREATE POLICY "service_role_insert"
  ON vendors FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Kasper ops admin can see all vendors
CREATE POLICY "admin_select_all"
  ON vendors FOR SELECT
  USING (auth.jwt() ->> 'role' = 'kasper_admin');

CREATE POLICY "admin_update_all"
  ON vendors FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'kasper_admin');

-- Index for common queries
CREATE INDEX idx_vendors_phone ON vendors(phone);
CREATE INDEX idx_vendors_plan ON vendors(plan);
CREATE INDEX idx_vendors_active ON vendors(active);
