import { createJobEnquiry } from '/js/supabase.js';

document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('btn-submit');
  const originalText = btn.innerText;
  btn.innerText = 'Submitting...';
  btn.disabled = true;

  const urlParams = new URLSearchParams(window.location.search);
  const vendorId = urlParams.get('v') || 'demo-vendor-123'; // Default to demo if missing

  const payload = {
    vendor_id: vendorId,
    status: 'enquiry',
    source: 'book_form',
    service_type: document.getElementById('field-service').value,
    origin: document.getElementById('field-origin').value,
    destination: document.getElementById('field-destination').value,
    pickup_date: document.getElementById('field-date').value,
    cargo_type: document.getElementById('field-cargo').value,
    client_company: document.getElementById('field-company').value,
    client_name: document.getElementById('field-name').value
  };

  try {
    await createJobEnquiry(payload);

    document.querySelector('.card').style.display = 'none';
    document.getElementById('success-screen').style.display = 'block';

  } catch (err) {
    console.error(err);
    alert('Failed to submit request. Please try again.');
    btn.innerText = originalText;
    btn.disabled = false;
  }
});
