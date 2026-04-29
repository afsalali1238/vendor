# PROMPTS.md — Kasper MVP AI Coding Prompts
## For Windsurf / Antigravity / Cursor / Claude Code
## Copy-paste ready. Each prompt is self-contained.

---

## HOW TO USE

1. Open Windsurf (or Cursor/Claude Code)
2. In the chat panel, paste the SESSION START block first
3. Then paste whichever feature prompt you need
4. The AI will read CLAUDE.md + memory.md automatically if they're in your project root

**SESSION START (paste before every prompt):**
```
I'm building the Kasper Technologies MVP — Phase 1. Read CLAUDE.md and memory.md in this project for full context. Brand: navy #1A2B4A, teal #1D9E75. Stack: Airtable + Traccar + WhatsApp + Zapier + Zoho Books. All credentials in .env. No Phase 2 features.
```

---

## PROMPT SET A — SETUP & CONFIGURATION

### A1: Create .env file template
```
Create a .env.example file for the Kasper MVP project. Include all environment variables listed in memory.md. Add a comment above each variable explaining what it is and where to find it. Also create a .gitignore that excludes .env, node_modules, .DS_Store, and *.log.
```

### A2: Create project folder structure
```
Create the following folder structure for the Kasper MVP project:

kasper-mvp/
├── CLAUDE.md          (already exists)
├── memory.md          (already exists)
├── PRD.md             (already exists)
├── WORKFLOW.md        (already exists)
├── .env.example
├── .gitignore
├── apps/
│   ├── booking-form/  (Feature 1 - public booking HTML page)
│   ├── fleet-map/     (Feature 2 - Traccar map component)
│   ├── epod/          (Feature 3 - driver ePOD page)
│   ├── rate-card/     (Feature 5 - public rate card page)
│   ├── client-portal/ (Feature 7 - Next.js portal)
│   └── webhooks/      (Feature 4/8 - API webhooks)
├── scripts/
│   ├── weekly-report.js
│   └── zapier-test.js
└── docs/
    ├── airtable-setup.md
    ├── traccar-setup.md
    └── zapier-setup.md

Create a README.md at the root with setup instructions.
```

---

## PROMPT SET B — AIRTABLE

### B1: Airtable setup guide generator
```
Write a step-by-step Airtable setup guide as a markdown file saved to docs/airtable-setup.md.

Cover:
1. Creating the base "Kasper Operations"
2. Building the Jobs table with all fields from CLAUDE.md (exact field names and types)
3. Building the Vendors table with all fields from CLAUDE.md
4. Creating the 4 views: All Jobs (grid), Active Today (filtered grid), Job Board (kanban), Dispatch Calendar
5. Setting up the API: where to find the base ID and personal access token
6. Creating a client-filtered share link

Include screenshots descriptions (describe what the user will see at each step).
Format: numbered steps with code blocks for any URLs or settings.
```

### B2: Airtable booking form (HTML, no framework)
```
Build apps/booking-form/index.html — a public freight booking enquiry form for Kasper Technologies.

Design: Full-page form. Dark navy #1A2B4A background. Teal #1D9E75 accents on inputs and submit button. IBM Plex Sans font from Google Fonts. Mobile-first.

Header: Kasper logo text + "Request a Freight Quote"
Subheading: "Available now: Khor Fakkan → Dubai | Fujairah → Dubai | Cross-border GCC"

Form fields (all validated client-side before submit):
- Company Name (text, required)
- Your Name (text, required)  
- WhatsApp (tel, required, UAE format, validate starts with +971 or 05)
- Route From (select: Khor Fakkan Port / Fujairah Port / Jebel Ali Port / Abu Dhabi / Dubai)
- Route To (select: same options)
- Cargo Type (select: Standard Container / Oversized Load / Heavy Equipment / General Cargo)
- Truck Required (select: 40ft Flatbed / Low-bed Trailer / Boom Truck / Pickup)
- Pickup Date (date, min: today)
- Special Requirements (textarea, optional, 200 char limit)

On submit:
- Show loading spinner
- POST to Airtable API: https://api.airtable.com/v0/AIRTABLE_BASE_ID/Jobs
- Set Status = "New Enquiry" automatically
- API key from: window.__AIRTABLE_KEY__ (injected at deploy time via Netlify env)
- On success: hide form, show "✓ Request received. We'll WhatsApp you within 2 hours."
- On error: show "Something went wrong. WhatsApp us directly: +971 XX XXX XXXX"

Also add a floating WhatsApp button (bottom right) that opens wa.me/971XXXXXXXXX.
No back-end needed. Runs entirely in browser. Deploy to Netlify.
```

