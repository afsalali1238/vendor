# CHANGELOG.md — Kasper Platform

All significant changes recorded here.
Format: `[YYYY-MM-DD] | Phase X | Description | Author`

---

## Unreleased — Phase 1 (in progress)

### Added
- `CLAUDE.md` — AI behavioral guidelines (Karpathy-inspired, Kasper-specific)
- `PRD.md` — Product requirements for all 6 pages
- `ARCHITECTURE.md` — Full tech stack and data flow
- `DATA_MODEL.md` — Airtable JOBS and EQUIPMENT tables, all fields
- `AUTOMATION_MAP.md` — 7 Make scenarios with trigger → action specs
- `DESIGN_SYSTEM.md` — Design tokens, components, email and mobile guidelines
- `MEMORY.md` — Project memory: decisions, constraints, build state
- `WORKFLOW.md` — Development workflow, phase steps, task format
- `SKILLS.md` — Reusable AI skills (`/kasper-status`, `/kasper-new-feature`, etc.)
- `program.md` — Agent program file (autoresearch-style)
- `TESTING.md` — Verification checklists per feature
- `.agent/rules/kasper.md` — Antigravity always-on rules
- `.agent/rules/graphify.md` — graphify always-on rules
- `.agent/workflows/kasper-build.md` — Antigravity build workflow commands
- `.agent/workflows/graphify.md` — /graphify slash command

---

## How to Record Changes

When a feature ships, add an entry here:

```markdown
## [YYYY-MM-DD] — Phase [N]

### Added
- [component or feature]: [brief description]

### Changed
- [what changed]: [why it changed]

### Fixed
- [bug]: [what was wrong, what was fixed]

### Decisions
- [decision made]: [rationale, link to MEMORY.md if significant]
```

---

## Version Philosophy

This project does not use semantic versioning. Features ship continuously.
The changelog is organized by date and phase. "Done" means all items in
`TESTING.md` for that feature pass.
