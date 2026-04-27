-- ============================================================
-- SEED DATA: Test vendor, drivers, jobs for MVP testing
-- Run this in Supabase SQL Editor AFTER all migrations
-- ============================================================

-- 1. Create a test vendor
INSERT INTO vendors (id, company_name, owner_name, phone, whatsapp, email, trn, bank_name, bank_iban, plan)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Kasper Transport LLC',
  'Afsal Ali',
  '+971501234567',
  '+971501234567',
  'afsal@kasper.ae',
  '100123456789003',
  'Emirates NBD',
  'AE070331234567890123456',
  'growth'
);

-- 2. Create test drivers
INSERT INTO vendor_drivers (id, vendor_id, name, phone, plate, vehicle_type, active)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Zohan Khan', '+971551112222', 'DXB A 12345', '40ft Flatbed', false),
  ('d1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ravi Kumar', '+971552223333', 'SHJ B 67890', 'Low-bed Trailer', false),
  ('d1000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ahmed Nasser', '+971553334444', 'AJM C 11223', 'Box Truck 10T', false);

-- 3. Create test jobs at various stages
INSERT INTO jobs (id, job_code, vendor_id, status, service_type, origin, destination, pickup_date, cargo_details, weight_kg, quoted_price, quoted_at, driver_id, driver_name, driver_phone, driver_plate)
VALUES
  -- Job 1: New enquiry (needs quoting)
  ('j1000000-0000-0000-0000-000000000001', 'KSP-8001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'enquiry', 'logistics',
   'Jebel Ali Free Zone, Dubai', 'Musaffah Industrial, Abu Dhabi',
   now() + interval '2 days',
   '12 pallets of construction materials', 8500,
   NULL, NULL, NULL, NULL, NULL, NULL),

  -- Job 2: Quoted, waiting for client approval
  ('j1000000-0000-0000-0000-000000000002', 'KSP-8002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'quoted', 'logistics',
   'Dubai Silicon Oasis', 'RAK Free Trade Zone',
   now() + interval '3 days',
   '2x 20ft containers - electronics', 12000,
   2800.00, now() - interval '1 hour',
   NULL, NULL, NULL, NULL),

  -- Job 3: Accepted, needs driver assignment
  ('j1000000-0000-0000-0000-000000000003', 'KSP-8003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'accepted', 'logistics',
   'Al Quoz Industrial 3, Dubai', 'ICAD 2, Abu Dhabi',
   now() + interval '1 day',
   '6 steel beams + fittings', 15000,
   3500.00, now() - interval '5 hours',
   NULL, NULL, NULL, NULL),

  -- Job 4: In transit with driver assigned
  ('j1000000-0000-0000-0000-000000000004', 'KSP-8004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'in_transit', 'logistics',
   'Port Rashid, Dubai', 'Hamriyah Free Zone, Sharjah',
   now(),
   '40ft container - heavy machinery parts', 22000,
   4200.00, now() - interval '1 day',
   'd1000000-0000-0000-0000-000000000001', 'Zohan Khan', '+971551112222', 'DXB A 12345'),

  -- Job 5: Delivered, pending payment
  ('j1000000-0000-0000-0000-000000000005', 'KSP-8005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'delivered', 'logistics',
   'DIP, Dubai', 'Fujairah Port',
   now() - interval '2 days',
   'Cement bags x200', 10000,
   1800.00, now() - interval '3 days',
   'd1000000-0000-0000-0000-000000000002', 'Ravi Kumar', '+971552223333', 'SHJ B 67890'),

  -- Job 6: Paid (completed)
  ('j1000000-0000-0000-0000-000000000006', 'KSP-8006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'paid', 'logistics',
   'Al Aweer Market, Dubai', 'Sohar Port, Oman',
   now() - interval '7 days',
   'Marble slabs x50', 18000,
   5500.00, now() - interval '8 days',
   'd1000000-0000-0000-0000-000000000003', 'Ahmed Nasser', '+971553334444', 'AJM C 11223');
