import assert from "node:assert/strict";
import test from "node:test";
import { buildDryRunPlan } from "../../lib/imports/dryRun.ts";
import { importMappingSchema } from "../../lib/imports/mapping.ts";

const approvedMapping = importMappingSchema.parse({
  mappingVersion: "1.0.0",
  status: "approved",
  sourceNamespace: "synthetic-command-center",
  sourceSha256: "a".repeat(64),
  approvedAt: "2026-10-15T00:00:00.000Z",
  approvedBy: "test-owner",
  blockingDecisions: [],
  entityMappings: [{
    entityType: "task",
    sourceSheet: "Tasks",
    sourceKeyFields: ["Task ID"],
    applyOrder: 1,
    parentEntityTypes: [],
    existingTargetPolicy: "create_only",
    reconciliation: { count: true, moneyFields: [] },
  }],
  fieldMappings: [
    {
      sourceSheet: "Tasks",
      sourceHeader: "Title",
      handling: "import",
      targetEntity: "task",
      targetField: "title",
      transform: "trimmed_string",
      required: true,
      valueMap: {},
      sensitivity: "internal",
      decision: { status: "approved", rationale: "Synthetic fixture", approvedBy: "test-owner" },
    },
    {
      sourceSheet: "Tasks",
      sourceHeader: "Status",
      handling: "import",
      targetEntity: "task",
      targetField: "status",
      transform: "mapped_string",
      required: true,
      valueMap: { todo: "Backlog", doing: "In Progress", done: "Done" },
      sensitivity: "internal",
      decision: { status: "approved", rationale: "Synthetic fixture", approvedBy: "test-owner" },
    },
  ],
});

test("dry-run planning is deterministic and does not expose source keys in IDs", () => {
  const sourceRows = [{ sheet: "Tasks", row: 2, values: { "Task ID": "private-001", Title: "  Launch site  ", Status: "DOING" } }];
  const first = buildDryRunPlan({ organizationId: "org_test", mapping: approvedMapping, sourceRows });
  const second = buildDryRunPlan({ organizationId: "org_test", mapping: approvedMapping, sourceRows });
  assert.equal(first.planDigest, second.planDigest);
  assert.equal(first.rows[0].values.title, "Launch site");
  assert.equal(first.rows[0].values.status, "In Progress");
  assert.equal(first.rows[0].targetExternalId.includes("private-001"), false);
});

test("dry-run planning skips identical duplicates and blocks conflicting duplicates", () => {
  const plan = buildDryRunPlan({
    organizationId: "org_test",
    mapping: approvedMapping,
    sourceRows: [
      { sheet: "Tasks", row: 2, values: { "Task ID": "task-1", Title: "First", Status: "todo" } },
      { sheet: "Tasks", row: 3, values: { "Task ID": "task-1", Title: "First", Status: "todo" } },
      { sheet: "Tasks", row: 4, values: { "Task ID": "task-1", Title: "Changed", Status: "todo" } },
    ],
  });
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.counts.skippedDuplicate, 1);
  assert.equal(plan.counts.conflict, 1);
  assert.deepEqual(plan.diagnostics.map((item) => item.code), ["SOURCE_DUPLICATE_IDENTICAL", "SOURCE_KEY_CONFLICT"]);
});

test("dry-run planning reports row locations for missing keys and unmapped values", () => {
  const plan = buildDryRunPlan({
    organizationId: "org_test",
    mapping: approvedMapping,
    sourceRows: [
      { sheet: "Tasks", row: 8, values: { "Task ID": "", Title: "No key", Status: "todo" } },
      { sheet: "Tasks", row: 9, values: { "Task ID": "task-2", Title: "Unknown status", Status: "nearly" } },
    ],
  });
  assert.equal(plan.rows.length, 0);
  assert.deepEqual(plan.diagnostics.map(({ code, row }) => ({ code, row })), [
    { code: "SOURCE_KEY_MISSING", row: 8 },
    { code: "STATUS_UNMAPPED", row: 9 },
  ]);
  assert.equal(plan.counts.invalid, 2);
});
