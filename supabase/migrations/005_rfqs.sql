-- ============================================================
-- MIGRATION 005: vendor_rfqs
-- Multi-vendor quoting for Kasper marketplace jobs.
-- One master job record (vendor_id = kasper_ops_id).
-- Multiple RFQ rows, one per vendor invited to quote.
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_rfqs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent','quoted','accepted','rejected'
  )),
  vendor_price    NUMERIC(10,2),          -- What the vendor offered
  vendor_notes    TEXT,
  quote_deadline  TIMESTAMPTZ,            -- When the RFQ expires
  quoted_at       TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, vendor_id)              -- One quote per vendor per job
);

ALTER TABLE vendor_rfqs ENABLE ROW LEVEL SECURITY;

-- Vendors see only their own RFQs
CREATE POLICY "vendor_own_rfqs"
  ON vendor_rfqs FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "vendor_update_own_rfqs"
  ON vendor_rfqs FOR UPDATE
  USING (auth.uid() = vendor_id);

-- Only Kasper ops can create RFQs (assign jobs to vendors)
CREATE POLICY "admin_manage_rfqs"
  ON vendor_rfqs FOR ALL
  USING (auth.jwt() ->> 'role' = 'kasper_admin');

CREATE INDEX idx_rfqs_vendor_id ON vendor_rfqs(vendor_id);
CREATE INDEX idx_rfqs_job_id ON vendor_rfqs(job_id);
CREATE INDEX idx_rfqs_status ON vendor_rfqs(status);
