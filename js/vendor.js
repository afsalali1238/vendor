import { 
  getVendorProfile, updateVendorProfile, getVendorRFQs, submitRFQQuote, 
  getActiveJobs, getPaymentJobs, getVendorDrivers, 
  assignDriver, addDriver 
} from '/js/supabase.js';
import { requireVendorAuth, logout, generateDriverToken } from '/js/auth.js';
import { generateQuotePDF } from '/js/pdf.js';
import { openQuoteMessage, openDriverAssignMessage, openPaymentReminder, formatAED, buildDriverUrl } from '/js/whatsapp.js';

let currentVendor = null;
let currentTab = 'tab-rfqs';

// Initialize
async function init() {
  try {
    const user = await requireVendorAuth();
    if (!user) {
      document.getElementById('loginModal').classList.add('active');
      document.getElementById('btnLogin').addEventListener('click', () => {
        const selected = document.getElementById('vendor-select').value;
        localStorage.setItem('kasper_active_vendor', selected);
        window.location.reload();
      });
      return;
    }

    currentVendor = await getVendorProfile();

    // Show company name in header
    if (currentVendor.company_name) {
      document.getElementById('header-company').innerText = currentVendor.company_name;
    }

    setupTabs();
    setupModals();
    setupHeader();
    setupSettings();
    setupLogout();

    // Show initial tab immediately
    document.getElementById(currentTab).style.display = 'block';

    // Fetch data in background
    refreshData();
    
    // Auto-refresh every 15s
    setInterval(() => {
      if (!document.hidden) refreshData();
    }, 15000);

    // Handle visibility change to refresh immediately when returning
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshData();
    });

  } catch (err) {
    console.error('Init error:', err);
    alert('Failed to load portal. Please try again.');
  }
}

// ── UI LOGIC ─────────────────────────────────────────────────────

function setupTabs() {
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
      });

      // Show selected tab
      currentTab = item.dataset.tab;
      document.getElementById(currentTab).style.display = 'block';

      // Refresh data on tab switch
      refreshData();
    });
  });
}

function setupHeader() {
  const btn = document.getElementById('btn-copy-link');
  if (btn) {
    btn.addEventListener('click', () => {
      const link = `${window.location.origin}/book.html?vendor=${currentVendor.id}`;
      window.open(link, '_blank');
    });
  }
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      localStorage.removeItem('kasper_active_vendor');
      await logout();
      window.location.href = '/index.html';
    });
  }
}

function setupSettings() {
  const modal = document.getElementById('settingsModal');
  const btn = document.getElementById('btn-settings');
  const close = document.getElementById('closeSettingsModal');
  const form = document.getElementById('settingsForm');

  if (btn) btn.addEventListener('click', () => {
    document.getElementById('set-company').value = currentVendor.company_name || '';
    document.getElementById('set-whatsapp').value = currentVendor.whatsapp || currentVendor.phone || '';
    document.getElementById('set-trn').value = currentVendor.trn || '';
    document.getElementById('set-bank-name').value = currentVendor.bank_name || '';
    document.getElementById('set-iban').value = currentVendor.iban || '';
    modal.classList.add('active');
  });

  if (close) close.addEventListener('click', () => modal.classList.remove('active'));

  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = form.querySelector('button');
    saveBtn.innerText = 'Saving...';
    saveBtn.disabled = true;

    try {
      const updates = {
        company_name: document.getElementById('set-company').value,
        whatsapp: document.getElementById('set-whatsapp').value,
        trn: document.getElementById('set-trn').value,
        bank_name: document.getElementById('set-bank-name').value,
        iban: document.getElementById('set-iban').value
      };
      
      await updateVendorProfile(updates);
      Object.assign(currentVendor, updates);
      
      // Update header with new company name
      if (updates.company_name) {
        document.getElementById('header-company').innerText = updates.company_name;
      }
      
      modal.classList.remove('active');
      alert('Settings saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      saveBtn.innerText = 'Save Settings';
      saveBtn.disabled = false;
    }
  });
}

