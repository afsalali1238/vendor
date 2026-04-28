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
const SEED_DATA = {
  vendors: {
    "11111111-1111-1111-1111-111111111111": {
      profile: {
        id: '11111111-1111-1111-1111-111111111111',
        company_name: 'Al Noor Transport LLC',
        trn: '100123456700003',
        bank_name: 'Emirates NBD',
        bank_iban: 'AE070331234567890123456',
        phone: '+971501234567',
        whatsapp: '+971501234567',
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
            client_company: 'Global Trade Co',
            client_name: 'Sara Ahmed',
            client_phone: '+971501234567',
            client_email: 'sara@globaltrade.ae'
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
            client_company: 'BuildRight Ltd',
            client_name: 'Omar Khalil',
            client_phone: '+971507654321',
            client_email: 'omar@buildright.ae'
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
          vehicle_plate: 'DXB 12345',
          quoted_price: 1200
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
          vehicle_plate: 'DXB 54321',
          quoted_price: 1800
        }
      ],
      drivers: [
        { id: 'd1', name: 'Ahmed Khan', phone: '+971501111111', plate: 'DXB 12345', vehicle_type: '40ft Flatbed', active: true },
        { id: 'd3', name: 'John Doe', phone: '+971503333333', plate: 'DXB 54321', vehicle_type: 'Crane Truck', active: true }
      ]
    },
    "22222222-2222-2222-2222-222222222222": {
      profile: {
        id: '22222222-2222-2222-2222-222222222222',
        company_name: 'Gulf Freight Co.',
        trn: '100987654300003',
        bank_name: 'ADCB',
        bank_iban: 'AE450030009876543210987',
        phone: '+971559876543',
        whatsapp: '+971559876543',
        plan: 'growth'
      },
      rfqs: [],
      jobs: [],
      drivers: []
    }
  }
};

function getMockData() {
  const stored = localStorage.getItem('kasper_mock_data');
  if (stored) {
    try { 
      const data = JSON.parse(stored);
      // Verify schema is new multi-vendor version with UUIDs
      if (data && data.vendors && !data.vendors['v-1']) return data;
    } catch(e) {}
  }
  // Initialize if empty or old schema
  localStorage.setItem('kasper_mock_data', JSON.stringify(SEED_DATA));
  return SEED_DATA;
}

function saveMockData(data) {
  localStorage.setItem('kasper_mock_data', JSON.stringify(data));
}

function isDemo() {
  return true;
}

// Get the active vendor ID from session storage
function getActiveVendorId() {
  return localStorage.getItem('kasper_active_vendor');
}

// Get the vendor's specific data payload
function getActiveVendorData() {
  const data = getMockData();
  const activeId = getActiveVendorId();
  if (!activeId || !data.vendors[activeId]) {
    // Fallback if somehow called without active session
    return { profile: {}, rfqs: [], jobs: [], drivers: [] };
  }
  return data.vendors[activeId];
}

// ================================================================
// VENDOR OPERATIONS
// ================================================================

export async function getVendorProfile() {
  if (isDemo()) return getActiveVendorData().profile;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const result = await supabase.from('vendors').select('*').eq('id', user.id).single();
  return handle(result);
}

// Lookup any vendor's profile by ID (used by book.html to show vendor name)
export async function getVendorProfileById(vendorId) {
  if (isDemo()) {
    const data = getMockData();
    if (data.vendors[vendorId]) return data.vendors[vendorId].profile;
    return null;
  }
  const result = await supabase.from('vendors').select('company_name, whatsapp, phone').eq('id', vendorId).single();
  return handle(result);
}

export async function updateVendorProfile(fields) {
  if (isDemo()) {
    const data = getMockData();
    const activeId = getActiveVendorId();
    if (activeId && data.vendors[activeId]) {
      data.vendors[activeId].profile = { ...data.vendors[activeId].profile, ...fields };
      saveMockData(data);
      return data.vendors[activeId].profile;
    }
    return {};
  }
  const { data: { user } } = await supabase.auth.getUser();
  const result = await supabase.from('vendors').update(fields).eq('id', user.id).select().single();
  return handle(result);
}

// ================================================================
// RFQ OPERATIONS (vendor_rfqs table)
// ================================================================

