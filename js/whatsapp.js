// ================================================================
// js/whatsapp.js
// All WhatsApp communication logic.
// Phase 1: wa.me deep links (free, no API key needed).
// Phase 2: 360dialog API (automated, AED 50/month).
// ================================================================

// ── PHASE 1: wa.me DEEP LINKS ────────────────────────────────────
// These open WhatsApp with a pre-filled message.
// The vendor TAPS to send — it's not automatic.
// No API approval needed. Works immediately.

/**
 * Opens WhatsApp with a pre-filled quote message.
 * Vendor taps "Send Quote" → WhatsApp opens → vendor taps send.
 */
export function openQuoteMessage({ clientPhone, jobCode, pdfUrl, priceExVAT, vatAmount, totalIncVAT, validHours = 48 }) {
  const text = [
    `Dear Client,`,
    ``,
    `Please find our quote for job ${jobCode}:`,
    ``,
    `💰 Price (ex-VAT): AED ${formatAED(priceExVAT)}`,
    `🏛️ VAT (5%): AED ${formatAED(vatAmount)}`,
    `✅ Total (inc-VAT): AED ${formatAED(totalIncVAT)}`,
    ``,
    `📄 Full quote PDF: ${pdfUrl}`,
    ``,
    `This quote is valid for ${validHours} hours.`,
    `Tap to approve: ${buildApproveUrl(jobCode)}`,
    ``,
    `Kasper Vendor OS`,
  ].join('\n');

  openWA(clientPhone, text);
}

/**
 * Opens WhatsApp to notify driver of new job assignment.
 */
export function openDriverAssignMessage({ driverPhone, driverName, jobCode, driverUrl }) {
  const text = [
    `Hi ${driverName},`,
    ``,
    `You have a new job assigned: ${jobCode}`,
    ``,
    `Tap the link below to open your job details:`,
    `${driverUrl}`,
    ``,
    `Please confirm you have received this message.`,
  ].join('\n');

  openWA(driverPhone, text);
}

/**
 * Opens WhatsApp to send the client their live tracking link.
 */
export function openTrackingMessage({ clientPhone, jobCode, driverName }) {
  const text = [
    `Good news! Your job ${jobCode} is underway.`,
    ``,
    `🚛 Driver: ${driverName}`,
    ``,
    `Track your delivery live here:`,
    `${buildTrackUrl(jobCode)}`,
    ``,
    `You will receive an invoice on delivery.`,
  ].join('\n');

  openWA(clientPhone, text);
}

/**
 * Opens WhatsApp to send the client their invoice and payment link.
 */
export function openInvoiceMessage({ clientPhone, jobCode, invoiceUrl, totalIncVAT, telrPaymentUrl, dueDate }) {
  const text = [
    `Your delivery for job ${jobCode} is complete.`,
    ``,
    `📄 Invoice: ${invoiceUrl}`,
    `💳 Pay online: ${telrPaymentUrl}`,
    ``,
    `Amount due: AED ${formatAED(totalIncVAT)}`,
    `Due date: ${dueDate}`,
    ``,
    `Thank you for using Kasper.`,
  ].join('\n');

  openWA(clientPhone, text);
}

/**
 * Opens WhatsApp to send a payment reminder.
 */
export function openPaymentReminder({ clientPhone, jobCode, totalIncVAT, telrPaymentUrl, daysOverdue }) {
  const text = [
    `Friendly reminder: Invoice for job ${jobCode} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due'}.`,
    ``,
    `Amount: AED ${formatAED(totalIncVAT)}`,
    `Pay now: ${telrPaymentUrl}`,
    ``,
    `Please let us know if you have any questions.`,
  ].join('\n');

  openWA(clientPhone, text);
}

/**
 * Opens WhatsApp with a pre-filled booking enquiry template.
 * Linked from vendor's QR code / booking link.
 */
export function buildEnquiryLink(vendorWhatsapp) {
  const text = [
    `Hi, I'd like to request a quote.`,
    ``,
    `Service type: [Truck / Crane / Equipment]`,
    `Pickup location: `,
    `Delivery location: `,
    `Date required: `,
    `Cargo / equipment: `,
    ``,
    `My name: `,
    `Company: `,
  ].join('\n');

  return `https://wa.me/${stripPlus(vendorWhatsapp)}?text=${encode(text)}`;
}

// ── PHASE 2: 360dialog API ───────────────────────────────────────
// Automated — no manual tap needed. Sends on trigger.
// Requires: 360dialog account + Meta-approved templates.
// Enable by setting DIALOG_360_KEY in .env + vendor.wa_api_key.

/**
 * sendViaAPI(to, templateName, params)
 * Sends a pre-approved WhatsApp Business API template message.
 * Called from server-side (Supabase Edge Function) or when API key available.
 *
 * templateName must be pre-approved by Meta. Current templates:
 *   - enquiry_received   (utility) → params: [jobCode]
 *   - quote_ready        (utility) → params: [jobCode, pdfUrl]
 *   - job_confirmed      (utility) → params: [jobCode, trackUrl]
 *   - driver_assigned    (utility) → params: [driverName, jobCode, trackUrl]
 *   - invoice_ready      (utility) → params: [jobCode, amount, payUrl]
 */
export async function sendViaAPI({ apiKey, to, templateName, params, lang = 'en' }) {
  const url = 'https://waba.360dialog.io/v1/messages';
  const body = {
    to: stripPlus(to),
    type: 'template',
    template: {
      namespace: 'kasper_vendor_os',
      name: templateName,
      language: { policy: 'deterministic', code: lang },
      components: [{
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: String(p) })),
      }],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'D360-API-KEY': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`360dialog API error: ${err}`);
  }

  return response.json();
}

// ── URL BUILDERS ─────────────────────────────────────────────────

export function buildApproveUrl(jobCode) {
  return `${window.location.origin}/approve.html?job=${jobCode}`;
}

export function buildTrackUrl(jobCode) {
  return `${window.location.origin}/track.html?job=${jobCode}`;
}

export function buildDriverUrl(jobCode, token) {
  return `${window.location.origin}/driver.html?job=${jobCode}&t=${token}`;
}

export function buildBookingUrl(vendorId) {
  return `${window.location.origin}/book.html?v=${vendorId}`;
}

// ── UTILITIES ────────────────────────────────────────────────────

function openWA(phone, text) {
  const url = `https://wa.me/${stripPlus(phone)}?text=${encode(text)}`;
  window.open(url, '_blank', 'noopener');
}

function encode(text) {
  return encodeURIComponent(text);
}

function stripPlus(phone) {
  return String(phone).replace(/^\+/, '').replace(/\s/g, '');
}

export function formatAED(amount) {
  if (amount == null) return '0.00';
  return Number(amount).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
