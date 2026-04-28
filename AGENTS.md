# KASPER VENDOR OS — AGENT RULES

Read this file completely before writing any code, creating any file, or running any command.

## Project identity

Product: Kasper Vendor OS — SaaS portal for UAE logistics and equipment rental SMEs.
Repo: kasper-vendor-os/
Deploy: Vercel (static site, no build step)
Live URL: vendor.kasperlogistics.vercel.app
Supabase project: see .env for SUPABASE_URL

## Stack (NEVER deviate from this)

- Frontend: Vanilla JavaScript ES6+. NO React. NO Vue. NO Angular. NO Svelte. No framework.
- Styling: css/app.css ONLY. CSS custom properties. NO Tailwind. NO Bootstrap. NO external CSS libraries.
- Database: Supabase (Postgres + Auth + Storage + Realtime). ALL calls go through js/supabase.js helpers. Never write raw fetch() to Supabase URLs in page files.
- PDF generation: jsPDF via CDN. All logic in js/pdf.js. Never inline jsPDF in HTML pages.
- Maps: Leaflet.js via CDN. All GPS logic in js/gps.js. Never inline Leaflet in HTML pages.
- WhatsApp: wa.me deep links (Phase 1 — free, no API key). All link construction in js/whatsapp.js.
- Email: Resend (transactional only). Called from Supabase Edge Functions, never from frontend.
- Payments: Telr UAE. Payment link only at MVP — no embedded checkout.
- Deploy: vercel --prod. vercel.json handles routing.

## CSS design tokens (defined in css/app.css — use variables, not hardcoded values)

--bg: #0e0f0f
--surf: #161718
--surf2: #1c1e1f
--surf3: #232527
--gold: #F59E0B
--gold-dim: rgba(245,158,11,0.12)
--teal: #00D4C8
--teal-dim: rgba(0,212,200,0.1)
--green: #22C55E
--green-dim: rgba(34,197,94,0.1)
--red: #F43F5E
--red-dim: rgba(244,63,94,0.1)
--amber: #FB923C
--text: #F0EDE8
--text2: #9CA3AF
--border: rgba(255,255,255,0.07)
--border2: rgba(255,255,255,0.12)
--radius: 12px
--shadow: 0 4px 24px rgba(0,0,0,0.4)

Fonts:
- Body: DM Sans (Google Fonts)
- Monospace / codes / job IDs: Space Mono (Google Fonts)

## File ownership — strict module boundaries

Every category of logic lives in ONE place. Do not duplicate across files.

| What                  | Where             | Never in                        |
|-----------------------|-------------------|---------------------------------|
| Supabase calls        | js/supabase.js    | HTML pages, other JS files      |
| Auth / session        | js/auth.js        | HTML pages, supabase.js         |
| PDF generation        | js/pdf.js         | HTML pages                      |
| WhatsApp links        | js/whatsapp.js    | HTML pages                      |
| GPS push/subscribe    | js/gps.js         | HTML pages                      |
| Global styles         | css/app.css       | Inline style= (except dynamic)  |

## Page ownership — who can access what

| Page          | Who accesses it       | Auth mechanism                        |
|---------------|-----------------------|---------------------------------------|
| index.html    | Public                | None                                  |
| vendor.html   | Vendor (SaaS user)    | Supabase session — requireVendorAuth()|
| onboard.html  | New vendor            | Supabase OTP flow                     |
| ops.html      | Kasper admin only     | Supabase session + role check         |
| driver.html   | Driver                | Signed token in URL param ?t=         |
| track.html    | Client (anyone)       | job_code in URL — read-only           |
| approve.html  | Client                | job_code + sig hash in URL            |
| decline.html  | Client                | job_code in URL                       |
| book.html     | Client                | None — public booking form            |

## Security rules — CRITICAL, never violate

1. NEVER expose vendor_price to client-facing pages (approve.html, track.html, book.html).
2. NEVER expose vendor_price to driver-facing pages (driver.html).
   - quoted_price is what the client pays. vendor_price is Kasper's cost. They are DIFFERENT fields.