### B3: Airtable Kanban Job Board (React)
```
Build apps/booking-form/JobBoard.jsx — an internal Kanban board React component that reads Kasper jobs from Airtable.

Import: useState, useEffect from React. No external state management.

Columns: New Enquiry | Confirmed | In Transit | Delivered | Invoiced
Column header colours:
- New Enquiry: amber bg #FAEEDA, text #633806
- Confirmed: teal bg #E1F5EE, text #085041
- In Transit: blue bg #E6F1FB, text #0C447C
- Delivered: green bg #EAF3DE, text #27500A
- Invoiced: gray bg #F1EFE8, text #444441

Each job card shows:
- Job ID (bold, monospace)
- Client Name
- Route: [From] → [To]
- Pickup Date (formatted DD MMM)
- Rate badge (AED X,XXX)
- Driver name if assigned

Drag-and-drop: use HTML5 draggable API (no library). On drop: PATCH Airtable record status.

Top bar: search input (filter by client or job ID), date filter (Today / This Week / All).
Loading skeleton: 3 gray placeholder cards per column while fetching.
Error state: "Could not load jobs. Check your connection."

Fetch from Airtable every 60 seconds (polling).
All credentials from process.env.REACT_APP_AIRTABLE_*.
```

---

## PROMPT SET C — GPS TRACKING

### C1: Traccar server setup script
```
Write a bash script saved to scripts/setup-traccar.sh that automates the Traccar installation on a fresh Ubuntu 22.04 DigitalOcean droplet.

The script should:
1. Update apt packages
2. Install Java (default-jre)
3. Download latest Traccar Linux 64-bit from GitHub releases
4. Unzip and run the installer
5. Enable and start the Traccar systemd service
6. Set up UFW firewall: allow ports 22 (SSH), 8082 (Traccar web), 5027 (Teltonika protocol)
7. Print the server's public IP and login URL

Include a comment at the top explaining how to run it:
"ssh root@YOUR_IP 'bash -s' < setup-traccar.sh"

Add error handling: if any step fails, print a clear error message and exit.
```

### C2: Fleet map component
```
Build apps/fleet-map/FleetMap.jsx — a live fleet tracking map for Kasper Technologies.

Libraries: Leaflet.js (load from CDN). React hooks.

Map setup:
- Center: Dubai, UAE (25.2048, 55.2708)
- Zoom: 8 (shows all UAE)
- Tiles: OpenStreetMap (free)

Data: fetch from Traccar REST API every 30 seconds
- GET process.env.TRACCAR_SERVER_URL + /api/devices (returns device list)
- GET process.env.TRACCAR_SERVER_URL + /api/positions (returns latest positions)
- Auth: Basic base64(username:password) in Authorization header

Truck markers:
- Green dot = speed > 5 km/h (moving)
- Gray dot = speed 0 (parked, ignition on)
- Red dot = last seen > 10 minutes ago (offline)
- Popup on click: Plate Number, Driver Name, Last Seen (time ago), Speed, Job ID (if in Airtable)

Map controls:
- Top right: toggle buttons "All Trucks | Moving | Parked | Offline"
- Top left: count badges "X Moving | X Parked | X Offline"
- Bottom: "Copy tracking link" for selected truck (generates Traccar share URL)

Also export a standalone generateShareLink(deviceId) function that calls Traccar API to create a 24h share link.

Style: Map in full viewport height. Dark overlay sidebar on left with truck list.
Brand: use Kasper navy sidebar bg.
```

---

## PROMPT SET D — ePOD

### D1: ePOD driver page
```
Build apps/epod/index.html — a mobile-first ePOD (Electronic Proof of Delivery) page for Kasper truck drivers.

This must work on cheap Android phones on 4G. Keep it simple. Large touch targets (min 48px).

Form:
1. Job ID (text input, large, auto-caps off, required)
2. Driver Name (text, required)
3. Delivery Location (text, required, placeholder "e.g. Gate 7, Dubai Industrial City")
4. Delivery Time (datetime-local, default: right now)
5. Cargo Status (radio buttons, large tap area):
   - ✓ Good condition
   - ⚠ Minor damage — describe below
   - ✗ Significant damage — describe below
6. Damage description (textarea, shows only if damage selected)
7. Recipient Name (text, required)
8. Delivery Photo (file input that opens camera, required, accept="image/*" capture="camera")
9. Recipient Signature (canvas — finger drawing. "Clear" button. Required)

Submit button: large, teal, "Submit Delivery Record"

On submit:
- Compress image to max 800px wide before upload (use canvas resize)
- POST multipart form data to process.env.GOOGLE_SCRIPT_URL
- Show progress bar for image upload
- On success: show big green checkmark + "Delivery recorded. Job [JOB-ID] complete."
- Cache form data in localStorage — if submit fails, data is saved for retry

PWA-ready: add a manifest.json so it can be added to home screen.
No login. URL shared with drivers via WhatsApp.
```

---

## PROMPT SET E — CLIENT PORTAL

