# Detailed Implementation Plan

This document translates the roadmap into buildable epics. GitHub Issues are the execution units; this file preserves sequencing, architecture decisions, and acceptance standards.

## Current baseline

The application currently has a single responsive workspace backed by Convex. The browser uses a same-origin `/api/workspace` gateway, and the gateway calls secret-protected Convex queries and mutations. Task status changes, lead stage changes, and quick creation of tasks, leads, and content ideas persist in Convex.

Current tables: organizations, members, goals, projects, tasks, leads, content items, finance entries, and activity events.

The source currently uses one shared actor identity. The hosted Site remains access-restricted at the platform level. Any change to access must be designed before adding personal or client information.

## Delivery order

Work should proceed in this order:

1. safety and engineering foundations;
2. data import and reconciliation;
3. complete core record workflows;
4. connected operating workflows;
5. reporting and automation; and
6. production hardening.

Do not start automation before the related records and manual workflows are dependable.

## Epic A — Access, identity, and authorization

Execution plan: [Phase 1 Implementation Plan: Team Access, Identity, and Authorization](PHASE_1_ACCESS_IMPLEMENTATION_PLAN.md)

### Outcome

Seven team members can use the system with appropriate permissions, and every important mutation has a trustworthy actor.

### Work

- Choose the access model: Sites workspace access, application accounts, or another approved identity provider.
- Define roles: owner, admin, manager, member, and viewer.
- Add memberships that connect a user identity to an organization and role.
- Add server-side authorization helpers.
- Enforce permissions in every mutation endpoint.
- Make the visible interface reflect permissions without treating hidden controls as security.
- Attribute activity events to stable member IDs.
- Add invitation, deactivation, and access-review procedures.

### Acceptance criteria

- Anonymous and unauthorized writes are rejected.
- A viewer cannot mutate records through either the UI or direct API calls.
- Deactivated users lose access without deleting their historical activity.
- Activity records show the correct actor.
- Permission behavior is covered by integration tests.

## Epic B — Spreadsheet import and reconciliation

### Outcome

The complete command-center spreadsheet can be imported without silent data loss or duplication.

### Work

- Inventory every sheet, column, formula, validation, and cross-sheet relationship.
- Map source columns to target records.
- Classify columns as import, derive, archive, or intentionally omit.
- Create a staging/import format and parser.
- Validate required fields, dates, money, status values, and owners.
- Detect duplicates with stable import keys.
- Produce a dry-run report before committing records.
- Record row-level errors and warnings.
- Reconcile totals and counts after import.
- Store import-run metadata and make re-running idempotent.

### Acceptance criteria

- Dry run makes no database changes.
- Re-running the same source does not duplicate records.
- Reconciliation reports source count, imported count, skipped count, and errors per module.
- Financial totals match the approved source values.
- The original spreadsheet remains unchanged.

## Epic C — Shared record foundation

### Outcome

Every business record follows consistent rules for identity, lifecycle, timestamps, validation, history, and relationships.

### Work

- Add organization-scoped repository/service functions.
- Add `updated_at`, optional `archived_at`, and version fields where needed.
- Add foreign keys or enforced relationship checks.
- Add typed validation schemas shared by server endpoints.
- Standardize API error responses.
- Add pagination for long collections.
- Add archive and restore instead of immediate destructive deletion.
- Add optimistic-concurrency checks for conflicting edits.
- Add consistent activity-event creation.

### Acceptance criteria

- Every query is scoped to the active organization.
- Invalid states are rejected server-side.
- Archived records disappear from normal views but can be restored.
- Concurrent edits do not silently overwrite newer changes.
- Audit events are created transactionally with important mutations.

## Epic D — Tasks and execution

### Outcome

The team can manage daily commitments without returning to the spreadsheet.

### Work

- Task creation and full edit form.
- Detail panel with description, owner, priority, due date, status, project, and context.
- Comments and activity history.
- Subtasks or checklist items.
- Task dependencies and blocked reason.
- Recurring task rules.
- Filters for owner, status, priority, project, and date.
- My Work and team workload views.
- Bulk assignment and status changes where safe.

### Acceptance criteria

- Every open task has a title, owner, status, and clear context.
- Required fields validate on client and server.
- Filters are shareable or recoverable after navigation.
- Blocked tasks require a reason.
- Completing, reopening, assigning, and archiving create activity events.

## Epic E — Sales, clients, and conversion

### Outcome

Every opportunity progresses through a disciplined sales flow and converts without duplicate entry.

### Work

- Full lead detail with business, contacts, source, estimated value, owner, notes, and next action.
- Contact-history entries for visits, calls, messages, demos, and proposals.
- Configurable pipeline stages and required fields per stage.
- Stale-lead and missing-next-action indicators.
- Client and contact tables.
- Won-lead conversion transaction.
- Conversion preview and confirmation.
- Lost reason and reactivation flow.

### Acceptance criteria

- Every active lead has one owner, one next action, and one next-action date.
- Moving stages validates required stage information.
- Conversion creates one linked client and one project, preserving source history.
- Retrying conversion cannot duplicate client or project records.
- Pipeline totals trace to individual leads.

## Epic F — Projects and delivery

### Outcome

