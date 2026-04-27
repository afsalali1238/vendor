// ================================================================
// js/supabase.js
// Single source of truth for ALL Supabase interactions.
// Every page imports from this file. Never write raw fetch()
// calls to Supabase URLs anywhere else in the codebase.
// ================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from '/js/config.js';

// ── CLIENT INIT ──────────────────────────────────────────────────
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_KEY = CONFIG.SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ── ERROR HELPER ─────────────────────────────────────────────────
function handle(result) {
  if (result.error) {
    console.error('[Supabase]', result.error.message, result.error);
    throw result.error;
  }
  return result.data;
}

// ── DEMO MODE HELPER ─────────────────────────────────────────────
const MOCK_DATA = {
  vendor: {
    id: 'demo-vendor-123',
    company_name: 'Kasper Demo Transport',
    trn: '123456789012345',
    bank_name: 'Demo Bank UAE',
    bank_iban: 'AE00 0000 0000 0000 0000 000',
    phone: '+971500000000',
    plan: 'pro'
  },
  rfqs: [
    {
      id: 'rfq-1',
      status: 'sent',
      jobs: {
        job_code: 'KSP-8801',
        service_type: 'logistics',
        origin: 'Dubai South',
        destination: 'Jebel Ali Port',
        pickup_date: '2026-05-01',
        cargo_type: '2x 40ft Containers',
        client_company: 'Global Trade Co'
      }
    },
    {
      id: 'rfq-2',
      status: 'quoted',
      vendor_price: 1500,
      jobs: {
        job_code: 'KSP-8802',
        service_type: 'crane',
        origin: 'Sharjah Ind 10',
        destination: 'Business Bay',
        pickup_date: '2026-05-02',
        cargo_type: '25t AC Unit',
        client_company: 'BuildRight Ltd'
      }
    }
  ],
  jobs: [
    {
      id: 'job-1',
      job_code: 'KSP-7701',
      status: 'assigned',
      origin: 'Dubai Airport Freezone',
      destination: 'Abu Dhabi Port',
      pickup_date: '2026-04-28',
      driver_name: 'Ahmed Khan',
      vehicle_plate: 'DXB 12345'
    },
    {
      id: 'job-2',
      job_code: 'KSP-7702',
      status: 'in_transit',
      origin: 'Fujairah Port',
      destination: 'Dubai Investment Park',
      pickup_date: '2026-04-27',
      gps_lat: 25.1023,
      gps_lng: 55.1634,
      driver_name: 'John Doe',
      vehicle_plate: 'DXB 54321'
    }
  ],
  drivers: [
    { id: 'd1', name: 'Ahmed Khan', phone: '+971501111111', plate: 'DXB 12345', vehicle_type: '40ft Flatbed', active: true },
    { id: 'd2', name: 'Sajid Ali', phone: '+971502222222', plate: 'DXB 67890', vehicle_type: '3-ton Pickup', active: false },
    { id: 'd3', name: 'John Doe', phone: '+971503333333', plate: 'DXB 54321', vehicle_type: 'Crane Truck', active: true }
  ]
};

function isDemo() {
  // Demo mode disabled. We are in Production Full Flow.
  return false;
}

// ================================================================
// VENDOR OPERATIONS
// ================================================================

/** Get the current vendor's full profile */
export async function getVendorProfile() {
  if (isDemo()) return MOCK_DATA.vendor;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const result = await supabase
    .from('vendors')
    .select('*')
    .eq('id', user.id)
    .single();
  return handle(result);
}

/** Update vendor profile fields */
export async function updateVendorProfile(fields) {
  if (isDemo()) return { ...MOCK_DATA.vendor, ...fields };
  const { data: { user } } = await supabase.auth.getUser();
  const result = await supabase
    .from('vendors')
    .update(fields)
    .eq('id', user.id)
    .select()
    .single();
  return handle(result);
}

// ================================================================
// RFQ OPERATIONS (vendor_rfqs table)
// ================================================================

/** Get all RFQs for the current vendor, with joined job details */
export async function getVendorRFQs() {
  if (isDemo()) return MOCK_DATA.rfqs;
  const result = await supabase
    .from('vendor_rfqs')
    .select(`
      *,
      jobs:job_id (
        job_code, service_type, origin, destination,
        pickup_date, cargo_type, equipment_type,
        client_company, notes, quoted_price
      )
    `)
    .order('created_at', { ascending: false });
  return handle(result);
}