function setupModals() {
  // Add Driver Modal
  document.getElementById('addDriverBtn').addEventListener('click', () => {
    document.getElementById('addDriverModal').classList.add('active');
  });
  document.getElementById('closeAddDriverModal').addEventListener('click', () => {
    document.getElementById('addDriverModal').classList.remove('active');
  });

  document.getElementById('addDriverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const ogText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
      await addDriver({
        name: document.getElementById('new-driver-name').value,
        phone: document.getElementById('new-driver-phone').value,
        plate: document.getElementById('new-driver-plate').value,
        vehicle_type: document.getElementById('new-driver-type').value,
        active: false
      });
      document.getElementById('addDriverModal').classList.remove('active');
      e.target.reset();
      refreshFleet();
    } catch (err) {
      console.error(err);
      alert('Failed to add driver');
    } finally {
      btn.innerText = ogText;
      btn.disabled = false;
    }
  });

  // Assign Driver Modal close
  document.getElementById('closeAssignModal').addEventListener('click', () => {
    document.getElementById('assignDriverModal').classList.remove('active');
  });
}

async function refreshData() {
  switch (currentTab) {
    case 'tab-rfqs': return refreshRFQs();
    case 'tab-jobs': return refreshActiveJobs();
    case 'tab-fleet': return refreshFleet();
    case 'tab-payments': return refreshPayments();
  }
}

// ── TAB 1: RFQs ──────────────────────────────────────────────────

async function refreshRFQs() {
  try {
    const rfqs = await getVendorRFQs();
    const container = document.getElementById('rfq-list');
    document.getElementById('rfq-count').innerText = rfqs.length;

    if (rfqs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📡</div>
          <h4>No RFQs yet</h4>
          <p>You will be notified when new enquiries arrive.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    rfqs.forEach(rfq => {
      const job = rfq.jobs;
      const el = document.createElement('div');
      el.className = 'card';
      
      let badgeClass = 'badge-enquiry';
      let statusText = rfq.status.toUpperCase();
      if (rfq.status === 'quoted') badgeClass = 'badge-quoted';
      if (rfq.status === 'accepted') badgeClass = 'badge-accepted';
      if (rfq.status === 'rejected') badgeClass = 'badge-rejected';

      el.innerHTML = `
        <div class="card-header">
          <span class="mono text-gold">${job.job_code}</span>
          <span class="badge ${badgeClass}">${statusText}</span>
        </div>
        <p><strong>Route:</strong> ${job.origin} → ${job.destination}</p>
        <p><strong>Date:</strong> ${job.pickup_date}</p>
        <p><strong>Equipment:</strong> ${job.cargo_type || job.equipment_type}</p>
        <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--surf2); border-radius: var(--radius); font-size: 0.875rem;">
          <p style="margin:0"><strong>Client:</strong> ${job.client_company}${job.client_name ? ' — ' + job.client_name : ''}</p>
          ${job.client_phone ? `<p style="margin:0.25rem 0 0 0">📞 <a href="tel:${job.client_phone}" style="color: var(--teal);">${job.client_phone}</a></p>` : ''}
          ${job.client_email ? `<p style="margin:0.25rem 0 0 0">✉️ <a href="mailto:${job.client_email}" style="color: var(--teal);">${job.client_email}</a></p>` : ''}
        </div>
      `;

      if (rfq.status === 'sent') {
        const form = document.createElement('form');
        form.innerHTML = `
          <div class="form-group" style="margin-top: 1rem;">
            <label class="form-label">Price (inc. VAT, AED)</label>
            <input type="number" class="form-input" required min="1" step="0.01" id="input-price-${job.job_code}">
            <div id="breakdown-${job.job_code}" style="font-size: 0.75rem; color: var(--text2); margin-top: 0.25rem;">
              Ex-VAT: AED 0.00 | VAT (5%): AED 0.00 | Total: AED 0.00
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notes (Optional)</label>
            <input type="text" class="form-input" placeholder="e.g. Tolls included">
          </div>
          <button type="submit" class="btn btn-primary btn-block">Send Quote</button>
        `;
        
        // Add real-time breakdown listener
        setTimeout(() => {
          const input = form.querySelector(`#input-price-${job.job_code}`);
          const breakdown = form.querySelector(`#breakdown-${job.job_code}`);
          if (input && breakdown) {
            input.addEventListener('input', (e) => {
              const val = parseFloat(e.target.value) || 0;
              const exVat = val / 1.05;
              const vat = val - exVat;
              breakdown.innerText = `Ex-VAT: AED ${formatAED(exVat)} | VAT (5%): AED ${formatAED(vat)} | Total: AED ${formatAED(val)}`;
            });
          }
        }, 0);

        form.onsubmit = async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button');
          btn.innerText = 'Sending...';
          btn.disabled = true;
          try {
            const priceInput = form.querySelectorAll('input')[0];
            const notes = form.querySelectorAll('input')[1].value;
            const price = parseFloat(priceInput.value); // Storing inc-VAT total per AGENTS.md convention
            
            // 1. Update RFQ in DB
            await submitRFQQuote(rfq.id, price, notes);

            // 2. We need a mocked job object for the PDF (including quoted_price)
            // The vendor_price represents what Kasper pays vendor.
            // Client pays Kasper quoted_price. But for this MVP, quote is sent directly.
            // Let's assume vendor_price is what we quote if quoting directly.
            const jobMock = { ...job, quoted_price: price };
            const pdfResult = await generateQuotePDF(jobMock, currentVendor);

            // 3. Send WhatsApp
            const priceExVAT = price / 1.05;
            const vatAmount = price - priceExVAT;
            const totalIncVAT = price;

            openQuoteMessage({
              clientPhone: job.client_phone || '+971500000000', // Mock if missing
              jobCode: job.job_code,
              pdfUrl: pdfResult.url,
              priceExVAT,
              vatAmount,
              totalIncVAT
            });

            refreshRFQs();
          } catch (err) {
            console.error(err);
            alert('Failed to send quote');
            btn.innerText = 'Send Quote';
            btn.disabled = false;
          }
        };
        el.appendChild(form);
      }

      container.appendChild(el);
    });
  } catch (err) {
    console.error(err);
  }
}

