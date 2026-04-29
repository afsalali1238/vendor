# DESIGN_SYSTEM.md — Kasper Design System

These tokens are fixed. Do not introduce new colour values, fonts, or spacing
units that are not in this file. The brand is precise and was established in
the original `Kasper-Standalone.html`.

---

## Colour Tokens

```css
:root {
  --bg-main:          #0D1B2A;  /* Page background */
  --bg-surface:       #1A2B4A;  /* Cards, panels, modals */
  --bg-surface-light: #213A64;  /* Hover states on surface */
  --accent-teal:      #1D9E75;  /* Primary CTAs, active states, brand highlight */
  --accent-teal-hover:#157E5D;  /* CTA hover state */
  --alert-amber:      #BA7517;  /* Warnings, availability badges, secondary alerts */
  --text-main:        #F4F0E8;  /* Primary text on dark background */
  --text-muted:       #7A8BA0;  /* Secondary text, labels, metadata */
  --border-color:     #2D4263;  /* All borders, dividers */
}
```

**Status colours (tracking timeline):**
```css
--status-complete:  #1D9E75;  /* Completed step (same as accent-teal) */
--status-active:    #1D9E75;  /* Active/current step */
--status-pending:   #2D4263;  /* Future steps */
--status-text-done: #F4F0E8;
--status-text-grey: #7A8BA0;
```

---

## Typography

```css
--font-heading: 'Space Mono', monospace;   /* All headings, logo, status labels, job codes */
--font-body:    'IBM Plex Sans', sans-serif; /* All body text, forms, tables */
```

**Font weights:**
- Space Mono: 400 (regular), 700 (bold)
- IBM Plex Sans: 300 (light), 400 (regular), 600 (semi-bold)

**Type scale:**
```
h1  : 48px / font-heading / bold
h2  : 32px / font-heading / bold
h3  : 24px / font-heading / bold
h4  : 18px / font-heading / bold
body: 16px / font-body / regular
small: 14px / font-body / regular
label: 13px / font-body / 600 / uppercase / letter-spacing 0.5px
```

**Job codes always render in `font-heading`**, large, and in `--accent-teal`.
Example:
```html
<span class="job-code">KSP-20260416-0042</span>
```
```css
.job-code {
  font-family: var(--font-heading);
  font-size: 24px;
  color: var(--accent-teal);
  letter-spacing: 1px;
}
```

---

## Spacing

Base unit: 8px.

```
4px   — xs (tight gaps within components)
8px   — sm (icon-to-text, internal padding)
16px  — md (form field padding, card padding)
24px  — lg (section internal padding)
40px  — xl (between sections within a page)
80px  — 2xl (between major page sections)
```

---

## Components

### Button

```html
<!-- Primary (teal) -->
<button class="btn btn-primary">Book Freight</button>

<!-- Secondary (outline) -->
<button class="btn btn-secondary">Search Equipment</button>

<!-- Small outline (used in tables, cards) -->
<button class="btn btn-outline btn-sm">Book</button>

<!-- Danger/decline -->
<button class="btn btn-ghost">Request a change</button>
```

```css
.btn {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 4px;
  padding: 12px 24px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary {
  background: var(--accent-teal);
  color: var(--text-main);
  border: none;
}
.btn-primary:hover { background: var(--accent-teal-hover); }
.btn-secondary {
  background: transparent;
  color: var(--text-main);
  border: 1px solid var(--border-color);
}
.btn-secondary:hover { border-color: var(--accent-teal); color: var(--accent-teal); }
.btn-outline {
  background: transparent;
  color: var(--accent-teal);
  border: 1px solid var(--accent-teal);
}
.btn-sm { padding: 6px 14px; font-size: 13px; }
```

### Availability Badge

```html
<span class="badge badge-available">Available</span>
<span class="badge badge-booked">2 Days Out</span>
<span class="badge badge-maintenance">Maintenance</span>
```

```css
.badge {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  display: inline-block;
}
.badge-available   { background: rgba(29,158,117,0.15); color: var(--accent-teal); }
.badge-booked      { background: rgba(186,117,23,0.15); color: var(--alert-amber); }
.badge-maintenance { background: rgba(122,139,160,0.15); color: var(--text-muted); }
```

### Glass Form Panel

Used on homepage freight booking form and all enquiry forms.

