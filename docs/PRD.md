# PRD.md — Kasper Platform Product Requirements

**Product:** Kasper Digital Iron Logistics  
**URL:** kasper.ae  
**Build platform:** Antigravity  
**Version:** 1.0 (Phase 1 — MVP)  
**Last updated:** April 2026

---

## 1. Problem Statement

Kasper operates heavy equipment rental and freight logistics across UAE. Today,
every order flows through phone calls and WhatsApp messages. There is no digital
record of quotes, no auditable approval chain, and no customer-facing status
tracking. This creates three real problems:

1. Ops team spends 30–60 minutes per enquiry on back-and-forth communication.
2. Quote disputes arise because nothing is documented at approval time.
3. Customers have no visibility between booking and delivery.

---

## 2. What We Are Building

A customer-facing logistics platform with two service lines:

- **Equipment Rental** — cranes, boom trucks, flatbeds, low-beds, generators
- **Freight Booking** — truck runs across UAE (Khor Fakkan, Fujairah, Jebel Ali, Dubai, Abu Dhabi)

The platform covers the full commercial lifecycle: enquiry → quote → approval →
order tracking → ePOD → invoice. Every step is digital, auditable, and requires
zero phone calls to complete.

---

## 3. Users

**Customer (primary):** Construction companies, freight managers, logistics coordinators.
UAE-based. Comfortable with web forms and email. Does not want to create an account.
Needs a fast quote and visibility over their order.

**Kasper Ops (internal):** 2–3 people. Working from phone and desktop. Receives
new enquiries on WhatsApp. Quotes from Airtable. Tracks jobs. Updates status.
Must be able to send a quote in under 2 minutes.

---

## 4. Pages

### PAGE 1 — Homepage (kasper.ae)

**Goal:** Convert visitor to submitted enquiry.

**Sections (required, in order):**

1. **Navbar** — Logo, Equipment Rental, Freight Booking, Tech & Tracking,
   Contracts, `[Track Your Order]` CTA button, `[Client Portal]` button
   (disabled, Phase 2 placeholder)

2. **Hero** — Headline "DIGITAL IRON", subheadline, two primary CTAs:
   "Book Freight" (scrolls to freight form), "Search Equipment" (scrolls to
   equipment section). Capacity availability badge (amber).

3. **Equipment Marketplace** — Filterable grid. Cards show: equipment name,
   specs, availability badge, daily rate in AED, `[Book]` button.
   `[Book]` pre-fills the enquiry form with that equipment type.

4. **Freight Booking** — Inline form (left) + published rate card table (right).

5. **Technology & Tracking** — Feature callouts: GPS live tracking, ePOD,
   digital audit trail.

6. **Capacity Contracts** — Brief description + contact CTA.

7. **Footer** — Legal, contact, emirate coverage.

**Equipment enquiry form fields:**
- Equipment type (pre-fillable, dropdown: Boom Truck, Flatbed, Low-Bed, Generator, Other)
- Quantity (number, default 1)
- Rental start date (date picker)
- Rental end date (date picker)
- Pickup/delivery address (text)
- Contact name (text, required)
- Email (email, required)
- Phone (tel, required, UAE format)
- Company name (text, optional)
- Special notes (textarea, optional)

**Freight booking form fields:**
- Origin emirate (dropdown: Khor Fakkan, Fujairah, Jebel Ali, Dubai, Sharjah, Abu Dhabi, RAK, UAQ)
- Origin address (text)
- Destination emirate (dropdown, same list)
- Destination address (text)
- Cargo type (dropdown: Standard Container, Construction Materials, Oversized Machinery)
- Pickup date (date picker)
- Weight/volume (text, optional)
- Contact name, email, phone, company (same as above)
- Notes (textarea, optional)

**On form submit:** POST to Make webhook. Customer sees inline
confirmation: "Request received. Job reference will be emailed within 30 minutes."
No page redirect.

---

### PAGE 2 — PO Approval (kasper.ae/approve/[JOB_ID])

**Goal:** Legal moment of order confirmation. Generates the Purchase Order.

**Reached by:** clicking "Approve Quote" button in the quote email only.

**Content:**
- Kasper brand header
- Quote summary block: job ref, service type, equipment/route, quoted price (AED, large text), terms, validity countdown
- Embedded quote PDF viewer (inline, from `quote_pdf_url` in Airtable)
- Customer name and company (read-only, pulled from Airtable by job_id URL param)
- **Expiry check:** If `quote_expiry_timestamp` < now(), show "This quote has expired.
  Contact ops to request a new quote." Block the approval button.
- Single large CTA: "I APPROVE THIS QUOTE AND CONFIRM THE ORDER"
- Secondary text link: "Request a change or decline" (opens pre-filled email to ops)

**On approval click:**
1. Capture timestamp + IP
2. POST to Make webhook (triggers Scenario 3)
3. Show confirmation: "Order confirmed. Your job code and tracking link have
   been sent to [email]. Check spam if you don't see it within 5 minutes."

