# Phase 2 Implementation Plan: Spreadsheet Inventory, Import, and Reconciliation

Status: in progress; source-independent foundation implemented

Created: 2026-10-03

Baseline: `main` at `a8e65bd` (Phase 1 merged in PR #21)

Owners: product owner, data owner, and implementation lead

Roadmap alignment: Release 2, Epic B

GitHub execution issues: #5, then #6

## 1. Outcome

Phase 2 imports the approved command-center spreadsheet into Protos Common Center without silent data loss, duplicate records, unauthorized disclosure, or unreviewed Production changes.

Completion means:

- every populated source column has an approved handling decision;
- source owners, statuses, dates, money, formulas, and relationships have explicit conversion rules;
- a dry run produces a row-level validation and reconciliation report without changing database state;
- an approved apply run is authenticated, organization-scoped, resumable, and idempotent;
- exact reruns create no duplicate business records or duplicate import history;
- imported counts and financial totals reconcile to the approved source snapshot;
- failures can be diagnosed and recovered without editing the source spreadsheet; and
- no Production import occurs without a separate backup, release review, and explicit Owner approval.

Phase 2 is the data-import sequence represented by GitHub Issues #5 and #6. It is not the whole of Roadmap Release 2. Shared lifecycle fields, complete record editing, comments, attachments, search, and backup automation remain separately tracked work.

## 2. Current checkpoint

- Phase 1 application implementation and authenticated Preview were merged in PR #21 at `a8e65bd`.
- Vercel Preview uses Clerk Development and Convex Development and remains read-only.
- Production remains unchanged and read-only; Production auth cutover is tracked separately in Issue #22.
- The current Convex model contains organizations, users, memberships, members, goals, projects, tasks, leads, content items, finance entries, and activity events.
- Current business records use stable external string IDs and carry `organizationId`.
- Activity events already support `source: "import"` and structured actor metadata.
- Current operational owner fields are display-name strings, not member IDs.
- Current finance records store integer amounts intended to be paisha.
- No command-center spreadsheet, CSV export, approved source snapshot, or import mapping is present in the repository or local workspace reviewed on 2026-10-03.
- Issue #5 is ready. Issue #6 is correctly blocked until the inventory and mapping are approved.
- A read-only `.xlsx` inventory scanner, fingerprint-enforcing mapped workbook parser, draft mapping contract, deterministic digest helpers, strict normalization transforms, a deterministic local dry-run planner, private/sanitized report generation, authenticated provenance comparison, Owner-only import permission, additive import metadata tables, and guarded run lifecycle are implemented on the Phase 2 branch.
- The dry-run foundation handles required/default values, controlled mappings, ISO date-only values, integer fields, BDT-to-paisha conversion, cached formula values, stable IDs, identical/conflicting source-key duplicates, and private output-path restrictions using synthetic tests. Source-specific mappings, relationships, and entity validation remain blocked on the approved source inventory and mapping.
- The additive import schema has been verified only against Convex Development `dev:calm-dogfish-828`; no Production deployment was contacted.

The missing source artifact is an expected input gate, not permission to infer private records from seed data or issue text.

## 3. Safety and data invariants

These invariants apply to every Phase 2 work package.

1. The source spreadsheet is opened read-only and is never modified in place.
2. Raw spreadsheets, normalized private rows, client contacts, invoices, and generated reports containing private data are never committed to this public repository.
3. Every import read and write is scoped to the authenticated member's organization; the client cannot supply another organization ID.
4. Dry-run mode performs no Convex mutation, including no `importRuns` insert.
5. Apply mode is disabled when `DEPLOYMENT_READ_ONLY=true` or when the import feature flag is not enabled for the selected non-Production environment.
6. The normalized plan applied must have the same digest that the operator reviewed in dry run.
7. A stable source key maps to at most one target record per organization and entity type.
8. An exact rerun is a no-op for business data and does not create duplicate row-result records.
9. Existing application records are never overwritten merely because a normalized source row looks similar.
10. Source changes, target changes, ambiguous matches, and mapping changes fail as explicit conflicts unless an approved policy resolves them.
11. Money is converted to integer paisha with an explicit currency; floating-point arithmetic is not used for reconciliation.
12. Date-only values remain date-only and display in `Asia/Dhaka`; timestamps are normalized to ISO UTC with their source timezone recorded.
13. Formula text is inventory evidence, not executable application input. The importer consumes only an approved recalculated value.
14. Apply mutations create import provenance and activity history transactionally with the affected business record.
15. Logs and API errors contain run IDs, row locations, and error codes, but not raw private row bodies or credentials.
16. Production execution is a separately approved release action. Planning, development, tests, and Development rehearsal do not authorize it.

## 4. Scope

### Included

- Acquire and fingerprint one approved, immutable source snapshot.
- Inventory sheets, ranges, headers, populated columns, formulas, validations, named ranges, hidden rows/columns, and cross-sheet references.
- Classify each source field as `import`, `derive`, `archive`, or `omit` with a reason and approver.
- Define target modules, field transforms, owner/status mappings, stable source keys, duplicate rules, and reconciliation measures.
- Parse the approved workbook/export format without writing to it.
- Normalize and validate rows into typed staging records.
- Detect duplicates within the source and conflicts against existing application records.
- Produce a private dry-run report and a sanitized summary suitable for pull-request evidence.
- Add import-run, row-result, and source-to-target provenance records.
- Apply validated rows in bounded atomic batches with retry and resume behavior.
- Reconcile row counts, relationship counts, and financial totals after apply.
- Add synthetic fixtures and automated tests for parsing, validation, authorization, idempotency, recovery, and reconciliation.
- Document operator, release, and rollback procedures.

### Not included

- Production deployment, Production data mutation, or changing `DEPLOYMENT_READ_ONLY`.
- Closing or changing Issue #22.
- Editing, cleaning, or reformatting the original spreadsheet.
- Creating verified accounts or accepting invitations on behalf of teammates.
- Continuous two-way spreadsheet synchronization.
- A generic arbitrary-workbook import builder.
- Full create/edit/archive/restore flows for normal business records.
- Normalizing clients, contacts, invoices, payments, milestones, or other Release 3 entities before those target models are approved.
- Importing source columns that have no approved target or approved archive treatment.
- Storing raw workbook files or unredacted row payloads in Convex.
- Treating seed/demo records as authoritative source data.

## 5. Required decisions and gates

### Gate A — Source custody and snapshot approval

The data owner provides the source through an approved private channel and confirms:

- authoritative workbook/export name and format;
- snapshot timestamp and business cutoff date;
- workbook owner and data approver;
- whether formulas have been recalculated before export;
- whether hidden sheets, hidden rows, comments, and notes are in scope;
- whether the workbook contains credentials, private client data, or data that must not enter Development; and
- a SHA-256 fingerprint for the exact snapshot used by the inventory.

The repository records only a sanitized source label, the fingerprint, size, sheet names where safe, and snapshot date. It does not store the source file.

### Gate B — Inventory and mapping approval

Issue #5 remains open until the product/data owner approves:

- coverage of every populated source column;
- target entity and field decisions;
- `import`, `derive`, `archive`, and `omit` classifications;
- owner, status, date, money, and null conversion rules;
- stable source keys and duplicate policy;
- relationship ordering and missing-parent behavior;
- existing-record match policy;
- reconciliation totals; and
- all unresolved decisions listed separately from approved mappings.

No apply engine should be allowed to accept a mapping with unresolved blocking decisions.

### Gate C — Development apply readiness

Before any apply in Convex Development:

- the approved mapping is versioned and machine-readable;
- synthetic unit/integration tests pass;
- dry-run state checks prove zero database changes;
- the apply target identifies itself as Development;
- import writes are explicitly enabled for the bounded rehearsal;
- a Development snapshot or disposable deployment is available; and
- the operator reviews the exact plan digest and expected reconciliation totals.

### Gate D — Production release approval

Production import is outside the current implementation authorization. A future release requires:

- Phase 1 Production access gate completion or another explicitly approved secure access posture;
- a current Convex Production snapshot and checksum;
- explicit Owner approval of the source fingerprint, mapping version, plan digest, totals, operator, and release window;
- a verified rollback decision and responsible operator;
- a dry run against a current Production read snapshot;
- `DEPLOYMENT_READ_ONLY=true` before and during the import unless the Owner explicitly approves the bounded importer write path; and
- post-import reconciliation before any normal Production writes are enabled.

Issue #22 remains independent and open unless the Owner later approves its cutover requirements.

## 6. Target import architecture

```text
Approved private workbook snapshot (read-only)
  -> inventory scanner
  -> sanitized inventory + decision register
  -> approved versioned mapping
  -> parser and normalizer
  -> typed staging rows in memory
  -> validation + duplicate/relationship analysis
  -> authorized read-only target comparison
  -> private dry-run report + normalized plan digest
  -> explicit operator confirmation of the digest
  -> begin authenticated import run
  -> apply bounded atomic batches
       -> business record
       -> import source-to-target link
       -> import row result
       -> structured activity event
  -> post-apply reconciliation
  -> completed or failed run report
```

### Boundary choices

- Workbook parsing happens in a trusted local/server process and does not persist the raw upload.
- The same parser, mapping, validators, and digest algorithm are used for dry run and apply.
- Dry run uses authenticated read-only target queries and local computation. It does not call a mutation.
- Apply uses narrow Convex mutations rather than a general database or arbitrary JSON import endpoint.
- Each batch is atomic. Rows rejected during preflight never enter an apply batch.
- The source file is re-read for apply. Its SHA-256, mapping version, and normalized plan digest must match the reviewed dry run.
- An interrupted apply resumes from recorded row keys; it does not restart by blindly recreating records.

### Proposed repository layout

```text
config/import/
  command-center.v1.json          Sanitized approved mapping and controlled value maps
scripts/import/
  inventory-workbook.mts          Read-only workbook inventory
  normalize-workbook.mts          Source-to-staging transforms
  validate-import.mts             Cross-row and domain validation
  report-import.mts               Private detailed and sanitized summary reports
  run-import.mts                  Dry-run/apply orchestration
convex/
  imports.ts                      Authenticated comparison and bounded apply mutations
  lib/importPolicy.ts             Import permissions and state-transition rules
  lib/importValidation.ts         Convex-side validation of canonical rows
tests/import/
  fixtures/                       Synthetic, non-confidential workbooks and expected results
  *.test.ts                       Parser, mapping, idempotency, and recovery coverage
docs/import/
  COMMAND_CENTER_SOURCE_INVENTORY.md
  COMMAND_CENTER_MAPPING.md
  IMPORT_RUNBOOK.md
```

Private artifacts such as raw workbooks, normalized rows, and detailed reports must be written only to an ignored operator-selected directory. The scripts must refuse to use a path inside the repository unless it is an explicitly ignored artifact directory, and the sanitized report generator must fail if disallowed fields are present.

## 7. Source inventory specification

The inventory produced for Issue #5 must include the following without copying private cell contents into Git.

### Workbook-level inventory

- source label, snapshot date, byte size, and SHA-256;
- file type and workbook date system (`1900` or `1904` where applicable);
- calculation mode and last-calculated indicators when available;
- sheet order, visible/hidden state, used range, and non-empty row count;
- named ranges, tables, merged ranges, external links, macros, protections, and data connections;
- workbook and sheet-level validation rules; and
- parser warnings for unsupported workbook features.

Macro-enabled files are rejected by default. External links are recorded as warnings and never fetched. Password-protected or encrypted files require a separately approved handling method and no password may be placed in source control, command history, or logs.

### Column-level inventory

For every populated column:

- sheet and normalized header;
- original header spelling;
- detected value types and null/blank rate;
- formula count and formula/value distinction;
- distinct controlled values or a redacted cardinality summary;
- date and money format evidence;
- validation rule or dropdown source;
- relationship candidates;
- sensitivity classification;
- proposed handling: `import`, `derive`, `archive`, or `omit`;
- target entity/field when known; and
- decision status, rationale, and approver.

Private examples belong only in the private working report. Repository documentation may use synthetic examples.

### Relationship inventory

The inventory identifies:

- parent/child sheet order;
- explicit IDs and cross-sheet lookup keys;
- formula-based relationships;
- duplicate parent candidates;
- orphan child rows;
- many-to-many cells containing delimited values; and
- relationships that cannot fit the current target schema.

Relationships without an approved target are archived or omitted according to an explicit decision; they are never flattened silently.

## 8. Mapping contract

The machine-readable mapping is versioned. Each entry contains at least:

| Field | Purpose |
|---|---|
| `mappingVersion` | Immutable semantic version used in every plan/run |
| `sourceSheet` | Exact source sheet identifier |
| `sourceHeader` | Exact header or positional identifier |
| `handling` | `import`, `derive`, `archive`, or `omit` |
| `targetEntity` | Approved target module or `null` |
| `targetField` | Approved target field or archive key |
| `transform` | Named, tested transform only |
| `required` | Whether a blank rejects the row |
| `default` | Explicit default, never an implicit parser default |
| `valueMap` | Controlled source-to-target value mapping |
| `sensitivity` | Public/internal/confidential/restricted classification |
| `decision` | Approval reference and rationale |

Each entity mapping also declares:

- source row inclusion rule;
- stable source-key recipe;
- duplicate key behavior;
- existing-target match behavior;
- parent relationship dependencies;
- validation schema;
- apply order;
- reconciliation counts and sums; and
- whether the entity is supported by the current schema.

### Classification rules

- `import`: the approved source value maps to a current target field.
- `derive`: the target value is deterministically computed from approved inputs; the function and inputs are documented.
- `archive`: the information must be retained for later migration but has no approved operational field. Archive storage must be encrypted/private and is not a generic Convex raw-row table.
- `omit`: the value is intentionally excluded, with a reason such as duplicate formatting, obsolete helper formula, unsupported sensitive data, or owner decision.

`archive` does not mean committing the value to this repository. If no approved private archive exists, the decision remains blocking.

## 9. Normalization and validation rules

### Canonical staging row

Every accepted source row becomes an in-memory canonical record:

```ts
type CanonicalImportRow = {
  rowKey: string;
  source: { sheet: string; row: number; sourceKey: string };
  entityType: "member" | "goal" | "project" | "task" | "lead" | "content" | "finance";
  operation: "create" | "link_existing" | "skip";
  targetExternalId: string;
  parentKeys: string[];
  values: Record<string, unknown>;
  rowFingerprint: string;
  warnings: ImportDiagnostic[];
};
```

This is a planning shape, not permission to accept arbitrary fields. Convex uses entity-specific validators and rejects unknown keys.

### Stable keys and IDs

- Prefer a durable source ID already present in the spreadsheet.
- Otherwise use an owner-approved composite key from stable business fields.
- Never use row number alone as the durable key; row number remains diagnostic location only.
- Canonical `sourceKey` includes a source-system namespace and entity type.
- New target external IDs are deterministic from organization, entity type, and source key, or are stored immediately in `importRecordLinks` before another row can use them.
- Mapping version is not part of source identity. A mapping change must reconcile against existing links instead of creating new records.

### Owner mapping

- Owner values map to existing `members.id` through an approved alias table.
- The current business schema still stores owner display names, so the importer writes the canonical member display name while provenance retains the member ID.
- Unknown, ambiguous, deactivated, and blank required owners are blocking errors.
- New members or memberships are never created by the spreadsheet importer.

### Status and enum mapping

- Source values map through explicit controlled tables.
- Whitespace/case normalization may identify an alias, but no unknown value falls through to a guessed target.
- Current task targets are `Backlog`, `Ready`, `In Progress`, `In Review`, `Blocked`, and `Done`.
- Current lead targets are `Identified`, `Contacted`, `Qualified`, `Demo Scheduled`, `Demo Completed`, `Proposal Sent`, and `Won`.
- Current content, project, goal, and finance values must be inventoried and approved rather than inferred from UI seed data.

### Dates and times

- Workbook serial dates honor the workbook's declared date system.
- Date-only fields normalize to `YYYY-MM-DD` and do not undergo UTC date shifting.
- Timestamp fields require a documented source timezone; absent evidence defaults only after Owner approval.
- Invalid serials, ambiguous text dates, impossible dates, and unexpected time components are errors.
- Relative formulas such as `TODAY()` must be recalculated and frozen in the approved snapshot or excluded.

### Money

- The source currency is explicit per column or workbook; BDT is not guessed when mixed currency is possible.
- Taka values convert to paisha using decimal-safe parsing and multiplication by 100.
- Values with more than two decimal places require an approved rounding rule or fail.
- Formatted strings, commas, parentheses, blanks, and negative values have explicit parsing rules.
- Financial reconciliation uses integer paisha grouped by entity, kind/status, and currency.

### Formula cells

- Inventory records formula presence and a redacted formula signature.
- Import uses the approved cached/calculated result, not formula execution.
- Missing cached values, external-workbook references, calculation errors, and stale calculation evidence block affected rows.
- Totals produced only by spreadsheet formulas are independently recomputed from normalized rows for reconciliation.

### Blank, null, zero, and placeholder values

- Blank, zero, `N/A`, dash, `TBD`, and whitespace are distinct until the mapping explicitly equates them.
- Required values reject the row rather than receiving speculative defaults.
- Defaults are limited to values approved in the mapping and appear as warnings in the dry-run report.

## 10. Duplicate and conflict policy

Duplicate handling is conservative.

### Source duplicates

- Same source key and same row fingerprint: keep one canonical row and report the duplicate locations.
- Same source key with different values: blocking conflict.
- Different source keys with the same approved natural key: warning or blocking conflict according to entity policy.

### Existing target records

Every row is classified as one of:

- `create`: no source link and no conflicting target match exists;
- `link_existing`: an explicitly approved existing record is linked without changing business fields;
- `unchanged`: the existing link and canonical fingerprint match;
- `conflict`: source/target identity or values disagree;
- `skip`: an approved rule excludes the row; or
- `invalid`: validation failed.

Fuzzy name matching may suggest candidates in a report but can never authorize `link_existing` or overwrite a record. Existing seed records require explicit per-record decisions: replace through a reviewed migration, link as the same record, retain separately, or remove only through a separately approved cleanup.

### Rerun behavior

- An exact completed source/mapping/plan digest returns the prior completed result.
- Rows already completed in an interrupted run are not recreated.
- A changed source row with an existing source link becomes a conflict in Phase 2 v1; spreadsheet-to-app update synchronization is out of scope.
- A target changed after linking is never overwritten by a rerun.

## 11. Convex data-model additions

All schema changes are additive and remain compatible with existing records.

### `importRuns`

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Stable run ID |
| `organizationId` | string | Authorization scope |
| `sourceLabel` | string | Sanitized source name |
| `sourceSha256` | string | Exact source fingerprint |
| `sourceSnapshotAt` | ISO string | Approved business snapshot time |
| `mappingVersion` | string | Immutable mapping version |
| `planDigest` | string | Digest reviewed before apply |
| `status` | literal | `applying`, `completed`, `failed`, or `cancelled` |
| `startedByUserId` | user ID | Authenticated operator |
| `startedByMemberId` | string | Stable member profile |
| `startedAt` | ISO string | Apply start |
| `completedAt` | ISO string or null | Terminal time |
| `expectedCounts` | object | Approved plan totals |
| `actualCounts` | object | Applied/reconciled totals |
| `lastErrorCode` | string or null | Safe terminal/resume diagnostic |
| `createdAt` / `updatedAt` | ISO string | Lifecycle timestamps |

Indexes:

- `by_external_id`;
- `by_organization_created`;
- `by_organization_status`; and
- `by_organization_plan_digest`.

There is no persisted `dry_run` status because a dry run must not change the database.

### `importRowResults`

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Deterministic run + row key ID |
| `organizationId` | string | Authorization scope |
| `importRunId` | string | Parent run |
| `rowKey` | string | Stable canonical row key |
| `sourceSheet` | string | Diagnostic sheet name or safe alias |
| `sourceRow` | number | Diagnostic row number |
| `entityType` | string | Target entity |
| `sourceKeyHash` | string | Non-sensitive key fingerprint |
| `rowFingerprint` | string | Canonical value fingerprint |
| `outcome` | literal | `created`, `linked`, `unchanged`, `skipped`, `warning`, `failed`, or `conflict` |
| `targetExternalId` | string or null | Resulting target link |
| `diagnosticCodes` | string[] | Safe machine-readable codes |
| `createdAt` | ISO string | Result time |

Do not store raw row JSON or private cell values in this table.

Indexes:

- `by_run_row_key`;
- `by_run_outcome`; and
- `by_organization_run`.

### `importRecordLinks`

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Stable provenance-link ID |
| `organizationId` | string | Authorization scope |
| `entityType` | string | Target module |
| `sourceNamespace` | string | Approved source system |
| `sourceKeyHash` | string | Stable, non-sensitive source identity |
| `targetExternalId` | string | Existing or created business record |
| `firstImportRunId` | string | Creation/link provenance |
| `lastImportRunId` | string | Last exact reconciliation |
| `sourceRowFingerprint` | string | Last approved imported representation |
| `targetFingerprintAtImport` | string | Conflict detection baseline |
| `createdAt` / `updatedAt` | ISO string | Provenance lifecycle |

Indexes:

- `by_organization_source` across organization, entity type, namespace, and source-key hash;
- `by_organization_target`; and
- `by_last_import_run`.

Uniqueness is enforced transactionally in mutations because Convex indexes do not independently create a uniqueness constraint.

## 12. Authorization and API design

### Permission model

Add a named `import:manage` permission.

- Owner receives it by default.
- Admin receives it only after the product owner approves that delegation.
- Manager, Member, and Viewer do not receive it.
- Import target comparison queries and mutations call `requirePermission` and derive `organizationId` from the authenticated membership.
- The browser or script cannot provide an actor, organization, role, or unrestricted target table name.

### Route and command behavior

The implementation may expose thin authenticated routes used by the operator command:

- `POST /api/imports/dry-run`: parse, normalize, compare, and return/stream a report; no mutations;
- `POST /api/imports/apply`: require the same source plus expected plan digest and explicit confirmation;
- `GET /api/imports/:runId`: return a permission-filtered status and reconciliation summary; and
- `POST /api/imports/:runId/resume`: resume only the same source/mapping/plan.

Requirements:

- Clerk session and MFA policy apply to privileged operators.
- Apply/resume reject when `DEPLOYMENT_READ_ONLY=true`.
- A separate `IMPORTS_ENABLED=true` flag is required in addition to normal write enablement.
- Requests enforce allowed file types, maximum byte size, decompression limits, row limits, and timeouts.
- Raw workbook bytes are never logged or stored by the route.
- CSRF/origin checks, private no-store responses, request IDs, and safe error mapping follow the Phase 1 gateway pattern.
- Convex mutations use entity-specific canonical arguments and validators.

If source volume exceeds safe request/runtime limits, the same contracts move to a reviewed local operator command and resumable Convex calls. Volume must be measured during inventory before finalizing transport.

## 13. Apply state machine and transaction behavior

```text
no run
  -> applying
       -> completed
       -> failed -> applying (resume with identical digests)
       -> cancelled
```

- `beginImportRun` verifies permission, environment gates, plan uniqueness, expected totals, and no conflicting active run.
- Rows are topologically ordered by dependency: reference/member links, goals/projects, then dependent tasks/leads/content/finance according to the approved mapping.
- `applyImportBatch` accepts a bounded list of canonical entity-specific rows.
- Each mutation revalidates inputs, source links, target scope, parent links, and row-result uniqueness.
- The business record, provenance link, row result, and import-sourced activity event are committed in one Convex transaction for each batch.
- A batch containing a runtime conflict commits none of that batch. Already completed earlier batches remain resumable.
- `completeImportRun` independently recomputes target counts/totals and refuses completion on any delta or unresolved failure.
- Cancellation stops future batches; it does not pretend completed writes were undone.
- One organization may have only one active apply run for this source namespace.

Batch size starts conservatively (for example 25-50 rows) and is finalized after synthetic load testing against Convex limits. It is configuration, not a mapping decision.

## 14. Reconciliation report

The private detailed report includes:

- source fingerprint, mapping version, plan digest, environment, and timestamp;
- per-sheet source rows, excluded blanks, canonical rows, and source duplicates;
- per-entity create, link, unchanged, skip, warning, invalid, conflict, and failed counts;
- every diagnostic with sheet, row, field, code, severity, and redacted message;
- unresolved owner/status/relationship mappings;
- source, normalized, and applied financial totals in integer paisha by currency and category/status;
- relationship totals and orphan counts;
- existing-target candidate/conflict counts;
- pre/post target record counts;
- activity/provenance counts; and
- a final pass/fail decision with blocking reasons.

The sanitized repository/PR summary includes only safe aggregate counts, hashes, versions, diagnostic codes, and zero-delta evidence. It must not reveal client names, contacts, amounts not approved for disclosure, or raw source values.

### Completion equations

For each mapped entity:

```text
source candidate rows
= canonical valid rows
 + skipped rows
 + invalid rows
 + duplicate rows excluded by approved policy
```

For apply:

```text
canonical valid rows
= created
 + linked existing
 + unchanged
 + conflicts
 + failed
```

Completion requires `conflicts = 0`, `failed = 0`, and every approved financial delta to equal zero. Warnings require review but may be accepted only by the named data approver.

## 15. Diagnostics

Diagnostics use stable codes and severity (`info`, `warning`, or `error`). Initial categories include:

- `SOURCE_UNSUPPORTED_FEATURE`
- `SOURCE_STALE_FORMULA`
- `HEADER_MISSING`
- `HEADER_DUPLICATE`
- `REQUIRED_VALUE_MISSING`
- `VALUE_TYPE_INVALID`
- `DATE_AMBIGUOUS`
- `MONEY_PRECISION_INVALID`
- `CURRENCY_UNKNOWN`
- `OWNER_UNKNOWN`
- `OWNER_AMBIGUOUS`
- `STATUS_UNMAPPED`
- `SOURCE_KEY_MISSING`
- `SOURCE_KEY_CONFLICT`
- `PARENT_NOT_FOUND`
- `TARGET_MATCH_AMBIGUOUS`
- `TARGET_ALREADY_LINKED`
- `TARGET_CHANGED_SINCE_IMPORT`
- `PLAN_DIGEST_MISMATCH`
- `ENVIRONMENT_WRITE_DISABLED`
- `RECONCILIATION_DELTA`

Messages are safe for operator display. Detailed source values are shown only in the private local report and are redacted from server logs.

## 16. Test strategy

### Synthetic fixtures

Create small non-confidential workbooks covering:

- each supported sheet/entity;
- 1900 and 1904 date systems;
- formulas with cached values and formula errors;
- BDT integers, decimals, commas, negatives, blanks, and invalid precision;
- hidden sheets/rows and unsupported links;
- duplicate headers, duplicate keys, missing keys, and orphan relationships;
- known and unknown owners/statuses;
- exact reruns, partial runs, changed-source reruns, and changed-target conflicts; and
- deliberately sensitive-looking values to prove redaction.

### Unit tests

- mapping schema validation and coverage;
- source key and deterministic ID generation;
- date, timezone, money, blank, status, and owner transforms;
- row and plan digest stability;
- duplicate classification;
- reconciliation arithmetic; and
- diagnostic redaction.

### Integration tests

- dry run leaves all Convex table counts and checksums unchanged;
- unauthorized, non-member, deactivated, Manager, Member, and Viewer access fails;
- wrong-organization source links and target IDs fail closed;
- Owner and an explicitly approved Admin path behave as encoded;
- apply creates business record, link, result, and activity atomically;
- exact rerun creates no duplicate business or provenance records;
- batch failure writes none of that batch;
- resume continues after the last committed row;
- completion fails on count, relationship, or finance deltas;
- plan/source/mapping digest mismatches fail;
- read-only or disabled environments reject apply; and
- import diagnostics contain no raw private row payload.

### Manual rehearsal

On an isolated Development deployment:

1. Record baseline table counts and checksums.
2. Run dry run and prove the baseline is unchanged.
3. Review and sign the plan digest and totals.
4. Apply the synthetic/approved safe rehearsal file.
5. Interrupt one run and verify resume.
6. Rerun the completed source and verify no duplicates.
7. Change a source row and a target row separately and verify both become conflicts.
8. Reconcile counts, relationships, finance, provenance, and activity.
9. Exercise the Development cleanup/restore procedure.
10. Disable `IMPORTS_ENABLED` after the rehearsal.

## 17. Implementation work packages

Each work package should be a focused issue/sub-issue and normally one pull request. Sizes are relative complexity, not calendar estimates.

### P2-01 — Secure the approved source snapshot

Size: S

Depends on: none

Deliverables:

- confirm data owner, source owner, private transfer method, and snapshot cutoff;
- fingerprint the exact read-only source;
- classify sensitive data and approved environments; and
- record unsupported or encrypted workbook features.

Acceptance:

- one immutable source snapshot is unambiguous;
- the source never enters Git;
- custody and privacy decisions have named owners; and
- the original file remains unchanged.

### P2-02 — Inventory workbook structure and data quality

Size: M

Depends on: P2-01

Deliverables:

- read-only inventory scanner;
- private detailed inventory;
- sanitized repository inventory;
- formula, validation, relationship, and duplicate analysis; and
- open-decision register.

Acceptance:

- every populated sheet and column is accounted for;
- hidden and formula-driven data is explicit;
- unsupported features are blocking rather than silently ignored; and
- private cell contents are absent from Git and logs.

### P2-03 — Approve mapping and reconciliation contract

Size: M

Depends on: P2-02

Deliverables:

- versioned machine-readable mapping;
- owner, status, date, money, null, and relationship rules;
- stable source keys and existing-record decisions;
- reconciliation measures; and
- approved handling for every open decision.

Acceptance:

- every populated source column has one handling classification;
- all blocking decisions are closed by a named approver;
- mapping coverage tests pass; and
- Issue #6 can be unblocked without hidden assumptions.

### P2-04 — Add import schema and permission foundation

Size: M

Depends on: P2-03

Deliverables:

- additive `importRuns`, `importRowResults`, and `importRecordLinks` tables/indexes;
- `import:manage` policy decision and tests;
- import state-transition helpers; and
- updated data-model and architecture documentation.

Acceptance:

- existing records validate unchanged;
- organization and role boundaries fail closed;
- uniqueness is enforced transactionally; and
- schema verification passes on empty and populated Development data.

### P2-05 — Implement parser, normalizer, and pure dry run

Size: L

Depends on: P2-03

Deliverables:

- format-limited workbook parser with safety limits;
- entity-specific normalization and validation;
- duplicate/relationship analysis;
- authenticated target comparison;
- detailed/private and sanitized report generation; and
- stable source, row, and plan digests.

Acceptance:

- source files are never modified;
- dry run makes zero database changes;
- every error identifies source location and code;
- unsupported values never receive guessed mappings; and
- repeated dry runs produce the same plan digest for identical inputs and target state.

### P2-06 — Implement idempotent, resumable apply

Size: L

Depends on: P2-04, P2-05

Deliverables:

- begin, batch, resume, cancel, and complete import operations;
- entity-specific write adapters;
- atomic business/provenance/result/activity writes;
- exact-rerun detection; and
- conflict-safe partial-run recovery.

Acceptance:

- exact reruns create no duplicates;
- batch failure creates no partial batch;
- interrupted runs resume safely;
- changed source/target data is not overwritten; and
- completed runs reconcile with zero blocking deltas.

### P2-07 — Add operator workflow and guardrails

Size: M

Depends on: P2-05, P2-06

Deliverables:

- authenticated dry-run/apply/resume interface or command;
- source/mapping/plan review screen or terminal summary;
- explicit digest confirmation;
- environment/read-only/import-enabled guards; and
- progress and safe failure reporting.

Acceptance:

- an operator can distinguish Development from Production;
- apply cannot start accidentally from a dry-run command;
- raw source values do not appear in normal logs; and
- privilege and MFA checks match the approved policy.

### P2-08 — Verify recovery and reconciliation

Size: M

Depends on: P2-06, P2-07

Deliverables:

- automated import test suite;
- isolated Development rehearsal evidence;
- exact-rerun and interrupted-resume evidence;
- import runbook and rollback decision tree; and
- sanitized acceptance report.

Acceptance:

- all Issue #6 criteria pass in Development;
- financial totals and counts reconcile;
- recovery paths are exercised, not only documented;
- `IMPORTS_ENABLED` is disabled after rehearsal; and
- Production and Issue #22 remain unchanged.

### P2-09 — Production import release

Size: M

Depends on: P2-08 and explicit Owner approval

Status: deferred; not authorized by this plan request

Deliverables:

- current Production backup and checksum;
- final Production dry-run evidence;
- signed source/mapping/plan identifiers and release window;
- bounded apply, reconciliation, and rollback evidence; and
- post-import access review.

Acceptance:

- every Production gate in section 5 is approved;
- zero blocking deltas remain;
- Production write posture changes only as explicitly approved; and
- Issue #22 is not closed as a side effect of data import.

## 18. Recommended pull-request sequence

```text
PR 1  Phase 2 plan and sanitized inventory tooling
PR 2  Approved source inventory + mapping contract (Issue #5)
PR 3  Import schema, permissions, state machine, and policy tests
PR 4  Parser, normalizer, validation, and pure dry-run reports
PR 5  Idempotent/resumable apply engine and reconciliation
PR 6  Operator workflow, integration tests, and import runbook
PR 7  Development rehearsal evidence and Phase 2 implementation closeout
```

Production import is not bundled into the implementation pull requests. It is a separately approved release operation after the implementation and Development rehearsal are accepted.

## 19. Rollout and rollback

### Stage 0 — Plan only

- Merge the implementation plan after review.
- Do not ingest data or add private artifacts.
- Keep Preview and Production read-only.

### Stage 1 — Inventory and mapping

- Work against the immutable private source snapshot.
- Review the sanitized inventory and all open decisions.
- Approve mapping version 1 before importer application work.

### Stage 2 — Additive implementation

- Add schema, permission, parser, dry-run, apply, and tests.
- Verify against empty and populated isolated Development deployments.
- Do not point Preview or local tooling at Production.

### Stage 3 — Development rehearsal

- Snapshot or use a disposable Development deployment.
- Prove dry-run purity, apply reconciliation, exact rerun, resume, conflicts, and cleanup.
- Record only sanitized evidence.
- Disable import writes after the rehearsal.

### Stage 4 — Production release

- Deferred until explicit Owner approval.
- Follow Gate D and the import runbook.
- Keep normal user writes read-only during the controlled import unless separately approved.

### Failure handling

Before completion:

- stop new batches;
- mark the run failed with a safe code;
- retain completed provenance and row results;
- diagnose and resume only with identical source, mapping, and plan digests; and
- never rerun with an edited spreadsheet under the same fingerprint.

For Development, cleanup may remove only records proven to have been created by the test run, in dependency-safe order, with no unrelated target or activity links.

For a future Production run, the release review chooses one rollback method before apply:

1. resume/fix forward when completed rows are correct and the failure is isolated;
2. run-scoped compensation only for records created by that import, still unchanged, and not referenced by later activity; or
3. restore the verified pre-import Convex snapshot when integrity cannot otherwise be guaranteed.

Production compensation or restore requires explicit Owner approval. Normal business records are never broadly deleted by an automated rollback command.

## 20. Phase 2 acceptance checklist

### Source and mapping

- [ ] Exact private source snapshot and SHA-256 are approved.
- [ ] Every populated sheet/column is inventoried.
- [ ] Every populated column is classified as import, derive, archive, or omit.
- [ ] Owner, status, date, money, formula, null, and relationship rules are approved.
- [ ] Stable source keys and existing-target decisions are approved.
- [ ] No blocking mapping decision remains.

### Security and privacy

- [ ] Raw source and private reports are absent from Git and logs.
- [ ] Import operations require an active authorized membership.
- [ ] Organization scope is derived server-side.
- [ ] Read-only and import-enabled gates are tested.
- [ ] Diagnostic redaction is tested.
- [ ] Production remains unchanged during implementation.

### Dry run

- [ ] Dry run makes no database changes.
- [ ] Row diagnostics identify location and stable error code.
- [ ] Duplicate, relationship, existing-target, and financial analysis is complete.
- [ ] Identical inputs and target state produce an identical plan digest.
- [ ] The data owner approves the report and digest.

### Apply and recovery

- [ ] Apply uses the reviewed source, mapping, and plan digests.
- [ ] Business, provenance, row-result, and activity writes are atomic per batch.
- [ ] Exact rerun creates no duplicates.
- [ ] Interrupted apply resumes without recreating completed rows.
- [ ] Source and target changes become explicit conflicts.
- [ ] Failed behavior is recoverable and rehearsed.

### Reconciliation

- [ ] Source/imported/skipped/warning/failed counts reconcile per module.
- [ ] Relationship and orphan counts reconcile.
- [ ] Financial source, normalized, and applied totals match in integer paisha.
- [ ] Target record and provenance counts match expected totals.
- [ ] Zero unresolved conflict or failed rows remain at completion.

## 21. Definition of done

Phase 2 implementation is complete when Issues #5 and #6 meet their acceptance criteria in an isolated Development environment, the mapping is approved, automated tests pass, an exact rerun is proven idempotent, an interrupted run is proven resumable, reconciliation has zero blocking deltas, and the operator/rollback runbook can be followed by a second maintainer.

That definition does not include a Production import. Production remains unchanged and read-only until the Owner separately approves the Production gate. Issue #22 remains open unless the Owner explicitly authorizes and accepts its independent auth cutover work.
