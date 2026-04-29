# WORKFLOW.md — Kasper Development Workflow

How to develop, test, and ship features on this project.
This workflow is designed for Antigravity as the build platform.

---

## 1. Before Starting Any Task

**Always read these files first, in this order:**

1. `MEMORY.md` — current build state, open questions, past decisions
2. Relevant spec file (`PRD.md` for features, `DATA_MODEL.md` for DB work,
   `AUTOMATION_MAP.md` for automation work)
3. `DESIGN_SYSTEM.md` if building any UI

If the task is ambiguous, **stop and clarify before writing code**.
Name the ambiguity explicitly. Do not silently resolve it.

---

## 2. Development Phases

Work strictly in phase order. Do not jump ahead.

### Phase 1 — Core Flow (Weeks 1–2)

**Goal:** A customer can submit an enquiry, ops can send a quote in one click,
and the customer can approve to generate a job code.

**Steps (in order):**

```
1. Airtable setup
   - Create JOBS table with all fields from DATA_MODEL.md
   - Create EQUIPMENT table
   - Create Airtable automations for status change → Make webhook triggers
   Verify: All fields exist with correct types. No extra fields.

2. Make Scenario 1
   - Build enquiry → ops alert + customer ACK scenario
   Verify: Submit test form → Airtable record created → WhatsApp received → email received

3. Homepage (kasper.ae)
   - Build all sections per PRD.md Page 1 spec
   - Wire both forms to Make webhook
   Verify: Form submits → confirmation message shows → Scenario 1 fires

4. PO Approval page (kasper.ae/approve/[jobId])
   - Reads job data from Airtable by jobId URL param
   - Renders quote summary + embedded PDF
   - Approval button POSTs to /api/approve/[jobId]
   Verify: Expired quote shows error. Valid quote renders. Approval fires.

5. Make Scenarios 2 + 3
   - Quote send + PO generation scenarios
   - DocuSeal QUOTE_TEMPLATE + PO_TEMPLATE built
   Verify: Ops changes status to QUOTED → quote email arrives → Approve click → job code email arrives

6. Resend email templates
   - Build ENQUIRY_ACK, QUOTE_EMAIL, PO_CONFIRMATION
   Verify: All three emails render correctly in mobile email clients

7. End-to-end Phase 1 test (3 full runs)
   - Run test as: (a) equipment rental, (b) freight booking, (c) expired quote
```

### Phase 2 — Tracking Page (Week 3)

**Goal:** Customer can track their order with a job code from enquiry to delivery.

**Steps:**

```
1. Order Tracking page (kasper.ae/track)
   - Search screen
   - Job found: status timeline, job details, GPS embed, documents, ePOD block
   - Not found: error state
   Verify: All 9 status values render correctly on timeline.
           GPS embed only shows on IN_TRANSIT with traccar_link populated.
           ePOD block only shows on DELIVERED with epod_approved = FALSE.
           Expired ePOD (already approved) shows read-only confirmation.

2. ePOD submission
   - Photo upload
   - Signature canvas (mobile finger-friendly)
   - POST to /api/epod/[jobCode]
   Verify: Photo stores, signature stores, epod_approved = TRUE in Airtable.

3. Make Scenario 5 (delivery → ePOD request email)
   Verify: Status → DELIVERED → EPOD_REQUEST email arrives

4. End-to-end Phase 2 test
   - Manually walk a job from CONFIRMED to DELIVERED
   - Submit ePOD → verify Airtable updated correctly
```

### Phase 3 — Invoice Loop (Week 4)

**Goal:** ePOD approval automatically generates and sends invoice + delivery note.

**Steps:**