### E1: Full client portal (Next.js)
```
Build apps/client-portal — a Next.js 14 App Router client portal for Kasper Technologies.

Install: next, react, react-dom, tailwindcss

Pages:
/login — simple login form. Client email + password. No auth library — use hardcoded map in lib/auth.js:
{ 
  'damac': { password: 'kasper-damac-2026', clientName: 'DAMAC Properties' },
  'emaar': { password: 'kasper-emaar-2026', clientName: 'Emaar Properties' },
  'rta': { password: 'kasper-rta-2026', clientName: 'Roads & Transport Authority' }
}
Store clientName in localStorage after login. Redirect to /dashboard.

/dashboard — 4 metric cards (jobs this month, in transit, delivered, unpaid invoices) + recent jobs table (last 5). 

/jobs — full jobs table. Columns: Job ID | Route | Status badge | Pickup Date | Driver | Track. Filter by status dropdown. Search by job ID. Click row → /jobs/[id].

/jobs/[id] — full detail. Show all job fields. If trackingLink exists: embed as iframe (Traccar share URL). Download ePOD button (link to Google Sheets attachment URL). Invoice status + "Pay Now" Telr link.

/quote — quote request form (Route From/To, Cargo Type, Truck Type, Date, Notes). POST to Airtable as new record with Status = "New Enquiry". Show "We'll confirm within 2 hours via WhatsApp" on success.

Layout: Left sidebar (nav + client name + logout). Main content area.
Sidebar nav items: Dashboard | My Jobs | Request Quote
Brand: Sidebar bg #1A2B4A. Accent #1D9E75. Font: system-ui.

Data: All pages read from Airtable API, filtered by clientName.
Use server components for data fetching (no client-side API key exposure).
Store Airtable API key in .env.local (AIRTABLE_API_KEY, AIRTABLE_BASE_ID).

Mobile responsive: sidebar collapses to hamburger on mobile.
```

### E2: Quote request widget (embed)
```
Build apps/client-portal/components/QuoteWidget.jsx — a quote request form that can be embedded on any page.

Fields: same as booking form (Route From, Route To, Cargo Type, Truck Type, Pickup Date, Notes).
Pre-fill: if clientName is available from localStorage, pre-fill the company name field.

On submit: POST to Airtable via the server-side API route /api/submit-quote.
Show: loading state, success ("Quote submitted! We'll WhatsApp you within 2 hours"), error.

Style: Card component with #1A2B4A header, white body, teal submit button.
Compact version for dashboard sidebar (collapsible).
```

---

## PROMPT SET F — AUTOMATION & WEBHOOKS

### F1: Webhook API server
```
Build apps/webhooks/server.js — an Express.js API server for Zapier webhooks.

POST /webhook/job-confirmed
Body: { jobId, clientPhone, driverName, plate, trackingLink, eta }
Action: Send MSG91 SMS using DISPATCH template (from CLAUDE.md)
Validate: clientPhone starts with +971 or 05

POST /webhook/job-delivered
Body: { jobId, clientPhone }
Action: Send MSG91 SMS using DELIVERED template

POST /webhook/epod-received
Body: { jobId, driverName, deliveryTime, epodPhotoUrl }
Action: PATCH Airtable record — set ePOD Received = true, Status = "Delivered"

POST /webhook/weekly-report
Body: {} (no body needed — triggered by Zapier schedule)
Action: Query Airtable for last 7 days jobs, build report text, send to REPORT_EMAILS

All routes: validate Bearer token (process.env.WEBHOOK_SECRET). Return 401 if missing.
All routes: log request timestamp + jobId to console.
Error handling: if external API fails, log error + return 500 with { error: message }.

Deploy: Vercel serverless (convert to api/webhook-*.js functions if needed).
Include vercel.json config.
```

### F2: Zapier setup documentation
```
Write docs/zapier-setup.md — a step-by-step guide to setting up all 5 Zapier zaps for Kasper.

For each Zap, include:
1. The trigger (app + event + filter)
2. Each action step (app + event + field mapping)
3. A test checklist

Cover all 5 Zaps from WORKFLOW.md:
Zap 1: Job Confirmed → SMS client
Zap 2: ePOD submitted → Update Airtable
Zap 3: Job Delivered → Create Zoho invoice
Zap 4: Airtable update → Google Sheets sync
Zap 5: Weekly schedule → Email ops report

Include screenshots descriptions. Add cost note at the bottom (Starter plan limits).
```

---

## PROMPT SET G — RATE CARD HOMEPAGE