3. NEVER query jobs without vendor_id filter on vendor-authenticated pages.
4. NEVER trust URL params for auth. Always validate with Supabase session (vendor) or signed token (driver).
5. NEVER put the Supabase service_role key in any frontend file. Service role = Edge Functions only.
6. NEVER commit .env to git. .env.example is the only env file in the repo.
7. ALWAYS validate UAE TRN format on input: exactly 15 digits.

## Supabase conventions

Table names: plural snake_case — vendors, jobs, vendor_drivers, vendor_rfqs
Status pipeline (jobs.status): enquiry → quoted → accepted → rejected → assigned → in_transit → delivered → epod_pending → invoiced → paid
Timestamps: ALWAYS TIMESTAMPTZ. ALWAYS UTC. NEVER store local time.
Realtime: use Supabase channel subscriptions. NEVER poll with setInterval for live data.
Storage paths: vendors/{vendor_id}/jobs/{job_code}/{doc_type}.pdf
job_code format: KSP-{4 digit zero-padded number} e.g. KSP-0042

## PDF conventions

- Every PDF must include: vendor TRN, vendor company name, job_code, creation date, Kasper branding.
- All monetary values: show ex-VAT + 5% VAT line + total inc-VAT as separate line items.
- Currency format: AED 1,234.00 (always AED prefix, always 2 decimal places).
- Invoice number format: INV-{job_code} e.g. INV-KSP-0042

## Price convention

`quoted_price` in the jobs table is **ALWAYS stored as the total inc-VAT amount** (AED).

- Ex-VAT is always computed at display time: `price_ex_vat = quoted_price / 1.05`
- VAT amount is always computed: `vat_amount = quoted_price - price_ex_vat`
- The database has generated columns (`price_ex_vat`, `vat_amount`) that enforce this automatically.
- **Never store ex-VAT as a separate manually-set column.** The generated columns handle it.
- `vendor_price` follows the same convention — stored as inc-VAT.
- When displaying prices in PDFs or UI, always show three lines: Ex-VAT, 5% VAT, Total Inc-VAT.

## UI / UX rules

- Mobile-first: design at 375px viewport width. Test there before desktop.
- All modals: slide up from bottom. Max height 85vh. Internal scroll if content overflows.
- Loading: every async operation shows skeleton or spinner. Never blank screen during fetch.
- Errors: every fetch failure shows human-readable message + retry button. Never console.error silently.
- Empty states: every list view must have an empty state (icon + title + helpful description).
- Touch targets: minimum 44px height on all interactive elements.
- Active states: buttons scale(0.98) on :active. Smooth 150ms transition.
- No horizontal scroll at any viewport width.

## PWA requirements (vendor.html)

- manifest.json must exist in public/
- Service worker (public/sw.js) caches: vendor.html, css/app.css, js/*.js, public/icons/*
- "Add to Home Screen" must work on iOS Safari and Android Chrome
- App must be usable offline (cached shell). Data fetches show "offline" state gracefully.

## Forbidden patterns

- No alert() or confirm() — use custom modal components.
- No document.write().
- No jQuery or any library not listed in this file's stack section.
- No hardcoded colours in JS or HTML — always use CSS variables.
- No console.log() in production-intended code. Use console.error() for actual errors only.
- No CSS animations that loop infinitely on content (perf on low-end Android).
- No vendor-prefixed CSS properties.
- No placeholder/mock data in non-demo pages. All data from Supabase.
- No <form> submit that causes page reload — always preventDefault() and handle async.
- No synchronous localStorage reads on page load before DOMContentLoaded.

## Antigravity agent behaviour

- Always read this file AND the relevant JS module files before writing code for a page.
- Always run a local server (python -m http.server 8080 or npx serve .) and open the page in browser to test.
- Always check browser DevTools console for errors after implementation.
- Create one file at a time. Verify it works before moving to the next.
- If a Supabase migration is needed, write the SQL and apply it before writing the frontend code that depends on it.
- When in doubt about a design pattern, check how vendor.html implements it and match exactly.