```
1. Zoho Books setup
   - Create UAE org, AED currency, VAT configured
   - Build invoice template
   - Obtain API credentials

2. Telr account approval (STARTED ON DAY 1 — this takes 3–7 days)
   - UAE trade license submitted
   - API credentials obtained

3. DocuSeal DELIVERY_NOTE_TEMPLATE

4. Make Scenario 6 (the critical chain)
   - Zoho invoice creation
   - Telr payment link
   - DocuSeal delivery note
   - Invoice email
   Verify: ePOD submitted → within 90 seconds → invoice email in inbox with both PDFs attached

5. Make Scenario 7 (payment confirmed)
   Verify: Telr test payment → Airtable payment_status = PAID

6. INVOICE_EMAIL, EPOD_REQUEST templates in Resend

7. End-to-end Phase 3 test (3 full runs)
```

### Phase 4 — Polish & Launch (Week 5)

```
1. Make Scenario 4 (IN_TRANSIT email)
2. Decline page (kasper.ae/decline/[jobId])
3. 404 page
4. PostHog analytics (track form submit, quote viewed, approval, ePOD, payment)
5. Traccar on DigitalOcean (install, configure, test GPS embed)
6. 10 GPS units installed in trucks (Teltonika FMB920)
7. kasper.ae DNS → Vercel
8. Full QA: 3 test jobs end-to-end (equipment rental + freight booking)
9. Go live
```

---

## 3. Task Format

When starting a task, state it as a goal with verification criteria:

```
TASK: Build the ePOD signature pad
GOAL: Customer can sign on mobile with finger. Signature saves as PNG dataURL.
      POST to /api/epod/[jobCode] includes signature_url.
VERIFY:
  [ ] Signature pad renders full-width on 375px mobile
  [ ] Works with mouse on desktop
  [ ] Works with finger on iOS Safari + Android Chrome
  [ ] Canvas output is a valid PNG dataURL
  [ ] POST body includes: photo_url, signature_url, epod_notes, job_code
  [ ] On success: block replaced with confirmation message
  [ ] On error: show error message, do not clear form
DONE WHEN: All verify items pass.
```

---

## 4. Testing Rules

- Never push to production without testing the affected flow end-to-end.
- Use a test Airtable base (duplicate the main base) for development.
- Use Resend test mode for email testing.
- Use Telr sandbox for payment testing.
- Test every form on mobile (375px) before marking complete.
- See `TESTING.md` for full test criteria per feature.

---

## 5. Git Branches

```
main          → production (kasper.ae)
dev           → staging (all feature branches merge here first)
feature/[name] → individual features
```

**Branch naming:**
```
feature/homepage-forms
feature/po-approval-page
feature/tracking-page
feature/epod-flow
feature/invoice-loop
```

**Commit messages:**
```
feat: add equipment enquiry form with Make webhook
fix: quote expiry check on approval page
chore: update MEMORY.md with Zoho Books constraints
```

---

## 6. When Blocked

If blocked on an integration (e.g. waiting for Telr approval), do not halt.

**Priority order when blocked:**
1. Work on the next phase's UI components (they can be built without live integrations)
2. Build email templates in Resend (no integration needed)
3. Build PDF templates in DocuSeal (no integration needed)
4. Write tests for the blocked feature

---

## 7. Updating MEMORY.md

Update `MEMORY.md` when:
- A significant decision is made (add to "Decisions Made")
- A new constraint is discovered (add to "Constraints Discovered")
- Something is tried and rejected (add to "Things Tried and Rejected")
- A phase step is completed (check it off in "Current Build State")
- An open question is resolved (remove from "Open Questions")

This keeps the AI agent context fresh across sessions.

---

## 8. graphify Integration

After completing each phase, run:

```
/graphify .
```

This builds a knowledge graph of the codebase and docs. The graph lets the AI
agent navigate architecture decisions and data flow without re-reading all files.
The `.agent/rules/graphify.md` ensures the agent reads `GRAPH_REPORT.md` before
answering architecture questions.

After building the graph:
```
graphify antigravity install
```

This writes `.agent/rules/graphify.md` (always-on) and `.agent/workflows/graphify.md`
(`/graphify` slash command).
