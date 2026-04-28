import { getAllVendors, getAllJobs } from '/js/supabase.js';
import { logout } from '/js/auth.js';
import { formatAED } from '/js/whatsapp.js';

async function init() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  await refreshOps();

  // Auto-refresh every 10s to stay in sync with vendor/driver changes
  setInterval(() => {
    if (!document.hidden) refreshOps();
  }, 10000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshOps();
  });
}

async function refreshOps() {
  try {
    const vendors = await getAllVendors();
    const jobs = await getAllJobs();

    renderStats(vendors, jobs);
    renderVendors(vendors);
    renderJobs(jobs);

  } catch (err) {
    console.error(err);
  }
}

function renderStats(vendors, jobs) {
  document.getElementById('total-vendors').innerText = vendors.length;
  document.getElementById('total-jobs').innerText = jobs.filter(j => j.status !== 'paid' && j.status !== 'rejected').length;
  
  const revenue = jobs.reduce((sum, j) => sum + (parseFloat(j.quoted_price) || 0), 0);
  document.getElementById('total-rev').innerText = formatAED(revenue);
}

function renderVendors(vendors) {
  const container = document.getElementById('vendor-list');
  container.innerHTML = '';
  
  vendors.forEach(v => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.padding = '1rem';
    el.style.marginBottom = '0.5rem';
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';

    el.innerHTML = `
      <div>
        <h4 style="margin:0">${v.company_name}</h4>
        <p style="margin:0; font-size:0.75rem;">TRN: ${v.trn} • ${v.phone}</p>
      </div>
      <span class="badge badge-assigned">${v.plan?.toUpperCase() || 'FREE'}</span>
    `;
    container.appendChild(el);
  });
}

function renderJobs(jobs) {
  const container = document.getElementById('job-list');
  container.innerHTML = '';
  
  jobs.forEach(j => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.padding = '0.75rem 1rem';
    el.style.marginBottom = '0.5rem';
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';

    el.innerHTML = `
      <div class="mono" style="font-size:0.875rem;">${j.job_code}</div>
      <div style="font-size:0.875rem;">${j.origin.split(',')[0]} → ${j.destination.split(',')[0]}</div>
      <span class="badge ${j.status === 'paid' ? 'badge-delivered' : 'badge-quoted'}">${j.status.toUpperCase()}</span>
    `;
    container.appendChild(el);
  });
}

async function loadDemoData(vendorId) {
  if (!vendorId) throw new Error('No vendor available to assign jobs to');
  
  const { supabase } = await import('/js/supabase.js');
  
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

  const jobs = [
    {
      job_code: 'KSP-DEMO-01',
      status: 'enquiry',
      origin: 'Jebel Ali Port, Dubai',
      destination: 'KIZAD, Abu Dhabi',
      cargo_type: '2x 40ft Containers',
      pickup_date: tomorrow.toISOString().split('T')[0],
      client_name: 'Ahmed Al Rashid',
      client_company: 'Emirates Steel',
      client_phone: '+971501110001',
      vendor_id: vendorId,
      quoted_price: null
    },
    {
      job_code: 'KSP-DEMO-02',
      status: 'quoted',
      quoted_price: 3675.00,
      origin: 'JAFZA, Dubai',
      destination: 'Khalifa Port, Abu Dhabi',
      cargo_type: 'Heavy Machinery — 35t',
      pickup_date: dayAfter.toISOString().split('T')[0],
      client_name: 'Sara Johnson',
      client_company: 'Technip FMC',
      client_phone: '+971509990002',
      vendor_id: vendorId
    },
    {
      job_code: 'KSP-DEMO-03',
      status: 'in_transit',
      quoted_price: 1732.50,
      origin: 'Al Quoz Industrial 3',
      destination: 'Dubai Investment Park',
      cargo_type: 'Office Furniture — 3 Rooms',
      pickup_date: today.toISOString().split('T')[0],
      client_name: 'Raj Patel',
      client_company: 'Majid Al Futtaim Retail',
      client_phone: '+971554440003',
      vendor_id: vendorId,
      gps_lat: 25.1234,
      gps_lng: 55.1789
    }
  ];

  for (const job of jobs) {
    await supabase.from('jobs').upsert(job, { onConflict: 'job_code' });
  }
}

init();
