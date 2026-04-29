# program.md — Kasper Agent Program

Inspired by Karpathy's autoresearch `program.md`. This file sets up the
autonomous research and build loop for the Kasper platform. Point your agent
here and let it go.

**The core idea:** You are not telling the agent what to do step by step.
You are giving it a success criterion and letting it loop until it meets it.

---

## Current Experiment

**Goal:** Build the Kasper Platform Phase 1 end-to-end.

**Success criterion (measurable):**
A real test enquiry can be submitted on kasper.ae, ops receives a WhatsApp
notification within 30 seconds, ops can send a quote from Airtable in under
2 minutes, the customer clicks Approve and receives a job code email within
60 seconds, and the job code works on kasper.ae/track showing the correct
status.

**If success criterion is not met:** Identify exactly which step in the chain
broke. Fix only that step. Test again.

---

## Agent Setup

```
Hi — read program.md, MEMORY.md, and PRD.md, then let's start the next
unchecked task. Tell me what you're about to do and what success looks like
before you start.
```

---

## The Research Loop

The agent follows this loop for every task:

```
1. READ — read the relevant spec files for this task
2. PLAN — state what you're going to build and how you'll verify it
3. BUILD — implement the minimum code that satisfies the spec
4. VERIFY — run the verification criteria from TESTING.md
5. RECORD — update MEMORY.md with any decisions or constraints found
6. NEXT — identify the next unchecked task in MEMORY.md → go to step 1
```

**Do not skip step 2 (plan before building).**
**Do not skip step 5 (record what you found).**

---

## Experiment Log

Record every significant build session here. Date, what was built, what
was found, metric before/after (where applicable).

---

### Session: [Date]

**Task:** [What was being built]

**Assumptions made:**
- [assumption 1]
- [assumption 2]

**What was built:**
- [file/component created or modified]

**Constraints discovered:**
- [any new constraint, e.g. "Telr requires separate webhook setup"]

**Tests run:**
- [ ] [test 1] — PASS / FAIL
- [ ] [test 2] — PASS / FAIL

**Next task:**
- [what comes next]

---

## Baseline Metrics

Set these before Phase 1 launch. Measure after.

| Metric | Baseline (manual) | Target (platform) |
|---|---|---|
| Time: enquiry to quote sent | ~45 minutes | < 2 minutes |
| Time: quote to PO generated | ~15 minutes (manual email) | < 60 seconds |
| Time: ePOD to invoice email | ~24 hours (manual creation) | < 90 seconds |
| Customer tracking capability | None (phone calls only) | Self-service, < 30 sec |
| Quote disputes (per 100 orders) | Unknown | Zero (auditable timestamp) |

---

## Rules for this Agent

1. **Never run along with wrong assumptions.** If the spec is ambiguous,
   name the ambiguity and ask. Do not guess on business logic.

2. **The files are the spec.** `DATA_MODEL.md` field names are gospel.
   `AUTOMATION_MAP.md` scenario logic is gospel. Do not improvise.

3. **One change at a time.** Do not fix three things simultaneously.
   You will not know which fix worked.

4. **Update MEMORY.md.** Every session that discovers a constraint or makes
   a decision must record it. Future sessions depend on this.

5. **Minimum code.** If 50 lines does the job, do not write 200.

6. **Test before marking done.** "It should work" is not a test.

---

## For the Human Reading This

If you're starting a new session with an AI agent on this project:

1. Have the agent read this file first.
2. Then have it read `MEMORY.md` for current build state.
3. Then give it the task in this format:
   "Build [feature]. The spec is in [file]. Done means [verification criteria]."

Do not give it a vague goal. Give it a measurable success criterion and
let it loop.

From Karpathy's insight that applies equally here:
> "LLMs are exceptionally good at looping until they meet specific goals.
> Don't tell it what to do — give it success criteria and watch it go."
