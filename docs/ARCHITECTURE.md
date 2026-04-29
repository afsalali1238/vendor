# ARCHITECTURE.md — Kasper Platform Technical Architecture

---

## Stack Overview

```
Frontend        Next.js 14 (App Router) — React, TypeScript strict
Hosting         Vercel (kasper.ae → Vercel DNS)
Database        Airtable Pro (operations database, single source of truth)
Automation      Make (formerly Integromat) — all trigger logic
Email           Resend (transactional email, React Email templates)
WhatsApp        Twilio (ops alerts only)
PDF generation  DocuSeal (Quote, PO, Delivery Note templates)
Invoicing       Zoho Books (auto-created from ePOD trigger)
Payments        Telr (UAE gateway, payment links per invoice)
GPS             Traccar self-hosted on DigitalOcean
Analytics       PostHog (conversion funnel tracking)
```

---

## Project Structure

```
kasper/
├── CLAUDE.md               AI behavioral rules
├── PRD.md                  Product requirements
├── ARCHITECTURE.md         This file
├── DATA_MODEL.md           Airtable tables + fields
├── AUTOMATION_MAP.md       Make scenarios
├── DESIGN_SYSTEM.md        Tokens, components, patterns
├── MEMORY.md               Project context for AI agents
├── WORKFLOW.md             Development workflow
├── SKILLS.md               Reusable AI skills
├── program.md              Agent program (autoresearch-style)
├── TESTING.md              Test criteria per feature
├── CHANGELOG.md            Version history
│
├── .agent/
│   ├── rules/
│   │   ├── kasper.md       Always-on Antigravity rules
│   │   └── graphify.md     Knowledge graph always-on rules
│   └── workflows/
│       ├── kasper-build.md Build workflow slash commands
│       └── graphify.md     /graphify slash command
│
├── graphify-out/           Generated knowledge graph (gitignored)
│   ├── GRAPH_REPORT.md
│   └── graph.json
│
└── src/
    ├── app/
    │   ├── page.tsx                    Homepage
    │   ├── approve/[jobId]/page.tsx    PO approval
    │   ├── track/page.tsx              Order tracking
    │   ├── decline/[jobId]/page.tsx    Decline/alternatives
    │   └── portal/page.tsx             Phase 2 placeholder
    │
    ├── components/
    │   ├── forms/
    │   │   ├── EquipmentEnquiryForm.tsx
    │   │   └── FreightBookingForm.tsx
    │   ├── tracking/
    │   │   ├── StatusTimeline.tsx
    │   │   ├── JobDetails.tsx
    │   │   ├── GPSEmbed.tsx
    │   │   ├── DocumentsBlock.tsx
    │   │   └── EPODBlock.tsx
    │   ├── equipment/
    │   │   └── EquipmentCard.tsx
    │   └── ui/
    │       ├── Navbar.tsx
    │       ├── Footer.tsx
    │       └── Button.tsx
    │
    ├── lib/
    │   ├── airtable.ts     Airtable read/write helpers
    │   ├── make.ts         Make webhook helpers
    │   └── utils.ts        Date formatting (UAE time), currency, job code
    │
    └── styles/
        └── globals.css     Design system tokens
```

---

## Data Flow

```
Customer form submit
        │
        ▼
Make Webhook (Scenario 1)
        │
        ├── Creates Airtable record (status: ENQUIRY)
        ├── Sends WhatsApp to ops
        └── Sends ACK email to customer

Ops in Airtable: changes status to QUOTED + enters price
        │
        ▼
Make Scenario 2
        │
        ├── DocuSeal generates Quote PDF
        └── Resend sends quote email with Approve link

Customer clicks Approve link → kasper.ae/approve/[jobId]
        │
        ▼
Next.js API route: POST /api/approve/[jobId]
        │
        ├── Validates job exists + quote not expired
        ├── Captures IP + timestamp
        ├── Updates Airtable status → CONFIRMED
        └── Fires Make Scenario 3
                │
                ├── Generates job_code (KSP-YYYYMMDD-XXXX)
                ├── DocuSeal generates PO PDF
                ├── Resend sends PO confirmation email (with job_code)
                └── WhatsApp alert to ops

Ops assigns driver + pastes Traccar link → changes status to IN_TRANSIT
        │
        ▼
Make Scenario 4
        └── Resend sends "in transit" email to customer

Ops changes status to DELIVERED
        │
        ▼
Make Scenario 5
        └── Resend sends ePOD request email

Customer goes to kasper.ae/track, enters job_code, submits ePOD
        │
        ▼
Next.js API route: POST /api/epod/[jobCode]
        │
        ├── Validates job exists + status = DELIVERED
        ├── Uploads photo to Airtable attachment
        ├── Saves signature URL
        ├── Sets epod_approved = TRUE
        └── Fires Make Scenario 6
                │
                ├── Zoho Books creates invoice
                ├── Telr generates payment link
                ├── DocuSeal generates Delivery Note
                ├── Resend sends Invoice + Delivery Note email
                └── WhatsApp alert to ops

Telr webhook (on payment)
        │
        ▼
Make Scenario 7
        └── Updates Airtable payment_status = PAID
```