### G1: Rate card homepage (full design)
```
Build apps/rate-card/index.html — the public-facing Kasper Technologies rate card and booking page.

Design brief: Industrial-luxury. Think premium shipping company meets tech startup. Dark, heavy, confident.

Color palette:
- Background: #0D1B2A (deep navy-black)
- Surface: #1A2B4A (Kasper navy)
- Accent: #1D9E75 (Kasper teal)
- Text: #F4F0E8 (warm white)
- Muted: #7A8BA0 (steel gray)
- Amber alert: #BA7517

Typography:
- Heading font: 'Space Mono' (Google Fonts) — monospace, industrial feel
- Body font: 'IBM Plex Sans' (Google Fonts) — clean, technical
- Load both from Google Fonts

Sections (full page, scroll):

1. HERO — full viewport height
   - Small top bar: "Strait of Hormuz — Land transport capacity active"
   - Large headline: "Digital Iron" (giant, Space Mono, white)
   - Subheadline: "UAE construction & port logistics. 150+ truck network."
   - Two CTA buttons: [Book on WhatsApp] [See Rates ↓]
   - Background: dark navy with subtle diagonal grid pattern (CSS only)
   - Scroll indicator arrow

2. CAPACITY BANNER — urgent, amber background
   - "CAPACITY AVAILABLE NOW — Khor Fakkan · Fujairah · Jebel Ali"
   - "Port-to-inland logistics. Same-day dispatch for qualified requests."

3. RATES TABLE — main selling section
   Heading: "Published Rates — No Negotiation Needed"
   Table with columns: Route | Rate (AED) | Notes | Book
   7 rows per CLAUDE.md rate card
   "Book" column: WhatsApp deep link per route
   Table style: dark rows, teal row hover, monospace prices

4. FLEET — what trucks are available
   4 cards in a grid (Flatbed, Low-bed, Boom, Pickup)
   Each: icon (CSS shape), name, best for, "Available" badge in teal

5. PROOF — client logos and stats
   Headline: "Trusted by UAE's largest developers"
   Client logo placeholders: DAMAC | Emaar | RTA | Dubai Holding | Aldar | Sobha
   Stats row: 150+ trucks | 10,000+ movements | 3+ years | in5/TECOM backed

6. HOW IT WORKS — 3 steps
   1. Request via WhatsApp or form
   2. We confirm within 2 hours
   3. Track live GPS from dispatch to delivery

7. BOOK NOW — CTA section
   Large WhatsApp button (opens wa.me link)
   Email option
   "Or fill in the form:" → inline booking form (same fields as Prompt B2)

8. FOOTER
   Kasper Technologies FZ-LLC
   in5 / TECOM Group, Dubai
   All rates exclude VAT. Subject to availability.

CSS animations:
- Hero text fades in on load (CSS only, no JS library)
- Stats count up from 0 to final number on scroll (vanilla JS IntersectionObserver)
- Rates table rows slide in on scroll
- Floating WhatsApp button (fixed bottom-right, pulse animation)

No JavaScript framework. Pure HTML + CSS + minimal vanilla JS.
Performance: under 2 seconds load time on UAE 4G.
100% mobile responsive.
Meta tags: title, description, OG image (dark card with "Kasper — Digital Iron").
```

---

## PROMPT SET H — QUICK FIXES & UTILITIES

### H1: UAE phone number validation
```
Write a JavaScript utility function validateUAEPhone(phone) that:
- Accepts: +971501234567, 00971501234567, 0501234567, 501234567
- Returns: { valid: true, formatted: '+971501234567' } or { valid: false, error: 'message' }
- UAE mobile prefixes: 050, 052, 054, 055, 056, 058 (Etisalat/e& and du)
- UAE landline prefixes: 02 (Abu Dhabi), 04 (Dubai), 06 (Sharjah), 07 (RAK)
- Include full test suite with Jest
```

### H2: Airtable API wrapper
```
Write a TypeScript module lib/airtable.ts that wraps Airtable REST API calls for Kasper.

Functions:
- getJobs(filter?: string) → Promise<Job[]> — filter is optional formula string
- getJob(recordId: string) → Promise<Job>
- createJob(data: Partial<Job>) → Promise<Job>
- updateJob(recordId: string, data: Partial<Job>) → Promise<Job>
- getVendors(activeOnly?: boolean) → Promise<Vendor[]>

Types: define Job and Vendor interfaces matching CLAUDE.md schema exactly.
Error handling: throw descriptive errors (not raw Airtable API errors).
Rate limiting: add 200ms delay between consecutive calls.
Caching: cache GET responses for 30 seconds (simple Map cache).
```

### H3: Status badge component
```
Write a React component StatusBadge({ status }) that renders a coloured pill badge for Kasper job statuses.

Status colour map from CLAUDE.md:
- New Enquiry: amber
- Confirmed: teal  
- In Transit: blue
- Delivered: green
- Invoiced: gray

Style: small rounded pill, 11px font, appropriate bg + text colour.
Accept an optional size prop: 'sm' | 'md' (default 'md').
Accessible: include appropriate aria-label.
```
