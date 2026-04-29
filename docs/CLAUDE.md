# CLAUDE.md — Kasper Platform

Behavioral guidelines for building the Kasper Digital Iron Logistics platform.
Merge these with Antigravity's default rules. Kasper-specific rules override general ones.

**Tradeoff:** These guidelines bias toward caution over speed. Kasper handles
commercial logistics and legally binding purchase orders. A wrong assumption
in a quote flow costs real money.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing anything:

- State your assumptions explicitly. If uncertain about business logic (pricing,
  status transitions, email triggers), stop and ask. Do not guess.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear about the flow (especially the PO approval chain or
  the ePOD → invoice trigger), name exactly what's confusing. Ask.

**Kasper-specific:** The approval flow at `kasper.ae/approve/[JOB_CODE]` is a
legal confirmation. Never assume what happens on click — it must match
`AUTOMATION_MAP.md` Scenario 3 exactly.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what is in `PRD.md`.
- No abstractions for single-use components.
- No "flexibility" or "configurability" that wasn't asked for.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

**Kasper-specific anti-patterns to avoid:**
- Do not add a user authentication system unless `CLIENT_PORTAL.md` is in scope.
  The tracking page is code-only access (no login) for Phase 1.
- Do not add a CMS or admin panel beyond the Airtable Interface spec.
- Do not add multi-currency support. AED only.
- Do not add multi-language support. English only.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

---

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style — dark-blue/teal Kasper design system (see `DESIGN_SYSTEM.md`).
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test:** Every changed line should trace directly to the user's request.

**Kasper-specific:** The `DESIGN_SYSTEM.md` tokens are fixed. Do not introduce
new colour values, new fonts, or new spacing units that aren't in the design system.
The brand is precise: `#0D1B2A` background, `#1D9E75` teal, `Space Mono` headings.

---

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Build the quote form" → "Form submits to Make webhook, Airtable record created
  with correct fields, ops WhatsApp fires within 30 seconds. Test passes."
- "Build the tracking page" → "Status timeline renders correctly for each of the
  9 status values. GPS embed appears only on IN_TRANSIT. ePOD block appears only
  on DELIVERED. Code not found shows error state cleanly."
- "Build the ePOD flow" → "Photo upload stores to Airtable, signature canvas
  saves as image URL, submission triggers Scenario 6 in Make, invoice email
  lands in customer inbox within 60 seconds."

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently.
Weak criteria ("make it work") require constant clarification.

---

## 5. Kasper Domain Rules

**Business logic that is fixed and must not be interpreted freely.**

- Job codes follow format: `KSP-YYYYMMDD-XXXX` (e.g. `KSP-20260416-0042`).
  The 4-digit suffix is sequential per day, zero-padded. Never random, never UUID.
- Status transitions are one-directional. A job cannot move backward through
  the status chain. ENQUIRY → QUOTED → CONFIRMED → ASSIGNED → IN_TRANSIT →
  DELIVERED → EPOD_APPROVED → INVOICED → PAID.
- The ePOD trigger is the only thing that fires the invoice. Never generate
  an invoice without `epod_approved = TRUE` in Airtable.
- Quote validity is 48 hours from `quote_sent_timestamp`. After expiry, the
  approval page must show "This quote has expired" and not allow approval.
- Currency is AED. No currency conversion, no other symbols.
- All times displayed to customers are UAE time (GST, UTC+4). No time zone selector.

---

## 6. File Authority

When there is a conflict between files, this is the authority order:

1. `AUTOMATION_MAP.md` — for automation trigger logic
2. `DATA_MODEL.md` — for field names and types
3. `PRD.md` — for feature scope and page specs
4. `DESIGN_SYSTEM.md` — for visual output
5. `ARCHITECTURE.md` — for tooling and integration choices
6. `CLAUDE.md` (this file) — for behavioral rules

If a conflict exists, flag it. Do not silently resolve it.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer
rewrites due to overcomplication, clarifying questions come before implementation
rather than after mistakes, and every PR contains only what was asked.
