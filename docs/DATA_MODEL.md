# DATA_MODEL.md — Kasper Airtable Data Model

All field names are exact. Make automations and Next.js code reference
fields by these exact names. Do not rename fields after initial setup.

---

## JOBS Table

Primary table. One record per customer enquiry (regardless of outcome).

| Field name | Type | Required | Notes |
|---|---|---|---|
| `job_id` | Autonumber | auto | Internal Airtable record ID. Used in approval/decline page URLs before job_code exists. |
| `job_code` | Single line text | set on CONFIRMED | Format: `KSP-YYYYMMDD-XXXX`. Sequential 4-digit suffix per day. Zero-padded. This is the customer-facing reference. |
| `status` | Single select | always | See Status Values below. |
| `service_type` | Single select | always | `EQUIPMENT_RENTAL` or `FREIGHT_BOOKING` |
| `customer_name` | Single line text | required | From enquiry form |
| `customer_email` | Email | required | All automated emails go here |
| `customer_phone` | Phone number | required | UAE format |
| `company_name` | Single line text | optional | From enquiry form |
| `equipment_type` | Single select | rental only | Boom Truck, Flatbed, Low-Bed, Generator, Other |
| `equipment_quantity` | Number | rental only | Number of units |
| `cargo_type` | Single select | freight only | Standard Container, Construction Materials, Oversized Machinery |
| `origin_address` | Long text | required | Full pickup address |
| `destination_address` | Long text | required | Full delivery/rental address |
| `service_date` | Date | required | Requested pickup date or rental start date |
| `rental_end_date` | Date | rental only | Equipment rental end date |
| `customer_notes` | Long text | optional | Special requirements from form |
| `enquiry_timestamp` | Date/time | auto | Set when record is created |
| `quoted_price_aed` | Currency | set by ops | Entered in Airtable before status → QUOTED |
| `quote_notes` | Long text | optional | Ops note included in quote email |
| `quote_sent_timestamp` | Date/time | auto | Set by Make Scenario 2 when quote email fires |
| `quote_expiry_timestamp` | Formula | auto | `= DATEADD({quote_sent_timestamp}, 48, 'hours')` |
| `quote_pdf_url` | URL | auto | DocuSeal-generated quote PDF. Set by Make Scenario 2. |
| `approval_timestamp` | Date/time | auto | Set by Next.js API route on approval click |
| `approval_ip` | Single line text | auto | Customer IP captured on approval |
| `po_pdf_url` | URL | auto | DocuSeal-generated PO PDF. Set by Make Scenario 3. |
| `driver_name` | Single line text | set by ops | After confirmation. Shows on tracking page. |
| `vehicle_plate` | Single line text | set by ops | UAE plate number. Shows on tracking page. |
| `traccar_link` | URL | set by ops | Pasted by ops. Shareable Traccar embed URL for this trip. Embedded as iframe when status = IN_TRANSIT. |
| `epod_approved` | Checkbox | auto | Set TRUE by Next.js API route on ePOD submission. Triggers Make Scenario 6. |
| `epod_timestamp` | Date/time | auto | Set when ePOD submitted |
| `epod_photo_url` | URL | auto | Airtable attachment URL for ePOD delivery photo |
| `epod_signature_url` | URL | auto | URL of signature canvas image |
| `epod_notes` | Long text | optional | Delivery condition notes from customer |
| `invoice_number` | Single line text | auto | From Zoho Books. Set by Make Scenario 6. |
| `invoice_pdf_url` | URL | auto | Zoho Books invoice PDF link |
| `delivery_note_pdf_url` | URL | auto | DocuSeal Delivery Note PDF link |
| `payment_link` | URL | auto | Telr payment link. Set by Make Scenario 6. |
| `payment_status` | Single select | auto | `UNPAID`, `PAID`, `PARTIAL`. Updated by Telr webhook via Make Scenario 7. |
| `payment_timestamp` | Date/time | auto | Set when Telr confirms payment |

### Status Values (JOBS.status)

Order is fixed. One-directional. No backward transitions.

```
ENQUIRY        Customer submitted form. Record created.
QUOTED         Ops sent quote email. quote_sent_timestamp set.
DECLINED       Ops marked not available. Decline email sent.
CONFIRMED      Customer approved quote. job_code generated.
ASSIGNED       Ops assigned driver + vehicle. driver_name populated.
IN_TRANSIT     Truck departed. traccar_link active.
DELIVERED      Driver confirmed delivery. ePOD request sent.
EPOD_APPROVED  Customer signed off delivery. Invoice chain started.
INVOICED       Zoho invoice created. Invoice email sent.
PAID           Telr payment confirmed.
```

---

## EQUIPMENT Table

Equipment catalogue. Shown on homepage and used for availability checks.

| Field name | Type | Notes |
|---|---|---|
| `equipment_name` | Single line text | e.g. "Heavy Boom Truck 10T" |
| `equipment_type` | Single select | Must match `JOBS.equipment_type` values exactly |
| `specs` | Long text | Capacity, lifting height, etc. Free text. |
| `daily_rate_aed` | Currency | Published rate shown on homepage card |
| `availability_status` | Single select | `AVAILABLE`, `BOOKED`, `MAINTENANCE`, `COMING_SOON` |
| `next_available_date` | Date | If BOOKED, when it's next free. Shown to customer. |
| `photo_url` | URL | Image shown on homepage equipment card |
| `traccar_device_id` | Single line text | Traccar device ID. Used to look up a shared link for this vehicle. |

---

## Airtable Interface (Ops Dashboard)

Built using Airtable Interfaces (no-code). The ops team sees this, not a custom UI.

**Required views:**

1. **Incoming Enquiries** — Gallery or list view filtered to `status = ENQUIRY`, sorted by `enquiry_timestamp` descending. Ops sees new jobs here.

2. **Send Quote form** — Airtable Interface form, pre-filled from job record.
   Editable fields: `quoted_price_aed`, `quote_notes`.
   Read-only: all customer + job fields.
   Submit button triggers Airtable automation that changes `status → QUOTED`.

3. **Active Jobs** — Kanban view: columns = CONFIRMED, ASSIGNED, IN_TRANSIT, DELIVERED.
   Ops drags cards to update status.

4. **All Jobs** — Full table view, filterable by date range, status, service type.

**Airtable Automations (within Airtable, separate from Make):**

- When `status` changes to `QUOTED`: verify `quoted_price_aed` is not empty.
  If empty: do not allow change, show error "Price required before sending quote."
- When `status` changes to `CONFIRMED`: prevent if `approval_timestamp` is empty
  (manual override protection — should only change via API route).

---

## Notes on Field Naming

- All field names use `snake_case`.
- All field names are lowercase.
- `_timestamp` suffix = Date/time type.
- `_url` suffix = URL type.
- `_aed` suffix = Currency type (AED).
- `_pdf_url` = URL pointing to a PDF file.

Never rename these fields after the first Airtable base is created. Make
automations and Next.js code will break. If a field must be renamed, update
all references in `AUTOMATION_MAP.md`, all Make scenarios, and all
`lib/airtable.ts` helpers simultaneously.