// ── TAB 2: ACTIVE JOBS ───────────────────────────────────────────

async function refreshActiveJobs() {
  try {
    const jobs = await getActiveJobs();
    const container = document.getElementById('job-list');
    document.getElementById('job-count').innerText = jobs.length;

    if (jobs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚛</div>
          <h4>No active jobs</h4>
          <p>Accepted quotes will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    jobs.forEach(job => {
      const el = document.createElement('div');
      el.className = 'card';
      
      let badgeClass = 'badge-assigned';
      if (job.status === 'in_transit') badgeClass = 'badge-intransit';
      if (job.status === 'delivered' || job.status === 'epod_pending') badgeClass = 'badge-delivered';

      el.innerHTML = `
        <div class="card-header">
          <span class="mono text-gold">${job.job_code}</span>
          <span class="badge ${badgeClass}">${job.status.replace('_', ' ').toUpperCase()}</span>
        </div>
        <p><strong>Route:</strong> ${job.origin} → ${job.destination}</p>
        <p><strong>Date:</strong> ${job.pickup_date}</p>
      `;

      if (job.status === 'vendor_po_sent' || job.status === 'accepted' || (!job.driver_id && job.status !== 'delivered')) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '0.5rem';
        row.style.marginTop = '1rem';

        const btnAssign = document.createElement('button');
        btnAssign.className = 'btn btn-primary';
        btnAssign.style.flex = '1';
        btnAssign.innerText = 'Assign Driver';
        btnAssign.onclick = () => showAssignDriverModal(job);
        row.appendChild(btnAssign);

        const btnSub = document.createElement('button');
        btnSub.className = 'btn btn-outline';
        btnSub.style.flex = '1';
        btnSub.innerText = 'Sub-PO';
        btnSub.onclick = () => {
          const subPhone = prompt('Enter Sub-Contractor WhatsApp Number:', '+971');
          if (subPhone) {
            // Logic to send PO link to sub-contractor
            alert('PO Link generated and sent to WhatsApp!');
          }
        };
        row.appendChild(btnSub);
        
        el.appendChild(row);
      } else if (job.driver_name) {
        const info = document.createElement('div');
        info.style.marginTop = '1rem';
        info.style.padding = '0.75rem';
        info.style.background = 'var(--surf2)';
        info.style.borderRadius = 'var(--radius)';
        info.innerHTML = `
          <p style="margin:0; font-size: 0.875rem; color: var(--text2);">Assigned Driver</p>
          <p style="margin:0; font-weight: bold;">${job.driver_name} (${job.vehicle_plate})</p>
        `;
        el.appendChild(info);
      }

      container.appendChild(el);
    });
  } catch (err) {
    console.error(err);
  }
}

