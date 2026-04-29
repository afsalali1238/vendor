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
    renderJobs(jobs, vendors);

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
  
  if (vendors.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏢</div><h4>No vendors registered</h4></div>';
    return;
  }

  vendors.forEach(v => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.cssText = 'padding:1rem; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;';

    el.innerHTML = `
      <div>
        <h4 style="margin:0">${v.company_name}</h4>
        <p style="margin:0; font-size:0.75rem; color:var(--text2);">TRN: ${v.trn || 'N/A'} &bull; ${v.phone || 'N/A'}</p>
      </div>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <a href="/vendor.html" style="font-size:0.7rem; color:var(--teal); text-decoration:none;">Open Portal</a>
        <span class="badge badge-assigned">${(v.plan || 'free').toUpperCase()}</span>
      </div>
    `;
    container.appendChild(el);
  });
}

function getStatusBadge(status) {
  const map = {
    enquiry: 'badge-enquiry',
    quoted: 'badge-quoted',
    accepted: 'badge-accepted',
    rejected: 'badge-rejected',
    vendor_po_sent: 'badge-assigned',
    assigned: 'badge-assigned',
    in_transit: 'badge-intransit',
    delivered: 'badge-delivered',
    epod_pending: 'badge-delivered',
    invoiced: 'badge-enquiry',
    paid: 'badge-delivered'
  };
  return map[status] || 'badge-enquiry';
}

function renderJobs(jobs, vendors) {
  const container = document.getElementById('job-list');
  container.innerHTML = '';
  
  if (jobs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><h4>No jobs yet</h4><p>Jobs will appear here when vendors receive bookings.</p></div>';
    return;
  }

  // Build vendor lookup
  const vendorMap = {};
  vendors.forEach(v => { vendorMap[v.id] = v; });

  jobs.forEach(j => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.cssText = 'padding:0; margin-bottom:0.75rem; overflow:hidden; cursor:pointer; transition:all 0.2s;';

    const vendor = vendorMap[j.vendor_id];
    const vendorName = vendor ? vendor.company_name : 'Unknown Vendor';
    const badgeClass = getStatusBadge(j.status);
    const price = parseFloat(j.quoted_price || j.vendor_price || 0);
    const origin = (j.origin || '').split(',')[0];
    const dest = (j.destination || '').split(',')[0];

    // Build tracking + approve URLs
    const trackUrl = window.location.origin + '/track.html?job=' + j.job_code;
    const approveUrl = window.location.origin + '/approve.html?job=' + j.job_code;

    el.innerHTML = `
      <div class="ops-job-header" style="padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span class="mono" style="font-size:0.875rem; color:var(--gold);">${j.job_code}</span>
          <span style="font-size:0.8rem; color:var(--text2);">${origin} → ${dest}</span>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          ${price > 0 ? '<span style="font-size:0.8rem; font-weight:700; color:var(--text);">AED ' + formatAED(price) + '</span>' : ''}
          <span class="badge ${badgeClass}">${j.status.replace(/_/g, ' ').toUpperCase()}</span>
          <span class="ops-expand-icon" style="font-size:0.7rem; color:var(--text2); transition:transform 0.2s;">▼</span>
        </div>
      </div>
      <div class="ops-job-details" style="display:none; padding:0 1rem 1rem; border-top:1px solid var(--border);">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.75rem; font-size:0.85rem;">
          <div>
            <p style="margin:0; color:var(--text2); font-size:0.75rem;">Vendor</p>
            <p style="margin:0; font-weight:600;">${vendorName}</p>
          </div>
          <div>
            <p style="margin:0; color:var(--text2); font-size:0.75rem;">Date</p>
            <p style="margin:0; font-weight:600;">${j.pickup_date || 'N/A'}</p>
          </div>
          <div>
            <p style="margin:0; color:var(--text2); font-size:0.75rem;">Cargo</p>
            <p style="margin:0; font-weight:600;">${j.cargo_type || j.equipment_type || 'N/A'}</p>
          </div>
          <div>
            <p style="margin:0; color:var(--text2); font-size:0.75rem;">Client</p>
            <p style="margin:0; font-weight:600;">${j.client_company || 'N/A'}${j.client_name ? ' — ' + j.client_name : ''}</p>
          </div>
          ${j.client_phone ? '<div><p style="margin:0; color:var(--text2); font-size:0.75rem;">Client Phone</p><p style="margin:0;"><a href="tel:' + j.client_phone + '" style="color:var(--teal);">' + j.client_phone + '</a></p></div>' : ''}
          ${j.client_email ? '<div><p style="margin:0; color:var(--text2); font-size:0.75rem;">Client Email</p><p style="margin:0;"><a href="mailto:' + j.client_email + '" style="color:var(--teal);">' + j.client_email + '</a></p></div>' : ''}
          ${j.driver_name ? '<div><p style="margin:0; color:var(--text2); font-size:0.75rem;">Driver</p><p style="margin:0; font-weight:600;">' + j.driver_name + (j.vehicle_plate ? ' (' + j.vehicle_plate + ')' : '') + '</p></div>' : ''}
          ${price > 0 ? '<div><p style="margin:0; color:var(--text2); font-size:0.75rem;">Price (inc. VAT)</p><p style="margin:0; font-weight:700; color:var(--gold);">AED ' + formatAED(price) + '</p></div>' : ''}
        </div>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem; padding-top:0.5rem; border-top:1px solid var(--border);">
          <a href="${trackUrl}" target="_blank" style="color:var(--teal); font-size:0.75rem; text-decoration:none;">📍 Tracking</a>
          <span style="color:var(--border);">|</span>
          <a href="${approveUrl}" target="_blank" style="color:var(--gold); font-size:0.75rem; text-decoration:none;">📄 Approve Page</a>
          <span style="color:var(--border);">|</span>
          <a href="/book.html?vendor=${j.vendor_id}" target="_blank" style="color:var(--teal); font-size:0.75rem; text-decoration:none;">🔗 Booking Link</a>
        </div>
      </div>
    `;

    // Toggle expand/collapse
    el.querySelector('.ops-job-header').addEventListener('click', () => {
      const details = el.querySelector('.ops-job-details');
      const icon = el.querySelector('.ops-expand-icon');
      if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
        el.style.background = 'var(--surf2)';
      } else {
        details.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
        el.style.background = '';
      }
    });

    container.appendChild(el);
  });
}

init();