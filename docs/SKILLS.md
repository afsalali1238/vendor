# SKILLS.md — Kasper Reusable AI Skills

Reusable task-specific instructions for common operations on this codebase.
These skills are invoked via slash commands in Antigravity.

---

## /kasper-status

**Purpose:** Get the current build state and next action.

**When to use:** Start of every session.

**Procedure:**
1. Read `MEMORY.md` → Current Build State section
2. Identify the first unchecked item in the current phase
3. Read the relevant spec file for that item
4. Report: "Current phase: [phase]. Next task: [task]. Reading spec from [file]."
5. State your assumptions before starting.

---

## /kasper-new-feature [feature-name]

**Purpose:** Scaffold a new feature correctly.

**Procedure:**
1. Read `PRD.md` for the feature spec
2. Read `DATA_MODEL.md` for any fields this feature touches
3. Read `AUTOMATION_MAP.md` for any Make scenarios this feature connects to
4. Read `DESIGN_SYSTEM.md` for UI components needed
5. State a plan:
   ```
   FEATURE: [name]
   FILES TO CREATE: [list]
   FILES TO MODIFY: [list]
   AIRTABLE FIELDS TOUCHED: [list]
   MAKE SCENARIOS TRIGGERED: [list]
   VERIFY:
     [ ] [criterion 1]
     [ ] [criterion 2]
   ```
6. Ask for confirmation before writing code.

---

## /kasper-airtable-query [question]

**Purpose:** Answer questions about the data model without guessing.

**Procedure:**
1. Read `DATA_MODEL.md`
2. Answer from the spec only.
3. If the answer is not in `DATA_MODEL.md`, say "This is not defined in DATA_MODEL.md.
   Do you want me to add it?"
4. Never invent field names. Never use field names that differ from the spec.

---

## /kasper-automation [scenario-number]

**Purpose:** Build or debug a Make scenario.

**Procedure:**
1. Read `AUTOMATION_MAP.md` → Scenario [number]
2. List all actions in order
3. For each action, identify: the input data, the API call, the output written to Airtable
4. Build a test checklist:
   ```
   SCENARIO [N]: [name]
   TRIGGER: [trigger]
   TEST INPUT: [test data]
   EXPECTED:
     [ ] Airtable field [x] = [value]
     [ ] Email received at [address] with subject [subject]
     [ ] WhatsApp received: [text]
   ```
5. Do not assume the scenario is complete until all test items pass.

---

## /kasper-email [template-id]

**Purpose:** Build a Resend email template.

**Procedure:**
1. Read `AUTOMATION_MAP.md` → Email Templates section for the template spec
2. Read `DESIGN_SYSTEM.md` → Email Design section for brand rules
3. Build as a React Email component
4. Required structure:
   ```
   Header: dark (#0D1B2A) background, ⬢ KASPER logo in teal
   Body: clean, single column, max-width 600px
   Job code (if present): large, bold, teal, Space Mono fallback
   CTA button: teal (#1D9E75), white text, border-radius 4px, centered
   Footer: company name, kasper.ae, UAE address, unsubscribe note
   ```
5. Test in: Gmail (desktop + mobile), Apple Mail, Outlook

---

## /kasper-page [page-number]

**Purpose:** Build a website page.

**Procedure:**
1. Read `PRD.md` → PAGE [number] spec
2. Read `DESIGN_SYSTEM.md` for tokens and components
3. Check `ARCHITECTURE.md` → Project Structure for the correct file path
4. Check `DATA_MODEL.md` for any Airtable fields this page reads
5. Build server component where possible (data fetching in server component,
   interactive elements as client components)
6. Test at 375px, 768px, and 1440px before marking done

---

## /kasper-test [feature]

**Purpose:** Run the verification checklist for a feature.

**Procedure:**
1. Read `TESTING.md` → [feature] section
2. Walk through each test case
3. Report: PASS / FAIL / BLOCKED for each
4. For FAILs: state exactly what failed and what the actual vs expected output was
5. Do not mark a feature done until all tests pass

---

## /kasper-debug [problem-description]

**Purpose:** Debug a problem systematically.

**Procedure:**
1. State the problem precisely: "When [action], [expected] happens but [actual] happens."
2. Identify the file authority order from `CLAUDE.md`
3. Check in this order:
   - Is the Airtable field name correct? (check `DATA_MODEL.md`)
   - Is the Make scenario trigger correct? (check `AUTOMATION_MAP.md`)
   - Is the environment variable set? (check `.env.local`)
   - Is the data format correct? (dates as UAE time? job_code format? currency as number not string?)
4. Make one change at a time. Test after each change.
5. Never "try something" without knowing why it should work.

---

## /kasper-review

**Purpose:** Pre-PR code review checklist.

**Checklist:**
```
[ ] Only changed lines trace to the user's request (surgical changes rule)
[ ] No new colour values outside DESIGN_SYSTEM.md tokens
[ ] No new features outside PRD.md scope
[ ] No login / auth code (not in Phase 1 scope)
[ ] All Airtable field names match DATA_MODEL.md exactly
[ ] All status values match the status chain in DATA_MODEL.md
[ ] Timestamps use { timeZone: 'Asia/Dubai' }
[ ] Currency displayed as "AED X,XXX" format
[ ] Mobile tested at 375px
[ ] No console.log left in production code
[ ] Environment variables not hardcoded
[ ] MEMORY.md updated if a decision was made or constraint discovered
```