async function showAssignDriverModal(job) {
  const modal = document.getElementById('assignDriverModal');
  document.getElementById('assign-job-code').innerText = job.job_code;
  const list = document.getElementById('assign-driver-list');
  list.innerHTML = '<div class="spinner"></div>';
  modal.classList.add('active');

  try {
    const drivers = await getVendorDrivers();
    list.innerHTML = '';
    if (drivers.length === 0) {
      list.innerHTML = '<p>No drivers found. Add one in the Fleet tab.</p>';
      return;
    }

    drivers.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.justifyContent = 'space-between';
      btn.innerHTML = `<span>${d.name}</span> <span class="badge ${d.active ? 'badge-intransit' : 'badge-delivered'}">${d.active ? 'ON JOB' : 'AVAILABLE'}</span>`;
      
      if (!d.active) {
        btn.onclick = async () => {
          btn.innerText = 'Assigning...';
          try {
            await assignDriver(job.id, d);
            
            // Generate link and notify driver
            const token = await generateDriverToken(job.id, d.id, currentVendor.id);
            const driverUrl = buildDriverUrl(job.job_code, token);
            
            openDriverAssignMessage({
              driverPhone: d.phone,
              driverName: d.name,
              jobCode: job.job_code,
              driverUrl
            });

            modal.classList.remove('active');
            refreshActiveJobs();
          } catch (err) {
            console.error(err);
            alert('Failed to assign driver');
          }
        };
      } else {
        btn.disabled = true;
      }
      list.appendChild(btn);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p>Failed to load drivers.</p>';
  }
}

// ── TAB 3: FLEET ─────────────────────────────────────────────────

async function refreshFleet() {
  try {
    const drivers = await getVendorDrivers();
    const container = document.getElementById('fleet-list');

    if (drivers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛻</div>
          <h4>No drivers added</h4>
          <p>Add drivers to your fleet to assign them to jobs.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    drivers.forEach(d => {
      const el = document.createElement('div');
      el.className = 'card';
      el.style.display = 'flex';
      el.style.justifyContent = 'space-between';
      el.style.alignItems = 'center';

      const statusBadge = d.active 
        ? '<span class="badge badge-intransit">ON JOB</span>'
        : '<span class="badge badge-delivered">AVAILABLE</span>';

      el.innerHTML = `
        <div>
          <h4 style="margin:0">${d.name}</h4>
          <p style="margin:0; font-size:0.875rem">${d.vehicle_type} • ${d.plate}</p>
        </div>
        <div>${statusBadge}</div>
      `;
      container.appendChild(el);
    });
  } catch (err) {
    console.error(err);
  }
}

// ── TAB 4: PAYMENTS ──────────────────────────────────────────────

async function refreshPayments() {
  try {
    const jobs = await getPaymentJobs();
    const container = document.getElementById('payment-list');
    
    let outstanding = 0;
    let paid = 0;

    container.innerHTML = '';

    if (jobs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <h4>No invoices yet</h4>
          <p>Completed jobs will appear here.</p>
        </div>
      `;
    }

    jobs.forEach(job => {
      const amount = parseFloat(job.quoted_price || job.vendor_price || 0);
      if (job.status === 'invoiced') outstanding += amount;
      if (job.status === 'paid') paid += amount;

      const el = document.createElement('div');
      el.className = 'card';
      const badge = job.status === 'paid' 
        ? '<span class="badge badge-delivered">PAID</span>'
        : '<span class="badge badge-enquiry">OUTSTANDING</span>';

      el.innerHTML = `
        <div class="card-header">
          <span class="mono text-gold">INV-${job.job_code}</span>
          ${badge}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0">AED ${formatAED(amount)} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text2);">inc. VAT</span></h3>
            <p style="margin:0; font-size:0.75rem; color: var(--text2);">AED ${formatAED(amount / 1.05)} ex. VAT</p>
          </div>
          <p style="margin:0; font-size:0.875rem">${job.client_company || 'Client'}</p>
        </div>
      `;

      if (job.status === 'invoiced') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline btn-block';
        btn.style.marginTop = '1rem';
        btn.innerText = 'Send Reminder';
        btn.onclick = () => {
          openPaymentReminder({
            clientPhone: job.client_phone || '+971500000000',
            jobCode: job.job_code,
            totalIncVAT: amount,
            telrPaymentUrl: 'https://telr.com/pay/' + job.job_code,
            daysOverdue: 0
          });
        };
        el.appendChild(btn);
      }

      container.appendChild(el);
    });

    document.getElementById('outstanding-amt').innerText = `AED ${formatAED(outstanding)}`;
    document.getElementById('paid-amt').innerText = `AED ${formatAED(paid)}`;
  } catch (err) {
    console.error(err);
  }
}

// Boot
init();
