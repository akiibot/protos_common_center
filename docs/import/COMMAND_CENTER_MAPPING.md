# Command Center Mapping Decisions

Status: draft; owner approval required

The machine-readable draft is `config/import/command-center.v1.json`. It is intentionally blocked and cannot run an import.

| Source | Proposed target | Main fields |
|---|---|---|
| Roadmap & Phases | goals | title, activities/signal, exit criteria/target, status |
| Team & Tasks | tasks | title, owner, priority, status, due date, context |
| Lead Tracker | leads | business, contact, tier/source, stage, owner, last touch, next action |
| Content Calendar | content | publish date, platform, format, title, owner, status |
| Budget | finance | label, category, monthly amount |

Deferred data includes Dashboard summaries, task Phase, lead contact channels and notes, content links and notes, revenue splits, clients, timeline details, and member contact information.

Approval requires confirming the snapshot, composite keys, owner aliases, missing-field defaults, private archive policy, placeholder rows, and omission of derived formulas and totals.
