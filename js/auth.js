// ================================================================
// js/auth.js
// Vendor authentication helpers (Pure sessionStorage Demo Mode)
// ================================================================

export function getCurrentVendorId() {
  return sessionStorage.getItem('vendor_id');
}

export function getCurrentVendorName() {
  return sessionStorage.getItem('vendor_name');
}

export function requireVendorAuth() {
  const vendorId = getCurrentVendorId();
  if (!vendorId) {
    window.location.href = '/index.html';
    return null;
  }
  return {
    id: vendorId,
    phone: '+971501234567',
    user_metadata: { company_name: getCurrentVendorName() }
  };
}

// Ensure alias exists for requireAuth
export const requireAuth = requireVendorAuth;

// Keep getCurrentUser backwards compatible
export async function getCurrentUser() {
  const vendorId = getCurrentVendorId();
  if (!vendorId) return null;
  return {
    id: vendorId,
    phone: '+971501234567',
    user_metadata: { company_name: getCurrentVendorName() }
  };
}

// Keep getVendorId backwards compatible
export async function getVendorId() {
  return getCurrentVendorId();
}

export function logout() {
  sessionStorage.removeItem('vendor_id');
  sessionStorage.removeItem('vendor_name');
  window.location.href = '/index.html';
}

// ── UTILITIES ────────────────────────────────────────────────────
export function formatUAEPhone(input) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('971')) return `+${digits}`;
  if (digits.startsWith('0')) return `+971${digits.slice(1)}`;
  return `+971${digits}`;
}

export function validateTRN(trn) {
  return /^\d{15}$/.test(trn.replace(/\s/g, ''));
}
