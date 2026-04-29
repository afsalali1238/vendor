# AUTOMATION_MAP.md — Kasper Make Automation Scenarios

7 scenarios cover the entire platform lifecycle. Build them in numerical order.
Test each scenario end-to-end before building the next.

Every scenario is defined with: Trigger → Conditions → Actions (numbered, ordered).

---

## Scenario 1 — New Enquiry → Ops Alert + Customer ACK

**Trigger:** Webhook POST to `MAKE_WEBHOOK_ENQUIRY`
(fired by Next.js after form submission writes to Airtable)

**Conditions:** None. Fire on every webhook call.

**Actions:**
1. Parse webhook body: `job_id`, `customer_name`, `service_type`, `service_date`, `origin_address`, `equipment_type`, `customer_email`
2. Set `enquiry_timestamp = now()` on the Airtable JOBS record (update by `job_id`)
3. Send Twilio WhatsApp message to ops number:
   ```
   NEW ENQUIRY
   Customer: {{customer_name}}
   Service: {{service_type}}
   Date: {{service_date}}
   Ref: {{job_id}}
   Open Airtable to review →
   ```
4. Send Resend email to `{{customer_email}}` using template `ENQUIRY_ACK`:
   Variables: `customer_name`, `service_type`, `service_date`, `job_id`

**Failure handling:** If Airtable update fails, still send WhatsApp. Log error.

---

## Scenario 2 — Ops Sends Quote

**Trigger:** Airtable automation webhook — `status` changes to `QUOTED` on JOBS record

**Conditions:** `quoted_price_aed` must be non-empty. If empty, log error and stop.

**Actions:**
1. Fetch full job record from Airtable by record ID
2. Set `quote_sent_timestamp = now()`
3. Call DocuSeal API — generate Quote PDF from template `QUOTE_TEMPLATE`:
   ```
   Variables to pass:
   - customer_name, company_name, customer_email
   - job_id, service_type, service_date
   - origin_address, destination_address
   - equipment_type (if rental), cargo_type (if freight)
   - quoted_price_aed
   - quote_sent_timestamp, quote_expiry (= +48h)
   - customer_notes
   ```
   Store returned PDF URL in `quote_pdf_url` (update Airtable)
4. Send Resend email to `{{customer_email}}` using template `QUOTE_EMAIL`:
   Variables: `customer_name`, `service_type`, `service_date`, `quoted_price_aed`,
   `quote_pdf_url`, `quote_expiry_timestamp`,
   `approve_link = "https://kasper.ae/approve/{{job_id}}"`

**Failure handling:** If DocuSeal fails, send Resend email without PDF attachment
but include a note: "Your quote PDF is being prepared and will follow shortly."
Alert ops via WhatsApp.

---

## Scenario 3 — Customer Approves Quote → PO + Job Code

**Trigger:** Webhook POST to `MAKE_WEBHOOK_APPROVAL`
(fired by Next.js `/api/approve/[jobId]` route after writing approval_timestamp to Airtable)

**Conditions:** `approval_timestamp` must be non-empty. `status` must be `CONFIRMED`.

**Actions:**
1. Fetch full job record from Airtable
2. Generate `job_code`:
   - Format: `KSP-{{YYYYMMDD}}-{{XXXX}}`
   - YYYYMMDD = today in UAE time (UTC+4)
   - XXXX = count of CONFIRMED records today + 1, zero-padded to 4 digits
   - Write `job_code` to Airtable record
3. Call DocuSeal API — generate PO PDF from template `PO_TEMPLATE`:
   ```
   Variables: all job fields + quoted_price_aed + approval_timestamp + approval_ip + job_code
   ```
   Store URL in `po_pdf_url`
4. Send Resend email to `{{customer_email}}` using template `PO_CONFIRMATION`:
   Variables: `customer_name`, `job_code`, `service_type`, `service_date`,
   `quoted_price_aed`, `po_pdf_url`, tracking_link = `"https://kasper.ae/track"`
5. Send Resend email to ops email using same template `PO_CONFIRMATION`
6. Send Twilio WhatsApp to ops:
   ```
   ORDER CONFIRMED
   Job: {{job_code}}
   Customer: {{customer_name}}
   Service: {{service_type}}
   Date: {{service_date}}
   AED: {{quoted_price_aed}}
   ```

---

## Scenario 4 — Status → IN_TRANSIT → Notify Customer

**Trigger:** Airtable automation webhook — `status` changes to `IN_TRANSIT`

**Conditions:** `driver_name` and `vehicle_plate` should be populated.
If empty, send email anyway but omit driver section.

**Actions:**
1. Fetch job record from Airtable
2. Send Resend email to `{{customer_email}}` using template `IN_TRANSIT`:
   Variables: `customer_name`, `job_code`, `driver_name`, `vehicle_plate`,
   tracking_link = `"https://kasper.ae/track"`

---

## Scenario 5 — Status → DELIVERED → ePOD Request

