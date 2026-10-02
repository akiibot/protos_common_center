# Data Model

## Conventions

- IDs are opaque text values.
- Every business record belongs to an organization.
- Dates use ISO-compatible strings and display in `Asia/Dhaka`.
- Monetary amounts use integer paisha with BDT as the default currency.
- Convex schema and index changes must remain compatible with stored production documents until a verified data migration is complete.
- Business records should gain archive metadata instead of destructive deletion.

## Current Convex tables

### organizations

Workspace-level identity and defaults. Important fields: name, slug, timezone, currency.

### members

Current Protos team directory and skills. Important fields: organization, optional authenticated-user ID, name, role, discipline, initials, color, and open-task summary.

Target changes: separate person profile from organization membership, add role and active/deactivated status, derive workload rather than storing `open_tasks`, and preserve historical members on old records.

### goals

Strategic outcomes for a company phase. Important fields: title, owner, status, progress, target, and signal.

Target changes: measurable key results, dates, linked projects, and progress calculation rules.

### leads

Sales opportunities. Important fields: business, contact summary, stage, owner, source, estimated value, next action, next-action date, and last touch.

Target changes: normalized businesses/contacts, interaction history, stage history, qualification data, proposal details, loss reason, and conversion links.

### projects

Client or internal delivery initiatives. Important fields: name, client label, lead, stage, health, progress, value, due date, and next milestone.

Target changes: client foreign key, project members, milestones, deliverables, risks, scope history, and financial links.

### tasks

Owned commitments. Important fields: optional project, title, owner, priority, status, due date, context, created time, and updated time.

Target changes: description, stable owner/member ID, blocker reason, parent task, recurrence, dependencies, completion time, archive time, and edit version.

### content_items

Content ideas and production records. Important fields: title, platform, format, pillar, owner, status, and publish date.

Target changes: brief, audience, objective, hook, CTA, reviewer, approval state, asset links, published URL, and performance metrics.

### finance_entries

First-release invoice and expense summaries. Important fields: kind, label, category, amount, status, and due date.

Target changes: replace the generic entry model with invoices, invoice line items, payments, expenses, vendors, recurring costs, and currency-aware totals.

### activity_events

Human-readable recent activity. Important fields: actor, action, entity type, entity ID, and timestamp.

Target changes: stable actor ID, structured action type, change metadata, source, and correlation/transaction ID.

## Target relationships

```text
Organization
  ├─ Membership ─ Person/User
  ├─ Goal ─ Key Result ─ Project
  ├─ Business ─ Contact
  │     ├─ Lead ─ Interaction
  │     └─ Client ─ Project
  ├─ Project
  │     ├─ Milestone ─ Deliverable
  │     ├─ Task ─ Comment
  │     ├─ Risk / Decision
  │     ├─ File
  │     ├─ Invoice ─ Payment
  │     └─ Expense
  ├─ Content Item ─ Asset / Review / Metric
  ├─ Knowledge Record ─ Version / File
  ├─ Notification
  ├─ Import Run ─ Import Row Result
  └─ Activity Event
```

## Proposed additions by release

### Release 2

- memberships and roles;
- comments;
- record attachments/file metadata;
- archive and version fields;
- import runs and row results; and
- structured audit metadata.

### Release 3

- businesses, contacts, clients, interactions, and stage history;
- milestones, deliverables, project members, risks, and decisions;
- invoices, lines, payments, expenses, and recurring costs;
- content reviews, assets, and metrics; and
- knowledge records and versions.

### Release 4

- notification preferences and deliveries;
- automation rules and runs;
- saved views;
- report definitions and snapshots where needed; and
- AI-assistance run/citation records.

## Migration policy

Every schema change requires validation against the development deployment, a forward-data migration when existing documents need reshaping, verification against empty and populated deployments, updated documentation, and release notes explaining production risk and rollback strategy. Destructive schema changes happen only after the related data has been migrated and verified.