```css
.glass-form {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 32px;
}
.input-group label {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 6px;
  display: block;
}
.input-group input,
.input-group select,
.input-group textarea {
  background: var(--bg-main);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-main);
  font-family: var(--font-body);
  font-size: 16px;
  padding: 10px 14px;
  width: 100%;
}
.input-group input:focus,
.input-group select:focus { border-color: var(--accent-teal); outline: none; }
```

### Equipment Card

```html
<div class="equipment-card">
  <div class="img-wrapper" style="background-image: url(...)"></div>
  <div class="card-content">
    <span class="badge badge-available">Available</span>
    <h3>Heavy Boom Truck</h3>
    <p class="specs">Capacity: 10 Tons | Lifting: 20m</p>
    <div class="price-row">
      <span>AED 1,800 <small>/ day</small></span>
      <button class="btn btn-outline btn-sm">Book</button>
    </div>
  </div>
</div>
```

### Status Timeline (Tracking Page)

```html
<div class="status-timeline">
  <div class="status-step completed">
    <div class="step-dot">✓</div>
    <div class="step-label">Confirmed</div>
    <div class="step-time">16 Apr 2026, 09:32 GST</div>
  </div>
  <div class="step-connector completed"></div>
  <div class="status-step active">
    <div class="step-dot">●</div>
    <div class="step-label">In Transit</div>
    <div class="step-time">Active now</div>
  </div>
  <div class="step-connector pending"></div>
  <div class="status-step pending">
    <div class="step-dot">○</div>
    <div class="step-label">Delivered</div>
    <div class="step-time">—</div>
  </div>
</div>
```

```css
.status-timeline { display: flex; align-items: flex-start; gap: 0; overflow-x: auto; }
.status-step { display: flex; flex-direction: column; align-items: center; min-width: 100px; }
.step-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-size: 14px; }
.status-step.completed .step-dot { background: var(--accent-teal); color: white; }
.status-step.active .step-dot    { background: var(--accent-teal); color: white; box-shadow: 0 0 0 4px rgba(29,158,117,0.2); }
.status-step.pending .step-dot   { background: var(--bg-surface); border: 2px solid var(--border-color); color: var(--text-muted); }
.step-connector { flex: 1; height: 2px; margin-top: 16px; }
.step-connector.completed { background: var(--accent-teal); }
.step-connector.pending   { background: var(--border-color); }
.step-label { font-family: var(--font-heading); font-size: 11px; margin-top: 8px; text-align: center; }
.status-step.completed .step-label { color: var(--text-main); }
.status-step.active .step-label    { color: var(--accent-teal); }
.status-step.pending .step-label   { color: var(--text-muted); }
.step-time { font-family: var(--font-body); font-size: 11px; color: var(--text-muted); text-align: center; }
```

### Navbar

```css
.navbar {
  background: rgba(13,27,42,0.95);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 64px;
}
.logo { font-family: var(--font-heading); font-size: 20px; font-weight: 700; color: var(--accent-teal); }
.nav-links a { font-family: var(--font-body); font-size: 14px; color: var(--text-muted); text-decoration: none; margin: 0 16px; }
.nav-links a:hover { color: var(--text-main); }
.nav-cta { /* uses .btn .btn-primary styles */ }
```

---

## Fonts (Google Fonts CDN)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

In Next.js, use `next/font/google` instead:
```typescript
import { IBM_Plex_Sans, Space_Mono } from 'next/font/google'
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['300','400','600'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400','700'] })
```

---

## Email Design (Resend React Email)

Email templates must match the website design as closely as email clients allow:

- Background: `#0D1B2A`
- Header section background: `#1A2B4A`
- CTA buttons: `#1D9E75`, white text, 4px border-radius
- Font: fallback to `Arial, sans-serif` (Space Mono not available in email)
- Job code in emails: bold, `#1D9E75`, large font size (24px)
- All emails include Kasper logo (text-based ⬢ KASPER in teal)
- Footer: company name, kasper.ae, UAE address

---

## Mobile Responsiveness Rules

- Breakpoint: 768px (tablet), 375px (mobile)
- Navbar: hamburger menu on mobile
- Equipment grid: 1 column on mobile, 2 on tablet, 3 on desktop
- Forms: single column on mobile
- Status timeline: scrollable horizontally on mobile (do not stack vertically)
- ePOD signature pad: full width on mobile, min-height 200px, works with finger
- GPS embed: aspect-ratio 16:9, responsive width