**Trigger:** Airtable automation webhook — `status` changes to `DELIVERED`

**Actions:**
1. Fetch job record from Airtable
2. Send Resend email to `{{customer_email}}` using template `EPOD_REQUEST`:
   Variables: `customer_name`, `job_code`,
   tracking_link = `"https://kasper.ae/track"` (with instruction to enter code)

---

## Scenario 6 — ePOD Approved → Invoice + Delivery Note (THE CRITICAL CHAIN)

**Trigger:** Webhook POST to `MAKE_WEBHOOK_EPOD`
(fired by Next.js `/api/epod/[jobCode]` route after setting `epod_approved = TRUE`)

**Conditions:** `epod_approved = TRUE`. `status = DELIVERED`.
If conditions not met, log and stop — do not generate invoice.

**Actions (order is critical — do not reorder):**
1. Fetch full job record from Airtable
2. **Zoho Books — Create Invoice:**
   ```
   customer_name, customer_email → find or create Zoho contact
   invoice_date = today
   line item: {{service_type}} — {{service_date}} | qty 1 | amount: {{quoted_price_aed}}
   payment_terms: Net 14
   ```
   Store `invoice_number` and `invoice_pdf_url` from response → write to Airtable
3. **Telr — Generate payment link:**
   ```
   amount = quoted_price_aed
   currency = AED
   description = "Kasper {{job_code}}"
   customer_email = {{customer_email}}
   ```
   Store `payment_link` → write to Airtable
4. **DocuSeal — Generate Delivery Note:**
   Template `DELIVERY_NOTE_TEMPLATE`:
   ```
   job_code, customer_name, service_date, destination_address,
   driver_name, vehicle_plate, epod_timestamp,
   epod_photo_url, epod_signature_url, epod_notes
   ```
   Store `delivery_note_pdf_url` → write to Airtable
5. Update Airtable: `status → INVOICED`
6. Send Resend email to `{{customer_email}}` using template `INVOICE_EMAIL`:
   Attachments: `invoice_pdf_url`, `delivery_note_pdf_url`
   Variables: `customer_name`, `job_code`, `quoted_price_aed`,
   `invoice_number`, `payment_link`
7. Send Twilio WhatsApp to ops:
   ```
   INVOICE SENT
   Job: {{job_code}}
   Customer: {{customer_name}}
   Amount: AED {{quoted_price_aed}}
   Invoice: {{invoice_number}}
   ```

**Failure handling:** If Zoho Books call fails, alert ops via WhatsApp immediately.
Do not send invoice email. Retry once after 2 minutes. Log failure in Airtable
`ops_notes` field.

---

## Scenario 7 — Payment Confirmed

**Trigger:** Telr payment webhook POST to Make

**Conditions:** Telr `status = paid`. Match `job_code` from webhook to Airtable.

**Actions:**
1. Find Airtable JOBS record where `job_code` matches Telr order reference
2. Update: `payment_status → PAID`, `payment_timestamp = now()`
3. Update: `status → PAID`
4. Send Twilio WhatsApp to ops:
   ```
   PAYMENT RECEIVED
   Job: {{job_code}}
   Amount: AED {{quoted_price_aed}}
   ```

---

## Email Templates (Resend)

7 templates. All use Kasper design system: `#0D1B2A` header, `#1D9E75` CTAs,
Space Mono headings, IBM Plex Sans body.

| Template ID | Subject | Primary CTA |
|---|---|---|
| `ENQUIRY_ACK` | We received your request | None (informational) |
| `QUOTE_EMAIL` | Your Kasper Quote — [service] on [date] | APPROVE QUOTE (→ approve page) |
| `DECLINE_EMAIL` | Re: Your Kasper Request | View Alternatives (→ decline page) |
| `PO_CONFIRMATION` | Order Confirmed — [JOB_CODE] | Track Your Order (→ track page) |
| `IN_TRANSIT` | Your order is now in transit — [JOB_CODE] | Live Tracking (→ track page) |
| `EPOD_REQUEST` | Delivery arrived — please sign off [JOB_CODE] | Sign Off Delivery (→ track page) |
| `INVOICE_EMAIL` | Invoice & Delivery Note — [JOB_CODE] | PAY NOW (→ payment_link) |

---

## PDF Templates (DocuSeal)

3 templates. Build in DocuSeal UI before any Make scenarios are built.

| Template ID | Purpose | Key variable |
|---|---|---|
| `QUOTE_TEMPLATE` | Formal quote document | `quoted_price_aed` |
| `PO_TEMPLATE` | Purchase Order with approval stamp | `approval_timestamp`, `approval_ip`, `job_code` |
| `DELIVERY_NOTE_TEMPLATE` | Delivery confirmation with ePOD | `epod_signature_url`, `epod_photo_url` |

---

## WhatsApp Number Format

All Twilio WhatsApp messages go to a single ops number defined in Make as a
constant. Format: `whatsapp:+971XXXXXXXXX`

Customer WhatsApp messages are not in scope for Phase 1.