/** Submit a vendor's price for an RFQ */
export async function submitRFQQuote(rfqId, vendorPrice, notes) {
  if (isDemo()) return { id: rfqId, status: 'quoted' };
  const result = await supabase
    .from('vendor_rfqs')
    .update({
      status: 'quoted',
      vendor_price: vendorPrice,
      vendor_notes: notes,
      quoted_at: new Date().toISOString(),
    })
    .eq('id', rfqId)
    .select()
    .single();
  return handle(result);
}

/** Create a new job enquiry from book.html */
export async function createJobEnquiry(payload) {
  if (isDemo()) {
    const newEnquiry = { 
      ...payload, 
      id: 'enq-' + Math.random().toString(36).substring(7),
      job_code: 'KSP-REQ-' + Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toISOString()
    };
    // For demo, we just simulate success
    console.log('[Demo] Enquiry received:', newEnquiry);
    return newEnquiry;
  }
  const result = await supabase.from('jobs').insert([payload]).select().single();
  return handle(result);
}

// ================================================================
// JOB OPERATIONS
// ================================================================

/** Get all active jobs for current vendor */
export async function getActiveJobs() {
  if (isDemo()) return MOCK_DATA.jobs;
  const result = await supabase
    .from('jobs')
    .select('*')
    .not('status', 'in', '("enquiry","quoted","rejected","paid")')
    .order('created_at', { ascending: false });
  return handle(result);
}

/** Get payment history (invoiced + paid jobs) */
export async function getPaymentJobs() {
  if (isDemo()) return MOCK_DATA.jobs.filter(j => ['invoiced', 'paid'].includes(j.status));
  const result = await supabase
    .from('jobs')
    .select('*')
    .in('status', ['invoiced', 'paid'])
    .order('updated_at', { ascending: false });
  return handle(result);
}

/** Get a single job by job_code — for client/driver pages (uses public view) */
export async function getJobByCode(jobCode) {
  const result = await supabase
    .from('jobs_public')
    .select('*')
    .eq('job_code', jobCode)
    .single();
  return handle(result);
}

/** Assign a driver to a job */
export async function assignDriver(jobId, driver) {
  if (isDemo()) return { id: jobId, status: 'assigned' };
  const result = await supabase
    .from('jobs')
    .update({
      status: 'assigned',
      driver_id: driver.id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      vehicle_plate: driver.plate,
    })
    .eq('id', jobId)
    .select()
    .single();
  return handle(result);
}

/** Update job status */
export async function updateJobStatus(jobCode, status) {
  if (isDemo()) {
    const job = MOCK_DATA.jobs.find(j => j.job_code === jobCode);
    if (job) {
      job.status = status;
      if (status === 'in_transit') startDemoGpsSimulation(jobCode);
      else if (status === 'delivered') stopDemoGpsSimulation(jobCode);
    }
    return { success: true };
  }
  const result = await supabase.from('jobs').update({ status }).eq('job_code', jobCode);
  return handle(result);
}

// Demo GPS Simulation
let demoGpsIntervals = {};
function startDemoGpsSimulation(jobCode) {
  if (demoGpsIntervals[jobCode]) return;
  
  let step = 0;
  const startLat = 25.2048, startLng = 55.2708;
  
  demoGpsIntervals[jobCode] = setInterval(() => {
    step += 0.001;
    const lat = startLat + (Math.sin(step) * 0.01);
    const lng = startLng + (Math.cos(step) * 0.01);
    
    // Trigger local listeners (simulating realtime subscription)
    const job = MOCK_DATA.jobs.find(j => j.job_code === jobCode);
    if (job) {
      job.gps_lat = lat;
      job.gps_lng = lng;
      job.gps_updated_at = new Date().toISOString();
    }

    // Call any active subscribers
    Object.values(gpsSubscribers[jobCode] || {}).forEach(cb => {
      cb({ lat, lng, updatedAt: new Date().toISOString() });
    });
  }, 3000);
}

function stopDemoGpsSimulation(jobCode) {
  if (demoGpsIntervals[jobCode]) {
    clearInterval(demoGpsIntervals[jobCode]);
    delete demoGpsIntervals[jobCode];
  }
}

/** Push GPS location (Driver only) */
/** Save a document URL to the job record */
export async function saveDocumentUrl(jobCode, field, url) {
  const allowed = [
    'quote_pdf_url', 'po_pdf_url', 'vendor_po_pdf_url',
    'invoice_pdf_url', 'epod_pdf_url', 'delivery_note_url', 'epod_photo_url'
  ];
  if (!allowed.includes(field)) throw new Error(`Invalid document field: ${field}`);
  return updateJobStatus(jobCode, undefined, { [field]: url });
}

/** Client approves a quote */
export async function clientApproveQuote(jobCode) {
  const result = await supabase
    .from('jobs')
    .update({ status: 'accepted' })
    .eq('job_code', jobCode)
    .select('id, job_code, status')
    .single();
  return handle(result);
}