---

### PAGE 3 — Order Tracking (kasper.ae/track)

**Goal:** Customer self-service status page. Functions like Aramex/FedEx tracking.

**Step 1 — Search screen:**
Single input: "Enter your Job Code (e.g. KSP-20260416-0042)" + Track button.
No login required.

**Step 2 — Job found:**

**A. Status Timeline** (top, prominent)
- Visual horizontal step-by-step progress indicator
- 9 statuses: Enquiry Received → Quoted → Confirmed → Driver Assigned →
  In Transit → Delivered → ePOD Approved → Invoiced → Paid
- Active status: highlighted teal (#1D9E75)
- Completed: green tick + timestamp (UAE time)
- Pending: greyed out

**B. Job Details**
- Job code, service type, pickup address, delivery address, equipment type
  (rental) or cargo type (freight), scheduled date, driver name + vehicle
  plate (once assigned — do not show if empty)

**C. Live GPS** (visible only when `status = IN_TRANSIT` AND `traccar_link` is populated)
- Embedded Traccar iframe
- `src` = `traccar_link` from Airtable record
- If not in transit: "Live tracking will appear here once your vehicle is en route."

**D. Documents**
- Quote PDF — downloadable (show after QUOTED)
- Purchase Order PDF — downloadable (show after CONFIRMED)
- Delivery Note PDF — downloadable (show after EPOD_APPROVED)
- Invoice PDF — downloadable (show after INVOICED). Include Pay Now button
  linking to `payment_link` if `payment_status = UNPAID`.

**E. ePOD Sign-Off** (visible only when `status = DELIVERED` AND `epod_approved = FALSE`)
- Heading: "Confirm Delivery Receipt"
- Photo upload (accepts jpg, png, webp, max 10MB)
- Signature pad (HTML5 canvas, finger/mouse)
- Condition notes (textarea, optional)
- CTA: "APPROVE DELIVERY & SIGN OFF"
- On submit: POST to Make webhook (triggers Scenario 6 chain)
- After submit: block replaced with "Delivery confirmed at [timestamp]. Thank you."
  Show uploaded photo thumbnail.

**Step 3 — Code not found:**
"We couldn't find a job with that code. Please check the confirmation email you
received, or contact us: [ops email] | [ops WhatsApp link]"

---

### PAGE 4 — Decline / Alternatives (kasper.ae/decline/[JOB_ID])

**Goal:** Soft landing for a declined enquiry. Preserve conversion opportunity.

**Content:**
- "We were unable to fulfill this specific request."
- Shows what was requested (pulled from Airtable by job_id)
- "Here is what's currently available:" → live equipment availability grid
  (same component as homepage, filtered to AVAILABLE only)
- "Submit a new request" CTA (scrolls to / links to homepage form)

---

### PAGE 5 — 404 / Error

Branded 404. Kasper logo, "This page doesn't exist or has expired",
links: homepage, track page.

---

### PAGE 6 — Client Portal (kasper.ae/portal) — PHASE 2 ONLY

**Do not build in Phase 1.** Render a placeholder: "Client portal coming soon.
Track your current orders at kasper.ae/track"

---

## 5. Out of Scope for Phase 1

The following are explicitly not in scope and must not be built:

- User registration, login, sessions, or authentication of any kind
- Multi-currency support
- Arabic language support
- Push notifications or SMS (WhatsApp alerts to ops only)
- A blog, news section, or content management system
- Customer reviews or ratings
- Fleet management for ops (vehicle maintenance, driver scheduling)
- Mobile app (web only, must be mobile-responsive)
- Recurring order / subscription functionality
- Integration with any ERP or TMS system
- Live chat widget

---

## 6. Non-Functional Requirements

- **Mobile-first responsive.** Every page must work on a 375px iPhone screen.
  The tracking page ePOD signature pad must work with finger on mobile.
- **Page load.** LCP under 2.5 seconds on a UAE mobile connection (4G).
- **UAE time.** All timestamps displayed as GST (UTC+4). No selector.
- **Currency.** AED only. Format: "AED 1,800" (no commas for < 10k, commas for ≥ 10k).
- **Accessibility.** WCAG 2.1 AA minimum. Forms must work with screen readers.
- **Security.** Quote approval page validates job_id is real before rendering.
  ePOD submission validates job_code is real and status = DELIVERED before accepting.
  No customer can view another customer's job details.

---

## 7. Success Metrics (Phase 1)

- Ops time to send quote: < 2 minutes from WhatsApp notification to quote sent
- Customer can access tracking page with job code: < 30 seconds
- ePOD to invoice email: < 90 seconds after customer submission
- Zero phone calls required to complete a standard order
- Zero manual invoice creation

---

## 8. Phase 2 Scope (future — do not build now)

- Client Portal with authenticated login, job history, reorder
- Automated quote pricing (rate card engine)
- Driver mobile app for status updates
- Fleet availability calendar
- Contract billing (monthly invoicing for capacity customers)
