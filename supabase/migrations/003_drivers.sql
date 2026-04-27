-- ============================================================
-- MIGRATION 003: vendor_drivers
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_drivers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  plate         TEXT,
  vehicle_type  TEXT,           -- 40ft Flatbed | Low-bed | Box Truck | Crane | etc.
  licence_no    TEXT,
  active        BOOLEAN NOT NULL DEFAULT false,  -- true = currently on a job
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vendor_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_own_drivers"
  ON vendor_drivers FOR ALL
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "admin_all_drivers"
  ON vendor_drivers FOR ALL
  USING (auth.jwt() ->> 'role' = 'kasper_admin');

CREATE INDEX idx_drivers_vendor_id ON vendor_drivers(vendor_id);
CREATE INDEX idx_drivers_active ON vendor_drivers(active);