export async function getVendorRFQs() {
  if (isDemo()) return getActiveVendorData().rfqs;
  const result = await supabase
    .from('vendor_rfqs')
    .select(`*, jobs:job_id (job_code, service_type, origin, destination, pickup_date, cargo_type, equipment_type, client_company, notes, quoted_price)`)
    .order('created_at', { ascending: false });
  return handle(result);
}

export async function submitRFQQuote(rfqId, vendorPrice, notes) {
  if (isDemo()) {
    const data = getMockData();
    const activeId = getActiveVendorId();
    if (activeId && data.vendors[activeId]) {
      const rfq = data.vendors[activeId].rfqs.find(r => r.id === rfqId);
      if (rfq) {
        rfq.status = 'quoted';
        rfq.vendor_price = vendorPrice;
        rfq.vendor_notes = notes;
        saveMockData(data);
        return rfq;
      }
    }
    return { id: rfqId, status: 'quoted' };
  }
  const result = await supabase
    .from('vendor_rfqs')
    .update({ status: 'quoted', vendor_price: vendorPrice, vendor_notes: notes, quoted_at: new Date().toISOString() })
    .eq('id', rfqId).select().single();
  return handle(result);
}

export async function createJobEnquiry(payload) {
  if (isDemo()) {
    const data = getMockData();
    const newEnquiry = { 
      ...payload, 
      id: 'enq-' + Math.random().toString(36).substring(7),
      job_code: 'KSP-REQ-' + Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toISOString()
    };
    
    // Check if ?vendor= or ?v= was passed from book.html
    const urlParams = new URLSearchParams(window.location.search);
    const targetVendorId = urlParams.get('vendor') || urlParams.get('v');
    const vendorToUse = (targetVendorId && data.vendors[targetVendorId]) ? targetVendorId : '11111111-1111-1111-1111-111111111111';

    data.vendors[vendorToUse].rfqs.unshift({
      id: 'rfq-' + Math.random().toString(36).substring(7),
      status: 'sent',
      jobs: {
        job_code: newEnquiry.job_code,
        service_type: newEnquiry.service_type || 'logistics',
        origin: newEnquiry.origin,
        destination: newEnquiry.destination,
        pickup_date: newEnquiry.pickup_date,
        cargo_type: newEnquiry.cargo_details || newEnquiry.cargo_type,
        client_company: newEnquiry.client_company || 'New Client LLC',
        client_name: newEnquiry.client_name || '',
        client_phone: newEnquiry.client_phone || '',
        client_email: newEnquiry.client_email || ''
      }
    });
    saveMockData(data);
    return newEnquiry;
  }
  const result = await supabase.from('jobs').insert([payload]).select().single();
  return handle(result);
}

// ================================================================
// JOB OPERATIONS
// ================================================================

export async function getActiveJobs() {
  if (isDemo()) return getActiveVendorData().jobs.filter(j => !['enquiry','quoted','rejected','paid'].includes(j.status));
  const result = await supabase.from('jobs').select('*').not('status', 'in', '("enquiry","quoted","rejected","paid")').order('created_at', { ascending: false });
  return handle(result);
}

export async function getPaymentJobs() {
  if (isDemo()) return getActiveVendorData().jobs.filter(j => ['invoiced', 'paid'].includes(j.status));
  const result = await supabase.from('jobs').select('*').in('status', ['invoiced', 'paid']).order('updated_at', { ascending: false });
  return handle(result);
}

export async function getJobByCode(jobCode) {
  if (isDemo()) {
    const data = getMockData();
    // Search across all vendors
    for (const vId in data.vendors) {
      const v = data.vendors[vId];
      const job = v.jobs.find(j => j.job_code === jobCode) || v.rfqs.find(r => r.jobs.job_code === jobCode)?.jobs;
      if (job) return job;
    }
    return null;
  }
  const result = await supabase.from('jobs_public').select('*').eq('job_code', jobCode).single();
  return handle(result);
}

export async function assignDriver(jobId, driver) {
  if (isDemo()) {
    const data = getMockData();
    const activeId = getActiveVendorId();
    if (activeId && data.vendors[activeId]) {
      const job = data.vendors[activeId].jobs.find(j => j.id === jobId);
      if (job) {
        job.status = 'assigned';
        job.driver_id = driver.id;
        job.driver_name = driver.name;
        job.driver_phone = driver.phone;
        job.vehicle_plate = driver.plate;
        saveMockData(data);
        return job;
      }
    }
    return { id: jobId, status: 'assigned' };
  }
  const result = await supabase.from('jobs').update({ status: 'assigned', driver_id: driver.id, driver_name: driver.name, driver_phone: driver.phone, vehicle_plate: driver.plate }).eq('id', jobId).select().single();
  return handle(result);
}

