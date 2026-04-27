import { validateDriverToken } from '/js/auth.js';
import { getJobByCode, updateJobStatus, pushGPS, saveDriverEPOD, uploadDeliveryPhoto } from '/js/supabase.js';

let jobData = null;
let gpsInterval = null;
let lastGps = { lat: 0, lng: 0 };

// Canvas vars
let isDrawing = false;
let lastX = 0;
let lastY = 0;
const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const jobCode = urlParams.get('job');
  const token = urlParams.get('t');

  if (!jobCode || !token) {
    showError('Invalid link. Contact your employer.');
    return;
  }

  try {
    const val = await validateDriverToken(jobCode, token);
    if (!val.valid) {
      showError('Link expired or invalid. Ask for a new link.');
      return;
    }

    jobData = await getJobByCode(jobCode);
    renderJob();
  } catch (err) {
    showError('Failed to load job details. Try again.');
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
  
  const statusEl = document.getElementById('job-status');
  statusEl.innerText = jobData.status.replace('_', ' ').toUpperCase();
  statusEl.className = 'badge ' + (jobData.status === 'in_transit' ? 'badge-intransit' : (jobData.status === 'assigned' ? 'badge-assigned' : 'badge-delivered'));

  document.getElementById('job-date').innerText = jobData.pickup_date || '—';
  document.getElementById('job-origin').innerText = jobData.origin;
  document.getElementById('job-destination').innerText = jobData.destination;
  document.getElementById('job-cargo').innerText = jobData.cargo_type || jobData.equipment_type || '—';
  document.getElementById('job-client').innerText = jobData.client_name || '—';
  document.getElementById('job-phone').innerText = jobData.client_phone || 'Call';
  document.getElementById('job-phone').href = `tel:${jobData.client_phone}`;
  document.getElementById('job-notes').innerText = jobData.notes || 'No special instructions.';

  if (jobData.status === 'assigned') {
    document.getElementById('btn-start').style.display = 'block';
  } else if (jobData.status === 'in_transit') {
    document.getElementById('btn-deliver').style.display = 'block';
    startGPSPush();
  } else if (jobData.status === 'delivered' || jobData.status === 'epod_pending' || jobData.status === 'invoiced' || jobData.status === 'paid') {
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('success-screen').querySelector('h3').innerText = 'Job Completed';
  }
}

// Actions
document.getElementById('btn-start').addEventListener('click', async () => {
  document.getElementById('btn-start').innerText = 'Starting...';
  document.getElementById('btn-start').disabled = true;
  try {
    await updateJobStatus(jobData.job_code, 'in_transit');
    jobData.status = 'in_transit';
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-deliver').style.display = 'block';
    document.getElementById('job-status').innerText = 'IN TRANSIT';
    document.getElementById('job-status').className = 'badge badge-intransit';
    startGPSPush();
  } catch (err) {
    alert('Failed to start trip.');
    document.getElementById('btn-start').innerText = 'Start Trip';
    document.getElementById('btn-start').disabled = false;
  }
});

document.getElementById('btn-deliver').addEventListener('click', () => {
  document.getElementById('btn-deliver').style.display = 'none';
  document.getElementById('epod-screen').style.display = 'block';
  stopGPSPush();
  setupCanvas();
});

document.getElementById('btn-confirm').addEventListener('click', async () => {
  const btn = document.getElementById('btn-confirm');
  btn.innerText = 'Uploading...';
  btn.disabled = true;

  try {
    let photoUrl = null;
    const fileInput = document.getElementById('photo-input');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      photoUrl = await uploadDeliveryPhoto(jobData.vendor_id, jobData.job_code, file);
    }

    const signatureB64 = canvas.toDataURL('image/png');

    await saveDriverEPOD(jobData.job_code, {
      signatureB64,
      photoUrl,
      gpsLat: lastGps.lat,
      gpsLng: lastGps.lng
    });

    document.getElementById('epod-screen').style.display = 'none';
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('job-status').innerText = 'DELIVERED';
    document.getElementById('job-status').className = 'badge badge-delivered';
  } catch (err) {
    console.error(err);
    alert('Failed to save delivery. Please try again.');
    btn.innerText = 'Confirm Delivery';
    btn.disabled = false;
  }
});

// GPS Logic
function startGPSPush() {
  if (!navigator.geolocation) {
    document.getElementById('gps-banner').style.display = 'block';
    return;
  }

  function sendLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
      lastGps.lat = pos.coords.latitude;
      lastGps.lng = pos.coords.longitude;
      document.getElementById('gps-banner').style.display = 'none';
      pushGPS(jobData.job_code, pos.coords.latitude, pos.coords.longitude).catch(() => {});
    }, err => {
      console.warn('GPS error:', err);
      document.getElementById('gps-banner').style.display = 'block';
    }, { enableHighAccuracy: true });
  }

  sendLocation();
  gpsInterval = setInterval(sendLocation, 10000);
}

function stopGPSPush() {
  if (gpsInterval) clearInterval(gpsInterval);
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
    return [
      (clientX - rect.left) * scaleX,
      (clientY - rect.top) * scaleY
    ];
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

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = getPos(e);
  });
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('mouseout', () => isDrawing = false);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    [lastX, lastY] = getPos(e);
  }, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', () => isDrawing = false);

  document.getElementById('clear-sig').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

// Start
init();
