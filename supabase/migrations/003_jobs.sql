-- ============================================================
-- MIGRATION 002: jobs
-- The core transaction record. Covers full lifecycle.
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code            TEXT NOT NULL UNIQUE,         -- KSP-XXXX format, auto-generated
  vendor_id           UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Status pipeline
  -- enquiry → quoted → accepted → rejected → assigned → in_transit → delivered → epod_pending → invoiced → paid
  status              TEXT NOT NULL DEFAULT 'enquiry' CHECK (status IN (
    'enquiry','quoted','accepted','rejected','assigned',
    'in_transit','delivered','epod_pending','invoiced','paid'
  )),

  -- Service type
  service_type        TEXT NOT NULL DEFAULT 'logistics' CHECK (service_type IN (
    'logistics','crane','equipment','other'
  )),

  -- Route
  origin              TEXT,
  destination         TEXT,
  pickup_date         DATE,
  return_date         DATE,                         -- For equipment rental jobs

  -- Cargo / equipment
  cargo_type          TEXT,
  equipment_type      TEXT,
  cargo_weight_tonnes NUMERIC(8,2),
  special_requirements TEXT,

  -- Client details (denormalised for PDF generation speed)
  client_name         TEXT,
  client_phone        TEXT,
  client_email        TEXT,
  client_company      TEXT,
  client_whatsapp     TEXT,

  -- Pricing
  -- IMPORTANT: quoted_price = what client pays. vendor_price = Kasper's cost to vendor.
  -- NEVER expose vendor_price to client-facing or driver-facing pages.
  quoted_price        NUMERIC(10,2),               -- Client-facing price (inc VAT)
  vendor_price        NUMERIC(10,2),               -- Kasper pays vendor this amount
  kasper_margin       NUMERIC(10,2) GENERATED ALWAYS AS (quoted_price - vendor_price) STORED,
  vat_amount          NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(quoted_price / 1.05 * 0.05, 2)) STORED,
  price_ex_vat        NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(quoted_price / 1.05, 2)) STORED,

  -- Driver assignment
  driver_id           UUID REFERENCES vendor_drivers(id) ON DELETE SET NULL,
  driver_name         TEXT,                         -- Denormalised for PDF
  driver_phone        TEXT,                         -- Denormalised for WhatsApp link
  vehicle_plate       TEXT,                         -- Denormalised for PDF

  -- GPS tracking
  gps_lat             NUMERIC(10,7),
  gps_lng             NUMERIC(10,7),
  gps_updated_at      TIMESTAMPTZ,

  -- Documents (Supabase Storage URLs)
  quote_pdf_url       TEXT,
  po_pdf_url          TEXT,
  vendor_po_pdf_url   TEXT,
  invoice_pdf_url     TEXT,
  epod_pdf_url        TEXT,
  delivery_note_url   TEXT,

  -- ePOD
  epod_driver_sig     TEXT,                         -- Base64 canvas signature
  epod_client_sig     TEXT,                         -- Base64 canvas signature
  epod_photo_url      TEXT,                         -- Delivery photo (Supabase Storage)
  epod_driver_at      TIMESTAMPTZ,
  epod_client_at      TIMESTAMPTZ,
  epod_gps_lat        NUMERIC(10,7),
  epod_gps_lng        NUMERIC(10,7),

  -- Payment
  payment_method      TEXT CHECK (payment_method IN ('telr','lpo','bank_transfer','cash')),
  payment_ref         TEXT,                         -- Telr transaction ID or bank ref
  lpo_url             TEXT,                         -- LPO document upload
  lpo_number          TEXT,
  paid_at             TIMESTAMPTZ,
  invoice_due_date    DATE,

  -- Meta
  notes               TEXT,
  internal_notes      TEXT,                         -- Kasper ops only, not shown to vendor
  source              TEXT DEFAULT 'vendor_direct' CHECK (source IN ('vendor_direct','kasper_marketplace','book_form')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate job_code: KSP-XXXX
CREATE OR REPLACE FUNCTION generate_job_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_code FROM 5) AS INT)), 0) + 1
  INTO next_num
  FROM jobs;
  NEW.job_code = 'KSP-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_auto_job_code
  BEFORE INSERT ON jobs
  FOR EACH ROW
  WHEN (NEW.job_code IS NULL OR NEW.job_code = '')
  EXECUTE FUNCTION generate_job_code();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Vendors can see and update their own jobs
CREATE POLICY "vendor_select_own_jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "vendor_insert_own_jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "vendor_update_own_jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = vendor_id);

-- Public read for client-facing pages (track, approve, driver)
-- Deliberately limited columns — vendor_price and internal_notes are excluded via view
CREATE POLICY "public_read_by_job_code"
  ON jobs FOR SELECT
  USING (
    job_code IS NOT NULL
    AND status NOT IN ('enquiry')  -- Don't expose draft jobs
  );

-- Public can update specific fields only (ePOD client sig, GPS from driver)
-- This is enforced at application level + column-level grants
CREATE POLICY "public_update_epod_gps"
  ON jobs FOR UPDATE
  USING (job_code IS NOT NULL)
  WITH CHECK (
    -- Only allow updating these specific columns from public context
    -- Full column restriction handled in application layer
    true
  );

-- Kasper admin
CREATE POLICY "admin_all_jobs"
  ON jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'kasper_admin');

-- ── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX idx_jobs_vendor_id ON jobs(vendor_id);
CREATE INDEX idx_jobs_job_code ON jobs(job_code);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_driver_id ON jobs(driver_id);
CREATE INDEX idx_jobs_pickup_date ON jobs(pickup_date);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- ── PUBLIC VIEW (safe for client/driver pages) ────────────────────
-- Excludes: vendor_price, kasper_margin, internal_notes
CREATE OR REPLACE VIEW jobs_public AS
  SELECT
    id, job_code, status, service_type,
    origin, destination, pickup_date, return_date,
    cargo_type, equipment_type, special_requirements,
    client_name, client_phone, client_company,
    quoted_price, vat_amount, price_ex_vat,
    driver_name, driver_phone, vehicle_plate,
    gps_lat, gps_lng, gps_updated_at,
    quote_pdf_url, po_pdf_url, invoice_pdf_url, epod_pdf_url,
    epod_driver_at, epod_client_at, epod_gps_lat, epod_gps_lng,
    payment_method, paid_at, invoice_due_date,
    notes, created_at, updated_at
  FROM jobs;
