-- ============================================================
-- MIGRATION 004: Additional RLS + column-level security
-- ============================================================

-- Grant: public (unauthenticated) can read jobs_public view
GRANT SELECT ON jobs_public TO anon;

-- Grant: authenticated vendors can insert/update their own jobs
GRANT SELECT, INSERT, UPDATE ON jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON vendor_drivers TO authenticated;
GRANT SELECT, UPDATE ON vendors TO authenticated;

-- Column-level: anon (driver/client) can only UPDATE specific GPS/ePOD columns
-- This works alongside the RLS policy — both must pass
REVOKE UPDATE ON jobs FROM anon;
GRANT UPDATE (
  gps_lat, gps_lng, gps_updated_at,
  status,
  epod_driver_sig, epod_client_sig, epod_photo_url,
  epod_driver_at, epod_client_at,
  epod_gps_lat, epod_gps_lng
) ON jobs TO anon;
