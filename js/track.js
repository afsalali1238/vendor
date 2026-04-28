import { getJobByCode, subscribeToGPS, saveClientEPOD } from '/js/supabase.js';
import { generateInvoicePDF } from '/js/pdf.js';
import { openInvoiceMessage, formatAED } from '/js/whatsapp.js';

let jobData = null;
let map = null;
let marker = null;

// Canvas vars
let isDrawing = false;
let lastX = 0, lastY = 0;
const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const jobCode = urlParams.get('job');

  if (!jobCode) {
    showError('Invalid link.');
    return;
  }

  try {
    jobData = await getJobByCode(jobCode);
    if (!jobData) throw new Error('Not found');
    
    renderJob();
    setupCanvas();

    // Subscribe to realtime updates
    subscribeToGPS(jobCode, (payload) => {
      if (payload.status) {
        jobData.status = payload.status;
        updateStatusUI();
      }
      if (payload.lat && payload.lng) {
        jobData.gps_lat = payload.lat;
        jobData.gps_lng = payload.lng;
        jobData.gps_updated_at = payload.updatedAt;
        updateMap();
      }
    });

  } catch (err) {
    console.error(err);
    showError('Failed to load shipment details.');
  }
}

function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-screen').style.display = 'block';
  document.getElementById('error-msg').innerText = msg;
}

function renderJob() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  document.getElementById('job-code-display').innerText = jobData.job_code;
  document.getElementById('job-origin').innerText = jobData.origin;
  document.getElementById('job-destination').innerText = jobData.destination;

  if (jobData.driver_name) {
    document.getElementById('desc-assigned').innerText = `Driver: ${jobData.driver_name} (${jobData.vehicle_plate})`;
  }

  updateStatusUI();
  if (jobData.status === 'in_transit' || jobData.status === 'epod_pending' || jobData.status === 'delivered') {
    initMap();
    updateMap();
  }
}

function updateStatusUI() {
  const s = jobData.status;
  const statusEl = document.getElementById('job-status');
  statusEl.innerText = s.replace('_', ' ').toUpperCase();
  statusEl.className = 'badge';

  // Reset timeline
  ['confirmed', 'assigned', 'intransit', 'delivered'].forEach(step => {
    document.getElementById(`step-${step}`).className = 'step';
  });

  document.getElementById('step-confirmed').classList.add('done');

  if (s === 'assigned' || s === 'vendor_po_sent') {
    document.getElementById('step-assigned').classList.add('active');
    statusEl.classList.add('badge-assigned');
  } else if (s === 'in_transit') {
    document.getElementById('step-assigned').classList.add('done');
    document.getElementById('step-intransit').classList.add('active');
    statusEl.classList.add('badge-intransit');
  } else if (s === 'delivered' || s === 'epod_pending') {
    document.getElementById('step-assigned').classList.add('done');
    document.getElementById('step-intransit').classList.add('done');
    document.getElementById('step-delivered').classList.add('active');
    statusEl.classList.add('badge-delivered');
    
    if (s === 'epod_pending') {
      document.getElementById('epod-section').style.display = 'block';
    }
  } else if (s === 'invoiced' || s === 'paid') {
    document.getElementById('step-assigned').classList.add('done');
    document.getElementById('step-intransit').classList.add('done');
    document.getElementById('step-delivered').classList.add('done');
    statusEl.classList.add(s === 'paid' ? 'badge-delivered' : 'badge-assigned');
    
    document.getElementById('epod-section').style.display = 'none';
    document.getElementById('payment-section').style.display = 'block';
    document.getElementById('pay-amt').innerText = formatAED(jobData.quoted_price || 0);
    // document.getElementById('btn-pay').href = `https://telr.com/pay/${jobData.job_code}`; // Mock URL
    
    if (jobData.invoice_pdf_url) document.getElementById('btn-dl-invoice').href = jobData.invoice_pdf_url;
    else document.getElementById('btn-dl-invoice').style.display = 'none';
    
    if (jobData.epod_pdf_url) document.getElementById('btn-dl-epod').href = jobData.epod_pdf_url;
    else document.getElementById('btn-dl-epod').style.display = 'none';

    if (s === 'paid') {
      document.getElementById('btn-pay').innerText = '✓ Paid in Full';
      document.getElementById('btn-pay').classList.replace('btn-primary', 'btn-secondary');
      document.getElementById('btn-pay').style.pointerEvents = 'none';
      document.getElementById('btn-pay').disabled = true;
    } else {
      // Demo Payment Handler
      document.getElementById('btn-pay').onclick = async () => {
        const btn = document.getElementById('btn-pay');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="width: 1rem; height: 1rem; border-width: 2px;"></div> Processing...';
        btn.disabled = true;
        
        setTimeout(async () => {
          try {
            // Update Supabase
            const { supabase } = await import('/js/supabase.js');
            await supabase.from('jobs').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('job_code', jobData.job_code);
            
            // Show success overlay
            document.getElementById('app').innerHTML += `
              <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--surf); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; color: var(--green); margin-bottom: 1rem;">✅</div>
                <h2 style="margin-top: 0;">Payment Successful!</h2>
                <p style="font-size: 1.25rem; font-weight: bold;">AED ${formatAED(jobData.quoted_price || 0)} received</p>
                <p style="color: var(--text2);">Your invoice has been sent to your email.</p>
                <button onclick="window.location.reload()" class="btn btn-outline" style="margin-top: 2rem;">Close</button>
              </div>
            `;
          } catch(e) {
            alert('Failed to process payment');
            btn.innerHTML = ogText;
            btn.disabled = false;
          }
        }, 2000);
      };
    }
  } else {
    statusEl.classList.add('badge-enquiry');
  }
}

