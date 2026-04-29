# Kasper Platform — Project Documentation

**⬢ KASPER — Digital Iron Logistics**  
UAE heavy equipment rental + freight booking platform  
kasper.ae | Built with Antigravity

---

## Quick Start (for AI agent)

Start every session with:
```
Read program.md and MEMORY.md, then tell me the current build state
and the next unchecked task.
```

---

## File Index

### Core Spec Files

| File | What it answers |
|---|---|
| [`PRD.md`](PRD.md) | What to build — all 6 pages, every form field, every user flow |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How to build it — stack, project structure, data flow, security |
| [`DATA_MODEL.md`](DATA_MODEL.md) | Airtable tables and fields — names are gospel, do not rename |
| [`AUTOMATION_MAP.md`](AUTOMATION_MAP.md) | All 7 Make scenarios — trigger, conditions, actions, email templates |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | Design tokens, CSS components, email design, mobile rules |

### AI Agent Files

| File | What it does |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Behavioral rules — think before coding, simplicity, surgical changes |
| [`MEMORY.md`](MEMORY.md) | Project memory — decisions made, constraints found, build state |
| [`WORKFLOW.md`](WORKFLOW.md) | How to develop — phase steps, task format, testing rules |
| [`SKILLS.md`](SKILLS.md) | Reusable slash command procedures |
| [`program.md`](program.md) | Agent program — success criteria, research loop, experiment log |

### Quality

| File | What it does |
|---|---|
| [`TESTING.md`](TESTING.md) | Verification checklists — every feature, mobile, security |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |

### Antigravity Integration

| File | What it does |
|---|---|
| [`.agent/rules/kasper.md`](.agent/rules/kasper.md) | Always-on domain rules |
| [`.agent/rules/graphify.md`](.agent/rules/graphify.md) | Always-on knowledge graph rules |
| [`.agent/workflows/kasper-build.md`](.agent/workflows/kasper-build.md) | `/kasper-*` slash commands |
| [`.agent/workflows/graphify.md`](.agent/workflows/graphify.md) | `/graphify` slash command |

### Knowledge Graph (generated)

| File | What it does |
|---|---|
| [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md) | God nodes, connections, queries — build with `/graphify .` |

---

## File Authority (tie-breaking)

When files conflict, this order wins:

```
1. AUTOMATION_MAP.md   — automation trigger logic
2. DATA_MODEL.md       — field names and types
3. PRD.md              — feature scope
4. DESIGN_SYSTEM.md    — visual output
5. ARCHITECTURE.md     — tooling choices
6. CLAUDE.md           — behavioral rules
```

---

## The Order Flow

```
Customer fills form on kasper.ae
        ↓
Make Scenario 1: ops WhatsApp alert + customer ACK email
        ↓
Ops in Airtable: enters price, changes status → QUOTED
        ↓
Make Scenario 2: quote email to customer with Approve button
        ↓
Customer clicks Approve → kasper.ae/approve/[jobId]
        ↓
Make Scenario 3: job code generated, PO PDF, confirmation email
        ↓
Ops assigns driver, pastes Traccar link, status → IN_TRANSIT
        ↓
Make Scenario 4: in transit email to customer
        ↓
Ops: status → DELIVERED
        ↓
Make Scenario 5: ePOD request email
        ↓
Customer goes to kasper.ae/track, signs off ePOD
        ↓
Make Scenario 6: Zoho invoice + Telr payment + DocuSeal delivery note + email
        ↓
Telr webhook → Make Scenario 7: payment_status = PAID
```

---

## Monthly Running Costs

| Tool | Cost (AED/mo) |
|---|---|
| Airtable Pro | ~500 |
| Make | ~300 |
| Twilio/MSG91 | ~200 |
| Resend | 0–150 |
| Zoho Books | ~150 |
| Telr | ~100 + 1.9% txn |
| Traccar (DigitalOcean) | ~150 |
| DocuSeal | 0 (free tier) |
| Vercel | 0 (free tier) |
| **Total** | **~AED 1,600** |

GPS hardware (Teltonika FMB920): AED 300/unit, one-time capex.

---

## Phase 1 Success Criteria

- Ops sends quote in < 2 minutes from WhatsApp notification
- Customer accesses tracking with job code in < 30 seconds  
- ePOD to invoice email in < 90 seconds
- Zero phone calls required to complete a standard order
- Zero manual invoice creation