Each active project exposes scope, ownership, schedule, risks, deliverables, and commercial status.

### Work

- Project detail and edit flows.
- Milestones, deliverables, and acceptance criteria.
- Project members and responsibility assignments.
- Linked tasks, files, decisions, risks, and client communication.
- Health calculation with manual override and reason.
- Scope-change history.
- Project templates and onboarding checklist.
- Completion and retrospective flow.

### Acceptance criteria

- Every active project has a lead, next milestone, due date, and health state.
- Project progress derives from defined milestone or task rules.
- Scope and date changes retain history.
- Completed projects remain searchable and financially reportable.

## Epic G — Content operations

### Outcome

Protos can consistently document its journey and publish useful Banglish content for a Dhaka business audience.

### Work

- Content brief fields: audience, objective, pillar, format, platform, hook, CTA, owner, reviewer, and publish date.
- Production statuses from idea to published.
- Asset and reference links.
- Review comments and approval state.
- Calendar and board views.
- Repurposing relationships between long- and short-form content.
- Published URL and basic performance metrics.

### Acceptance criteria

- Scheduled content has an owner, reviewer, platform, format, and approved publish date.
- Publishing requires approval where configured.
- The calendar and board show the same underlying records.
- Published items can capture results without rewriting historical plans.

## Epic H — Finance

### Outcome

Protos can distinguish potential revenue, contracted work, invoices, cash received, expenses, and project margin.

### Work

- Client contracts and agreed project values.
- Invoice records with line items, issue date, due date, status, and linked project.
- Payment records that can partially settle invoices.
- Expense records with category, date, project, vendor, and receipt reference.
- Recurring costs and maintenance revenue.
- Cash, receivables, revenue, cost, and margin summaries.
- CSV export for accountant handoff.

### Acceptance criteria

- Money is stored as integer paisha with a currency code.
- Invoice balance derives from invoice total minus linked payments.
- Pipeline values never appear as received cash.
- Project margin uses recorded revenue and cost sources.
- Financial mutations have history and restricted permissions.

## Epic I — Knowledge, files, and decisions

### Outcome

Reusable operating knowledge stays linked to the work and decisions that depend on it.

### Work

- Knowledge records with category, owner, status, and review date.
- Versioned playbooks, templates, and decision records.
- File metadata and object-storage integration.
- Links from records to relevant knowledge and files.
- Search indexing and stale-document reminders.

### Acceptance criteria

- Files have access checks independent of hidden UI.
- Documents expose an owner and last-reviewed date.
- Important decisions include context, decision, owner, and date.
- Archived files and documents retain relationship history.

## Epic J — Search, reporting, and exports

### Outcome

The team can find any operational record and produce reliable management views without manual consolidation.

### Work

- Global search across supported record types.
- Module filters, sorting, and saved views.
- Dashboard metric definitions and drill-down links.
- Weekly operating report.
- Revenue, pipeline, delivery, content, goal, and capacity reports.
- CSV export with permission checks.
- Date-range and owner filters.

### Acceptance criteria

- Search results identify record type and useful context.
- Each dashboard number links to its source records.
- Reports state their date range and timezone.
- Exported totals reconcile with on-screen totals.

## Epic K — Notifications and automation

### Outcome

The system highlights risk and prepares routine coordination work without creating noise or unsafe autonomous changes.

### Work

- Notification preferences and delivery channels.
- Due-soon, overdue, blocked, stale-lead, approval, and invoice reminders.
- Daily focus and weekly brief generation.
- Idempotent scheduled jobs with run history.
- Retry and failure visibility.
- Human approval for high-impact automated actions.

### Acceptance criteria

- Duplicate job runs do not duplicate notifications or records.
- Users can mute non-critical categories.
- Every automated change records the rule, run, and result.
- Failures are visible without exposing secrets.

## Epic L — Quality, observability, and recovery

### Outcome

The application can be changed confidently and recovered when something fails.

### Work

- Unit tests for business rules.
- API integration tests for permissions and mutations.
- Critical-flow browser tests.
- Structured error logging and safe user-facing messages.
- Performance and accessibility checks.
- Automated backups and documented restore procedure.
- Data-retention and deletion policy.
- Release checklist and rollback process.

### Acceptance criteria

- Critical flows fail the build when broken.
- Production errors have enough context to diagnose without private-data leakage.
- A backup can be restored in a rehearsal.
- Release and rollback ownership is explicit.

## First implementation sprint

The recommended first sprint is intentionally foundational:

1. Decide and document the access model.
2. Add validation and consistent API errors.
3. Add record update timestamps and archival fields.
4. Build complete task create/edit/archive flows.
5. Inventory the source spreadsheet and produce the import mapping.
6. Add a small automated integration-test harness for record mutations.

This creates a safe pattern that later lead, project, content, and finance work can reuse.

## Definition of done

A GitHub Issue is complete only when:

- its acceptance criteria are satisfied;
- server-side validation and authorization are present;
- affected loading, empty, error, and success states work;
- mobile and desktop behavior is usable;
- data-model and architecture documentation is updated;
- migrations are generated and reviewed when required;
- automated or manual verification is recorded; and
- the pull request has been reviewed.