---

## Airtable Integration

All Airtable reads are via the Airtable REST API using the `AIRTABLE_API_KEY`
and `AIRTABLE_BASE_ID` environment variables.

**Pattern for reads (Next.js server components):**
```typescript
// lib/airtable.ts
export async function getJob(identifier: string) {
  // identifier can be job_id (numeric) or job_code (KSP-...)
  const field = identifier.startsWith('KSP-') ? 'job_code' : 'RECORD_ID()'
  const formula = `{${field}} = "${identifier}"`
  // fetch from Airtable, return typed record or null
}
```

**Pattern for writes (API routes only — never from client):**
```typescript
// All Airtable writes happen in /api/* routes or via Make webhooks
// Never write to Airtable directly from client-side code
```

---

## Environment Variables

All required in `.env.local` for development, Vercel env for production:

```
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_JOBS_TABLE_ID=
AIRTABLE_EQUIPMENT_TABLE_ID=

MAKE_WEBHOOK_ENQUIRY=
MAKE_WEBHOOK_APPROVAL=
MAKE_WEBHOOK_EPOD=

NEXT_PUBLIC_BASE_URL=https://kasper.ae

# The following are used by Make, not Next.js directly:
# RESEND_API_KEY, DOCUSEAL_API_KEY, ZOHO_CLIENT_ID,
# ZOHO_CLIENT_SECRET, TELR_STORE_ID, TELR_AUTH_KEY,
# TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
```

---

## Key Technical Decisions

**Why Next.js App Router (not Pages Router):**
Server components fetch Airtable data at request time with no client-side
JS bundle overhead. The tracking page (`/track`) and approval page (`/approve/[jobId]`)
are almost entirely server-rendered.

**Why Airtable and not a database:**
Airtable is the ops team's control panel. They live in it. A separate database
would create a sync problem. Airtable IS the database AND the ops UI. This is
the right tradeoff for this scale.

**Why Make and not Zapier:**
Make has higher operation limits, supports multi-step conditional flows cleanly,
and the ePOD → invoice chain requires branching that Zapier handles poorly at this
price point.

**Why Traccar self-hosted and not a SaaS tracker:**
Every commercial GPS SaaS (Samsara, Webfleet) charges per vehicle/month at scale
and locks data behind their dashboard. Traccar is self-hosted, free, and generates
shareable iframe links per trip that can be embedded directly in the order page.

**Why Telr and not Stripe:**
Stripe UAE onboarding requires a non-UAE entity or a lengthy KYC process for
UAE LLCs. Telr is the clean local option, supports cards + Apple Pay, and is
already standard for UAE SMEs.

---

## Security Considerations

- The `/approve/[jobId]` page reads Airtable by job_id. The job_id is an
  Airtable record ID (opaque, 17 chars). A customer cannot enumerate jobs
  by guessing sequential IDs.
- The `/track` page reads Airtable by job_code. A customer cannot access
  another customer's data unless they know their job_code.
- The ePOD submission API validates: (1) job_code exists, (2) status = DELIVERED,
  (3) epod_approved is currently FALSE. Resubmission is blocked.
- Quote expiry is enforced on the approval page: if `quote_expiry_timestamp < now()`,
  the approval button is disabled and a message is shown.
- No customer PII is stored client-side (no localStorage, no cookies beyond
  session).

---

## Deployment

```
git push main → Vercel auto-deploys → kasper.ae
```

DNS: kasper.ae A record → Vercel IPs (76.76.21.21, 76.76.21.22)

Preview deployments are enabled for all PRs. Test using the staging Airtable
base before merging to main.