export async function updateJobStatus(jobCode, status) {
  if (isDemo()) {
    const data = getMockData();
    for (const vId in data.vendors) {
      const job = data.vendors[vId].jobs.find(j => j.job_code === jobCode);
      if (job) {
        job.status = status;
        saveMockData(data);
        if (status === 'in_transit') startDemoGpsSimulation(jobCode);
        else if (status === 'delivered') stopDemoGpsSimulation(jobCode);
        break;
      }
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
    
    const data = getMockData();
    for (const vId in data.vendors) {
      const job = data.vendors[vId].jobs.find(j => j.job_code === jobCode);
      if (job) {
        job.gps_lat = lat;
        job.gps_lng = lng;
        job.gps_updated_at = new Date().toISOString();
        saveMockData(data);
        break;
      }
    }
    // Call any active subscribers (simplified)
  }, 3000);
}

function stopDemoGpsSimulation(jobCode) {
  if (demoGpsIntervals[jobCode]) {
    clearInterval(demoGpsIntervals[jobCode]);
    delete demoGpsIntervals[jobCode];
  }
}

export async function saveDocumentUrl(jobCode, field, url) {
  if (isDemo()) {
    const data = getMockData();
    for (const vId in data.vendors) {
      const job = data.vendors[vId].jobs.find(j => j.job_code === jobCode);
      if (job) {
        job[field] = url;
        saveMockData(data);
        break;
      }
    }
    return { success: true };
  }
  return updateJobStatus(jobCode, undefined, { [field]: url });
}

export async function clientApproveQuote(jobCode) {
  if (isDemo()) {
    const data = getMockData();
    for (const vId in data.vendors) {
      const rfq = data.vendors[vId].rfqs.find(r => r.jobs.job_code === jobCode);
      if (rfq) {
        rfq.status = 'accepted';
        const newJob = {
          id: 'job-' + Math.random().toString(36).substring(7),
          job_code: rfq.jobs.job_code,
          status: 'accepted',
          origin: rfq.jobs.origin,
          destination: rfq.jobs.destination,
          pickup_date: rfq.jobs.pickup_date,
          quoted_price: rfq.vendor_price
        };
        data.vendors[vId].jobs.unshift(newJob);
        saveMockData(data);
        return newJob;
      }
    }
    return { id: 'dummy', job_code: jobCode, status: 'accepted' };
  }
  const result = await supabase.from('jobs').update({ status: 'accepted' }).eq('job_code', jobCode).select('id, job_code, status').single();
  return handle(result);
}

export async function clientDeclineQuote(jobCode) {
  if (isDemo()) {
    const data = getMockData();
    for (const vId in data.vendors) {
      const rfq = data.vendors[vId].rfqs.find(r => r.jobs.job_code === jobCode);
      if (rfq) {
        rfq.status = 'rejected';
        saveMockData(data);
        break;
      }
    }
    return { id: 'dummy', job_code: jobCode, status: 'rejected' };
  }
  const result = await supabase.from('jobs').update({ status: 'rejected' }).eq('job_code', jobCode).select('id, job_code, status').single();
  return handle(result);
}

export async function pushGPS(jobCode, lat, lng) {
  if (isDemo()) {
    const data = getMockData();
    for (const vId in data.vendors) {
      const job = data.vendors[vId].jobs.find(j => j.job_code === jobCode);
      if (job) {
        job.gps_lat = lat;
        job.gps_lng = lng;
        job.gps_updated_at = new Date().toISOString();
        saveMockData(data);
        break;
      }
    }
    return { success: true };
  }
  const result = await supabase.from('jobs').update({ gps_lat: lat, gps_lng: lng, gps_updated_at: new Date().toISOString() }).eq('job_code', jobCode);
  return handle(result);
}

export function subscribeToGPS(jobCode, callback) { return { unsubscribe: () => {} }; }
export async function unsubscribe(channel) {}

