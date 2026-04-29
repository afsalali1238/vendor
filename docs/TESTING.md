# TESTING.md — Kasper Test Criteria

Every feature has a checklist. A feature is not done until every item passes.
"It should work" is not a test.

---

## Equipment Enquiry Form

```
[ ] Form renders at 375px (mobile)
[ ] Form renders at 1440px (desktop)
[ ] Equipment type pre-fills when user clicks Book on an equipment card
[ ] All required fields show validation error if left empty on submit
[ ] Email field rejects non-email format
[ ] Phone field accepts UAE format (+971...) and local (05...)
[ ] Rental end date cannot be before rental start date
[ ] Submit fires POST to Make webhook with all fields
[ ] Airtable JOBS record created with correct field values:
    - status = ENQUIRY
    - service_type = EQUIPMENT_RENTAL
    - enquiry_timestamp populated
[ ] Customer sees inline confirmation message (no page redirect)
[ ] Ops receives WhatsApp within 30 seconds
[ ] Customer receives ENQUIRY_ACK email within 60 seconds
```

## Freight Booking Form

```
[ ] Same general form tests as above
[ ] service_type = FREIGHT_BOOKING in Airtable
[ ] Origin and destination emirate dropdowns contain all 8 UAE emirates
[ ] Cargo type dropdown has 3 options (Standard Container, Construction Materials, Oversized Machinery)
[ ] Dynamic location row appears for non-container cargo types
```

## PO Approval Page (/approve/[jobId])

```
[ ] Valid jobId: page renders with job summary
[ ] Invalid jobId: page shows "This link is invalid" (not a 500 error)
[ ] Expired quote (>48h since quote_sent_timestamp): approval button disabled, expiry message shown
[ ] Valid + non-expired: approval button enabled
[ ] Quote PDF renders inline as embedded viewer
[ ] Click Approve:
    - approval_timestamp set in Airtable
    - approval_ip captured
    - status → CONFIRMED
    - Make Scenario 3 fires
    - Confirmation message shown to customer (not a blank page, not a redirect)
[ ] Job code email received within 60 seconds of approval
[ ] PO PDF attached to that email
[ ] Double-click protection: second click within 5 seconds does not fire second approval
```

## Order Tracking Page (/track)

### Search screen
```
[ ] Renders at 375px
[ ] Input accepts KSP-YYYYMMDD-XXXX format
[ ] Enter key triggers search
[ ] Empty search: "Please enter a job code" validation
```

### Job found — status timeline
```
[ ] All 9 statuses render in correct order
[ ] Status ENQUIRY: step 1 active, all others pending
[ ] Status QUOTED: steps 1–2 complete, step 3 active
[ ] Status CONFIRMED: steps 1–3 complete
[ ] Status IN_TRANSIT: steps 1–5 complete, step 5 active
[ ] Status DELIVERED: steps 1–6 complete
[ ] Status EPOD_APPROVED: steps 1–7 complete
[ ] Status INVOICED: steps 1–8 complete
[ ] Status PAID: all 9 complete
[ ] Completed steps show timestamp in UAE time (GST)
[ ] Active step highlighted in teal
[ ] Pending steps greyed out
```

### Job found — GPS embed
```
[ ] GPS section hidden when status ≠ IN_TRANSIT
[ ] GPS section hidden when traccar_link is empty
[ ] GPS section shows "Live tracking will appear here..." when status < IN_TRANSIT
[ ] GPS iframe renders when status = IN_TRANSIT AND traccar_link populated
[ ] Iframe is responsive (aspect-ratio 16:9)
```

### Job found — documents
```
[ ] Quote PDF link appears after status = QUOTED
[ ] PO PDF link appears after status = CONFIRMED
[ ] Delivery Note link appears after status = EPOD_APPROVED
[ ] Invoice PDF link appears after status = INVOICED
[ ] Pay Now button appears when status = INVOICED AND payment_status = UNPAID
[ ] All document links open in new tab
[ ] Pay Now links to payment_link value from Airtable
```

### ePOD block
```
[ ] ePOD block hidden when status ≠ DELIVERED
[ ] ePOD block hidden when epod_approved = TRUE (already signed)
[ ] Photo upload accepts jpg, png, webp only (rejects pdf, gif)
[ ] Photo upload rejects files > 10MB
[ ] Signature pad works with mouse on desktop
[ ] Signature pad works with finger on iOS Safari
[ ] Signature pad works with finger on Android Chrome
[ ] Signature pad minimum height 200px on 375px screen
[ ] Clear signature button works
[ ] Cannot submit without photo (validation error)
[ ] Cannot submit without signature (validation error)
[ ] On submit:
    - epod_photo_url stored in Airtable
    - epod_signature_url stored in Airtable
    - epod_notes stored (if entered)
    - epod_approved = TRUE
    - epod_timestamp set
    - Make Scenario 6 fires
[ ] After successful submit: ePOD block replaced with confirmation + timestamp
[ ] Reloading page after ePOD approval shows read-only confirmation (not the form)
```

### Job not found
```
[ ] Shows clean error message (not a 500)
[ ] Shows ops contact email + WhatsApp link
[ ] Search input remains populated
```

## Make Scenario 6 (ePOD → Invoice chain)

```
[ ] Trigger fires within 10 seconds of epod_approved = TRUE
[ ] Zoho Books invoice created with correct:
    - customer email
    - line item description
    - amount in AED
    - invoice number generated
[ ] Telr payment link generated
[ ] DocuSeal delivery note PDF generated with:
    - ePOD photo embedded
    - signature image embedded
    - delivery timestamp in UAE time
[ ] Airtable updated:
    - invoice_number populated
    - invoice_pdf_url populated
    - delivery_note_pdf_url populated
    - payment_link populated
    - status → INVOICED
[ ] Invoice email arrives within 90 seconds of ePOD submission
[ ] Email has both PDFs attached (invoice + delivery note)
[ ] Email has Pay Now button linking to Telr payment link
[ ] Ops receives WhatsApp notification
```

## Mobile Responsiveness (applies to all pages)

```
[ ] 375px iPhone SE: no horizontal overflow
[ ] 375px: all tap targets minimum 44px height
[ ] 375px: form fields legible, labels readable
[ ] 768px: layout shifts correctly to tablet breakpoints
[ ] 1440px: max-width constraint prevents content from stretching too wide
```

## Design System Compliance

```
[ ] No colour values outside DESIGN_SYSTEM.md tokens
[ ] No fonts other than Space Mono (headings) and IBM Plex Sans (body)
[ ] Job codes display in Space Mono, teal, large
[ ] All primary CTAs use --accent-teal (#1D9E75)
[ ] All warnings/badges use --alert-amber (#BA7517)
[ ] All timestamps display in UAE time (GST, UTC+4)
[ ] All amounts display as "AED X,XXX" format
```

## Security

```
[ ] /approve/[jobId] returns 404 for non-existent jobId
[ ] /track: job A's data is not accessible by entering job B's code
[ ] /api/epod/[jobCode]: rejects if status ≠ DELIVERED
[ ] /api/epod/[jobCode]: rejects if epod_approved = TRUE (idempotent)
[ ] /api/approve/[jobId]: rejects if quote expired
[ ] /api/approve/[jobId]: second approval on same job returns success but does not re-fire scenario
[ ] No environment variables logged to console
[ ] No customer PII in client-side localStorage
```
