// ================================================================
// js/book.js
// Client-facing booking form. Public page — no auth required.
// Reads ?vendor= (or ?v=) from URL to route the enquiry.
// All DB calls go through js/supabase.js helpers.
// ================================================================

import { createJobEnquiry, getVendorProfileById } from '/js/supabase.js';

// ── INIT: Resolve vendor from URL ────────────────────────────────
const params = new URLSearchParams(window.location.search);
const VENDOR_ID = params.get('vendor') || params.get('v');

if (!VENDOR_ID) {
  // No vendor param — hide form, show error
  document.getElementById('form-card').style.display = 'none';
  document.getElementById('error-screen').style.display = 'block';
} else {
  // Show vendor name in header
  (async () => {
    try {
      const profile = await getVendorProfileById(VENDOR_ID);
      if (profile && profile.company_name) {
        const el = document.getElementById('header-vendor');
        el.innerText = `Provider: ${profile.company_name}`;
        el.style.display = 'block';
      }
    } catch (e) { /* silent — vendor name is nice-to-have */ }
  })();
}

// ── FORM SUBMISSION ──────────────────────────────────────────────
document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Guard: should never fire without VENDOR_ID (form is hidden), but safety check
  if (!VENDOR_ID) return;

  const btn = document.getElementById('btn-submit');
  const originalText = btn.innerText;
  btn.innerText = 'Submitting...';
  btn.disabled = true;

  const clientPhone = document.getElementById('field-phone').value;
  const clientEmail = document.getElementById('field-email').value;

  const payload = {
    vendor_id: VENDOR_ID,
    status: 'enquiry',
    source: 'book_form',
    service_type: document.getElementById('field-service').value,
    origin: document.getElementById('field-origin').value,
    destination: document.getElementById('field-destination').value,
    pickup_date: document.getElementById('field-date').value,
    cargo_type: document.getElementById('field-cargo').value,
    client_company: document.getElementById('field-company').value,
    client_name: document.getElementById('field-name').value,
    client_phone: clientPhone,
    client_email: clientEmail
  };

  try {
    const result = await createJobEnquiry(payload);

    // Show success screen with job code
    document.getElementById('form-card').style.display = 'none';
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('ref-code').innerText = result.job_code || 'Submitted';

    // Echo the user's phone back for reassurance
    const contactMsg = document.getElementById('success-contact');
    if (clientPhone) {
      contactMsg.innerText = `The provider will contact you shortly on ${clientPhone}`;
    } else {
      contactMsg.innerText = 'The provider will contact you shortly with a quote.';
    }

  } catch (err) {
    console.error('[Book] Submit failed:', err);
    // AGENTS.md says no alert() — but this is a client-facing public page
    // with no modal infrastructure. Using inline error as fallback.
    btn.innerText = 'Failed — Tap to Retry';
    btn.disabled = false;
    btn.style.borderColor = 'var(--red)';
    btn.style.color = 'var(--red)';
    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 3000);
  }
});
