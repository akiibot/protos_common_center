# Protos Common Center Roadmap

This roadmap describes delivery of the **Common Center software**. It is separate from Protos's company roadmap, which moves from services to SaaS products and then AI business solutions.

## Current release — Operating foundation

Status: live first release.

Delivered:

- persistent navigation and responsive application shell;
- command dashboard and attention summary;
- goals, sales, clients, projects, tasks, content, finance, team, and knowledge views;
- persistent task-status and lead-stage changes;
- quick creation for tasks, leads, and content ideas;
- initial D1 data model and representative Protos records;
- private hosted deployment; and
- browser agent tools for summary and workspace navigation.

Known limitations:

- most records cannot yet be fully edited, archived, or deleted;
- several modules are summaries rather than complete workflows;
- records are seeded from a limited subset of company information;
- the app currently uses one shared workspace identity;
- production publishing is manual; and
- automated tests, backups, and monitoring are not yet implemented.

## Release 2 — Reliable shared workspace

Goal: make Common Center safe and complete enough to replace daily spreadsheet operations.

Priority order:

1. Define secure team access and member roles.
2. Import the complete command-center spreadsheet with validation and an import report.
3. Add complete create, view, edit, archive, and restore flows for core records.
4. Add record detail views, comments, attachments, and activity history.
5. Add global search, module filters, sorting, and saved views.
6. Add loading, empty, error, and conflict states throughout the application.
7. Establish automated checks and database backup procedures.

Exit criteria:

- all seven team members can access the correct workspace safely;
- the imported totals reconcile with the source spreadsheet;
- tasks, leads, projects, clients, and content records support full daily operation;
- important changes have actor and timestamp history;
- no critical workflow requires editing the old spreadsheet; and
- rollback and backup procedures are documented and tested.

## Release 3 — Connected operating workflows

Goal: remove duplicate entry and make records advance through the business automatically.

Priority order:

1. Convert a won lead into a client, project, onboarding checklist, and advance invoice.
2. Connect projects to milestones, deliverables, tasks, files, decisions, and finances.
3. Add recurring tasks, dependencies, blockers, and approval states.
4. Add content briefs, review, approval, scheduling, and performance records.
5. Add invoices, payments, expenses, recurring costs, and project profitability.
6. Add reusable playbooks, templates, and linked knowledge records.

Exit criteria:

- a lead can progress from discovery to payment without duplicate records;
- every active project exposes scope, ownership, next milestone, risks, and commercial status;
- content work has an accountable approval path;
- finance distinguishes pipeline, committed revenue, invoiced revenue, and cash received; and
- important documents are linked to the work that uses them.

## Release 4 — Automation and management intelligence

Goal: make the system identify what needs attention and reduce coordination overhead.

Priority order:

1. Due-date, overdue, stale-lead, blocked-work, and approval notifications.
2. Daily focus and weekly operating briefs.
3. Sales follow-up reminders and pipeline-health signals.
4. Workload and capacity views for the seven-person team.
5. Revenue, cash, delivery, content, and goal dashboards.
6. CSV export, scheduled reports, and management summaries.
7. Carefully scoped AI assistance grounded in workspace records.

Exit criteria:

- owners are notified before work becomes overdue;
- weekly reporting can be produced without manual spreadsheet assembly;
- management metrics trace back to source records;
- AI output cites relevant workspace data and never silently changes records; and
- automated actions are auditable and reversible.

## Release 5 — Production hardening and scale

Goal: make Common Center dependable as Protos grows beyond its original team and service model.

Priority order:

1. Permission, privacy, and security review.
2. Automated unit, integration, and critical-flow tests.
3. Error monitoring, performance measurement, and operational alerts.
4. Restore drills, data retention policy, and export guarantees.
5. Accessibility and mobile usability audit.
6. Multi-workspace and product-portfolio readiness where justified.
7. Team onboarding, operating documentation, and spreadsheet retirement.

Exit criteria:

- permissions are tested at both interface and API boundaries;
- critical workflows have automated regression coverage;
- recovery objectives and restore steps are proven;
- performance is acceptable on common Bangladeshi mobile connections; and
- the old command-center spreadsheet is read-only or archived.

## Roadmap rules

- Security and data integrity take priority over convenience.
- A release is complete only when its exit criteria are met.
- New features require a named owner, user outcome, and acceptance criteria.
- Avoid automating an unclear manual workflow; stabilize the workflow first.
- Do not build Release 4 intelligence on incomplete Release 2 data.

