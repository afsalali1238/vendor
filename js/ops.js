import { getAllVendors, getAllJobs } from '/js/supabase.js';
import { logout } from '/js/auth.js';
import { formatAED } from '/js/whatsapp.js';

async function init() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  try {
    const vendors = await getAllVendors();
    const jobs = await getAllJobs();

    renderStats(vendors, jobs);
    renderVendors(vendors);
    renderJobs(jobs);

  } catch (err) {
    console.error(err);
    document.querySelector('main').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon text-red">🚫</div>
        <h3>Access Denied</h3>
        <p>You do not have permission to view the internal ops portal.</p>
        <a href="/index.html" class="btn btn-primary" style="margin-top:1rem;">Back to Home</a>
      </div>
    `;
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

init();