/** Client declines a quote */
export async function clientDeclineQuote(jobCode) {
  const result = await supabase
    .from('jobs')
    .update({ status: 'rejected' })
    .eq('job_code', jobCode)
    .select('id, job_code, status')
    .single();
  return handle(result);
}

// ================================================================
// GPS OPERATIONS
// ================================================================

/** Push driver GPS location — called every 10 seconds from driver.html */
export async function pushGPS(jobCode, lat, lng) {
  const result = await supabase
    .from('jobs')
    .update({
      gps_lat: lat,
      gps_lng: lng,
      gps_updated_at: new Date().toISOString(),
    })
    .eq('job_code', jobCode);
  return handle(result);
}

/** Subscribe to GPS updates for a job — used by track.html */
export function subscribeToGPS(jobCode, callback) {
  return supabase
    .channel(`gps:${jobCode}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'jobs',
      filter: `job_code=eq.${jobCode}`,
    }, payload => {
      callback({
        lat: payload.new.gps_lat,
        lng: payload.new.gps_lng,
        updatedAt: payload.new.gps_updated_at,
        status: payload.new.status,
      });
    })
    .subscribe();
}

/** Unsubscribe from a realtime channel */
export async function unsubscribe(channel) {
  await supabase.removeChannel(channel);
}

// ================================================================
// ePOD OPERATIONS
// ================================================================

/** Save driver ePOD signature and photo */
export async function saveDriverEPOD(jobCode, { signatureB64, photoUrl, gpsLat, gpsLng }) {
  const result = await supabase
    .from('jobs')
    .update({
      status: 'epod_pending',
      epod_driver_sig: signatureB64,
      epod_photo_url: photoUrl,
      epod_driver_at: new Date().toISOString(),
      epod_gps_lat: gpsLat,
      epod_gps_lng: gpsLng,
    })
    .eq('job_code', jobCode)
    .select()
    .single();
  return handle(result);
}

/** Save client ePOD signature — triggers invoice generation */
export async function saveClientEPOD(jobCode, signatureB64) {
  const result = await supabase
    .from('jobs')
    .update({
      status: 'invoiced',
      epod_client_sig: signatureB64,
      epod_client_at: new Date().toISOString(),
    })
    .eq('job_code', jobCode)
    .select()
    .single();
  return handle(result);
}

// ================================================================
// DRIVER OPERATIONS
// ================================================================

/** Get all drivers for the current vendor */
export async function getVendorDrivers() {
  if (isDemo()) return MOCK_DATA.drivers;
  const result = await supabase
    .from('vendor_drivers')
    .select('*')
    .order('name');
  return handle(result);
}

/** Add a new driver */
export async function addDriver(driver) {
  if (isDemo()) {
    const newDriver = { ...driver, id: 'd' + (MOCK_DATA.drivers.length + 1) };
    MOCK_DATA.drivers.push(newDriver);
    return newDriver;
  }
  const { data: { user } } = await supabase.auth.getUser();
  const result = await supabase
    .from('vendor_drivers')
    .insert({ ...driver, vendor_id: user.id })
    .select()
    .single();
  return handle(result);
}

/** Set a driver's active status */
export async function setDriverActive(driverId, active) {
  const result = await supabase
    .from('vendor_drivers')
    .update({ active })
    .eq('id', driverId)
    .select()
    .single();
  return handle(result);
}

// ================================================================
// OPS / ADMIN OPERATIONS
// ================================================================

/** Get all vendors (Kasper Admin only) */
export async function getAllVendors() {
  if (isDemo()) return [MOCK_DATA.vendor];
  const result = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
  return handle(result);
}

/** Get all jobs (Kasper Admin only) */
export async function getAllJobs() {
  if (isDemo()) return MOCK_DATA.jobs;
  const result = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
  return handle(result);
}

// ================================================================
// FILE STORAGE
// ================================================================

const STORAGE_BUCKET = 'vendor-documents';

/**
 * Upload a file blob to Supabase Storage.
 * Path: vendors/{vendorId}/jobs/{jobCode}/{filename}
 * Returns public URL.
 */
export async function uploadDocument(vendorId, jobCode, filename, blob) {
  if (isDemo()) return `https://demo.kasper.com/${filename}`;
  const path = `vendors/${vendorId}/jobs/${jobCode}/${filename}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a delivery photo (JPEG).
 */
export async function uploadDeliveryPhoto(vendorId, jobCode, blob) {
  const path = `vendors/${vendorId}/jobs/${jobCode}/delivery-photo.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