function initMap() {
  if (map) return;
  document.getElementById('map-container').style.display = 'block';
  const lat = jobData.gps_lat || 25.2048;
  const lng = jobData.gps_lng || 55.2708;
  
  map = L.map('map').setView([lat, lng], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Custom truck icon
  const truckIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color:#F59E0B; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 16px;'>🚛</div>",
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  marker = L.marker([lat, lng], {icon: truckIcon}).addTo(map);
}

function updateMap() {
  if (!map || !jobData.gps_lat || !jobData.gps_lng) return;
  const latlng = [jobData.gps_lat, jobData.gps_lng];
  marker.setLatLng(latlng);
  map.panTo(latlng);

  if (jobData.gps_updated_at) {
    const diffMins = Math.floor((new Date() - new Date(jobData.gps_updated_at)) / 60000);
    if (diffMins > 5) {
      document.getElementById('gps-banner').style.display = 'block';
      document.getElementById('gps-ago').innerText = diffMins;
    } else {
      document.getElementById('gps-banner').style.display = 'none';
    }
  }
}

// Canvas Logic
function setupCanvas() {
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [ (clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY ];
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const [x, y] = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
  }

  canvas.addEventListener('mousedown', (e) => { isDrawing = true; [lastX, lastY] = getPos(e); });
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('mouseout', () => isDrawing = false);

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; [lastX, lastY] = getPos(e); }, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', () => isDrawing = false);

  document.getElementById('clear-sig').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

document.getElementById('btn-sign').addEventListener('click', async () => {
  const btn = document.getElementById('btn-sign');
  btn.innerText = 'Processing...';
  btn.disabled = true;

  try {
    const signatureB64 = canvas.toDataURL('image/png');
    
    // 1. Save signature
    await saveClientEPOD(jobData.job_code, signatureB64);

    alert('Thank you! Your signature has been saved. The invoice will be generated.');
    window.location.reload();

  } catch (err) {
    console.error(err);
    alert('Failed to save signature.');
    btn.innerText = 'Submit & Get Invoice';
    btn.disabled = false;
  }
});

init();