export async function saveDriverEPOD(jobCode, { signatureB64, photoUrl, gpsLat, gpsLng }) {
  if (isDemo()) {
    const data = getMockData();
    for (const vId in data.vendors) {
      const job = data.vendors[vId].jobs.find(j => j.job_code === jobCode);
      if (job) {
        job.status = 'epod_pending';
        job.epod_driver_sig = signatureB64;
        job.epod_photo_url = photoUrl;
        job.epod_driver_at = new Date().toISOString();
        job.epod_gps_lat = gpsLat;
        job.epod_gps_lng = gpsLng;
        saveMockData(data);
        break;
      }
    }
    return { success: true };
  }
  const result = await supabase.from('jobs').update({ status: 'epod_pending', epod_driver_sig: signatureB64, epod_photo_url: photoUrl, epod_driver_at: new Date().toISOString(), epod_gps_lat: gpsLat, epod_gps_lng: gpsLng }).eq('job_code', jobCode).select().single();
  return handle(result);
}

export async function saveClientEPOD(jobCode, signatureB64) {
  if (isDemo()) {
    const data = getMockData();
    for (const vId in data.vendors) {
      const job = data.vendors[vId].jobs.find(j => j.job_code === jobCode);
      if (job) {
        job.status = 'invoiced';
        job.epod_client_sig = signatureB64;
        job.epod_client_at = new Date().toISOString();
        saveMockData(data);
        break;
      }
    }
    return { success: true };
  }
  const result = await supabase.from('jobs').update({ status: 'invoiced', epod_client_sig: signatureB64, epod_client_at: new Date().toISOString() }).eq('job_code', jobCode).select().single();
  return handle(result);
}

// ================================================================
// DRIVER OPERATIONS
// ================================================================

export async function getVendorDrivers() {
  if (isDemo()) return getActiveVendorData().drivers;
  const result = await supabase.from('vendor_drivers').select('*').order('name');
  return handle(result);
}

export async function addDriver(driver) {
  if (isDemo()) {
    const data = getMockData();
    const activeId = getActiveVendorId();
    if (activeId && data.vendors[activeId]) {
      const newDriver = { ...driver, id: 'd' + (data.vendors[activeId].drivers.length + 1) };
      data.vendors[activeId].drivers.push(newDriver);
      saveMockData(data);
      return newDriver;
    }
    return { ...driver, id: 'dummy' };
  }
  const { data: { user } } = await supabase.auth.getUser();
  const result = await supabase.from('vendor_drivers').insert({ ...driver, vendor_id: user.id }).select().single();
  return handle(result);
}

export async function setDriverActive(driverId, active) {
  return handle(await supabase.from('vendor_drivers').update({ active }).eq('id', driverId).select().single());
}

// ================================================================
// OPS / ADMIN OPERATIONS
// ================================================================

export async function getAllVendors() {
  if (isDemo()) {
    const data = getMockData();
    return Object.values(data.vendors).map(v => v.profile);
  }
  const result = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
  return handle(result);
}

export async function getAllJobs() {
  if (isDemo()) {
    const data = getMockData();
    let allJobs = [];
    Object.values(data.vendors).forEach(v => {
      allJobs = allJobs.concat(v.jobs);
      // Map RFQs to look like jobs so they appear in Ops dashboard
      if (v.rfqs) {
        v.rfqs.forEach(rfq => {
          allJobs.push({
            ...rfq.jobs,
            id: rfq.id,
            status: rfq.status,
            vendor_id: v.profile.id,
            quoted_price: rfq.vendor_price || rfq.jobs.quoted_price
          });
        });
      }
    });
    // Sort all jobs by created/pickup descending for a realistic ops view
    return allJobs.sort((a, b) => new Date(b.pickup_date || 0) - new Date(a.pickup_date || 0));
  }
  const result = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
  return handle(result);
}

// ================================================================
// FILE STORAGE
// ================================================================

const STORAGE_BUCKET = 'vendor-documents';

export async function uploadDocument(vendorId, jobCode, filename, blob) {
  if (isDemo()) return `https://demo.kasper.com/${filename}`;
  const path = `vendors/${vendorId}/jobs/${jobCode}/${filename}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: true, contentType: 'application/pdf' });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadDeliveryPhoto(vendorId, jobCode, blob) {
  if (isDemo()) return `https://demo.kasper.com/delivery-photo.jpg`;
  const path = `vendors/${vendorId}/jobs/${jobCode}/delivery-photo.jpg`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

