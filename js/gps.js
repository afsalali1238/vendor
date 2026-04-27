// ================================================================
// js/gps.js
// GPS logic for driver push and client tracking subscribe.
// Driver side: push location every 10 seconds.
// Client side: subscribe to realtime updates via Supabase channel.
// ================================================================

import { pushGPS, subscribeToGPS, unsubscribe } from './supabase.js';

// ── DRIVER: GPS PUSH ─────────────────────────────────────────────

let _gpsInterval = null;
let _gpsChannel = null;
let _offlineQueue = [];

/**
 * startGPS(jobCode, onUpdate, onError)
 * Starts pushing GPS to Supabase every 10 seconds.
 * Queues pushes when offline and retries on reconnect.
 * Returns a stop function.
 */
export function startGPS(jobCode, onUpdate, onError) {
  if (!navigator.geolocation) {
    if (onError) onError('GPS not available on this device.');
    return () => {};
  }

  // Request permission by getting position once
  navigator.geolocation.getCurrentPosition(
    pos => {
      onUpdate && onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    },
    err => {
      if (onError) onError(getGPSError(err));
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );

  // Push every 10 seconds
  _gpsInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onUpdate && onUpdate({ lat, lng });

        if (navigator.onLine) {
          // Flush any queued offline pushes first
          flushOfflineQueue(jobCode);
          pushGPS(jobCode, lat, lng).catch(err => {
            console.error('[GPS] Push failed, queuing:', err);
            _offlineQueue.push({ lat, lng, at: new Date().toISOString() });
          });
        } else {
          _offlineQueue.push({ lat, lng, at: new Date().toISOString() });
        }
      },
      err => {
        // Don't surface every failed poll to user — just log
        console.error('[GPS] Poll error:', getGPSError(err));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
  }, 10000);

  // Reconnect handler: flush queue
  window.addEventListener('online', () => flushOfflineQueue(jobCode));

  // Return stop function
  return stopGPS;
}

/** Stop GPS tracking and clean up */
export function stopGPS() {
  if (_gpsInterval) {
    clearInterval(_gpsInterval);
    _gpsInterval = null;
  }
  window.removeEventListener('online', flushOfflineQueue);
}

async function flushOfflineQueue(jobCode) {
  if (!_offlineQueue.length) return;
  const queue = [..._offlineQueue];
  _offlineQueue = [];
  // Push most recent position only (no need to replay all)
  const latest = queue[queue.length - 1];
  try {
    await pushGPS(jobCode, latest.lat, latest.lng);
  } catch (err) {
    console.error('[GPS] Flush failed:', err);
    // Re-add to queue
    _offlineQueue = [...queue, ..._offlineQueue];
  }
}

function getGPSError(err) {
  switch (err.code) {
    case 1: return 'Location access denied. Please allow location in browser settings.';
    case 2: return 'GPS signal unavailable in this area.';
    case 3: return 'GPS request timed out. Retrying...';
    default: return 'GPS error. Retrying...';
  }
}

// ── CLIENT: GPS SUBSCRIBE (for track.html) ───────────────────────

/**
 * watchJobGPS(jobCode, onLocationUpdate, onStatusChange)
 * Subscribes to realtime GPS updates for a job.
 * Calls onLocationUpdate({ lat, lng, updatedAt, stale }) on each push.
 * Calls onStatusChange(status) when job status changes.
 * Returns an unsubscribe function.
 */
export function watchJobGPS(jobCode, onLocationUpdate, onStatusChange) {
  const channel = subscribeToGPS(jobCode, ({ lat, lng, updatedAt, status }) => {
    if (lat && lng) {
      const stale = isStale(updatedAt, 5 * 60 * 1000); // 5 minutes
      onLocationUpdate && onLocationUpdate({ lat, lng, updatedAt, stale });
    }
    if (status) {
      onStatusChange && onStatusChange(status);
    }
  });

  _gpsChannel = channel;

  return async () => {
    await unsubscribe(channel);
    _gpsChannel = null;
  };
}

/** Check if a GPS timestamp is older than maxAgeMs */
export function isStale(updatedAt, maxAgeMs = 5 * 60 * 1000) {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > maxAgeMs;
}

/** Format the GPS staleness for display */
export function stalenessLabel(updatedAt) {
  if (!updatedAt) return 'No GPS data';
  const secs = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
  if (secs < 30) return 'Just now';
  if (secs < 60) return `${secs} seconds ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  return 'Over 1 hour ago';
}

// ── CANVAS SIGNATURE ─────────────────────────────────────────────

/**
 * initSignaturePad(canvasId)
 * Initialises a touch/mouse signature canvas.
 * Returns { clear, getBase64, isEmpty } controls.
 */
export function initSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasDrawn = false;

  // High-DPI
  const ratio = window.devicePixelRatio || 1;
  canvas.width  = canvas.offsetWidth  * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  ctx.scale(ratio, ratio);

  ctx.strokeStyle = '#0D1B2A';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left),
      y: (touch.clientY - rect.top),
    };
  }

  canvas.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('mousemove', e => { if (!drawing) return; hasDrawn = true; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
  canvas.addEventListener('mouseup', () => { drawing = false; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!drawing) return; hasDrawn = true; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }, { passive: false });
  canvas.addEventListener('touchend', () => { drawing = false; });

  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
    },
    getBase64() {
      return canvas.toDataURL('image/png');
    },
    isEmpty() {
      return !hasDrawn;
    },
  };
}
