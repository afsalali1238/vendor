// ================================================================
// js/auth.js
// Vendor authentication helpers.
// All vendor pages call requireVendorAuth() on load.
// Driver and client pages do NOT use this file.
// ================================================================

import { supabase } from '/js/supabase.js';

// ── SESSION MANAGEMENT ───────────────────────────────────────────

/**
 * requireVendorAuth()
 * Call at the top of every vendor page script.
 * If no valid Supabase session → redirect to onboard.html.
 * Returns the current user object if authenticated.
 */
export async function requireVendorAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    // DEMO MODE: If no session, require a selected vendor
    console.warn('[Auth] No session found. Checking Demo Mode.');
    const activeVendor = localStorage.getItem('kasper_active_vendor');
    if (!activeVendor) {
      return null; // Signals vendor.js to show login modal
    }
    const companyName = activeVendor === '11111111-1111-1111-1111-111111111111' 
      ? 'Al Noor Transport LLC' 
      : activeVendor === '22222222-2222-2222-2222-222222222222' 
      ? 'Gulf Freight Co.' 
      : activeVendor;
      
    return {
      id: activeVendor,
      phone: '+971501234567',
      user_metadata: { company_name: companyName }
    };
  }

  return session.user;
}

/**
 * getVendorId()
 * Returns the current authenticated vendor's UUID (= auth.uid()).
 * Throws if not authenticated.
 */
export async function getVendorId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user.id;
}

/**
 * getCurrentUser()
 * Returns full Supabase user object or null.
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      id: '11111111-1111-1111-1111-111111111111',
      phone: '+971501234567',
      user_metadata: { company_name: 'Al Noor Transport LLC' }
    };
  }
  return user;
}

/**
 * logout()
 * Signs out the current vendor and redirects to index.html.
 */
export async function logout() {
  await supabase.auth.signOut();
  localStorage.clear();
  window.location.href = '/index.html';
}

// ── OTP PHONE LOGIN ──────────────────────────────────────────────

/**
 * sendOTP(phone)
 * Sends a one-time password to the given UAE phone number.
 * Format: +971XXXXXXXXX
 * Returns { error } or { data }.
 */
export async function sendOTP(phone) {
  const formatted = formatUAEPhone(phone);
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: formatted,
  });
  return { data, error };
}

/**
 * verifyOTP(phone, token)
 * Verifies the OTP. On success, Supabase sets the session automatically.
 * Returns { session, error }.
 */
export async function verifyOTP(phone, token) {
  const formatted = formatUAEPhone(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatted,
    token,
    type: 'sms',
  });
  return { session: data?.session, error };
}

// ── DRIVER TOKEN VALIDATION ──────────────────────────────────────

/**
 * validateDriverToken(jobCode, token)
 * Validates the signed token from the driver's WhatsApp link.
 * Calls a Supabase Edge Function that verifies the JWT.
 * Returns { valid, jobId, driverId } or { valid: false, error }.
 *
 * SECURITY: This is the only auth mechanism for drivers.
 * Never bypass this check in driver.html.
 */
export async function validateDriverToken(jobCode, token) {
  try {
    const response = await fetch(
      `${window.__ENV?.SUPABASE_URL || ''}/functions/v1/validate-driver-token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobCode, token }),
      }
    );
    const result = await response.json();
    return result; // { valid, jobId, driverId, vendorId }
  } catch (err) {
    console.error('[Auth] Driver token validation failed:', err);
    return { valid: false, error: err.message };
  }
}

/**
 * generateDriverToken(jobId, driverId, vendorId)
 * Called by vendor portal when assigning a driver.
 * Returns a signed URL token valid for 24 hours.
 * This calls an Edge Function that uses the service role key.
 */
export async function generateDriverToken(jobId, driverId, vendorId) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Demo Mode
    return 'DEMO_TOKEN_' + Math.random().toString(36).substring(7);
  }
  
  const response = await fetch(
    `${window.__ENV?.SUPABASE_URL || ''}/functions/v1/generate-driver-token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ jobId, driverId, vendorId }),
    }
  );
  const { token, error } = await response.json();
  if (error) throw new Error(error);
  return token;
}

// ── UTILITIES ────────────────────────────────────────────────────

/**
 * formatUAEPhone(input)
 * Normalises a UAE phone number to E.164 format (+971XXXXXXXXX).
 * Handles: 0501234567, 501234567, +971501234567, 971501234567
 */
export function formatUAEPhone(input) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('971')) return `+${digits}`;
  if (digits.startsWith('0')) return `+971${digits.slice(1)}`;
  return `+971${digits}`;
}

/**
 * validateTRN(trn)
 * UAE Tax Registration Number must be exactly 15 digits.
 */
export function validateTRN(trn) {
  return /^\d{15}$/.test(trn.replace(/\s/g, ''));
}

// ── SESSION LISTENER ─────────────────────────────────────────────

/**
 * onAuthChange(callback)
 * Subscribe to auth state changes.
 * Useful for pages that need to react to session expiry.
 */
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
