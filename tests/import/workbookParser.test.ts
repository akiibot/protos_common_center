import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildDryRunPlan } from "../../lib/imports/dryRun.ts";
import { sha256 } from "../../lib/imports/digests.ts";
import { importMappingSchema } from "../../lib/imports/mapping.ts";
import { sanitizedDryRunReport } from "../../lib/imports/report.ts";
import { parseMappedWorkbook } from "../../lib/imports/workbookParser.ts";

function approvedMapping(sourceSha256: string) {
  return importMappingSchema.parse({
    mappingVersion: "1.0.0",
    status: "approved",
    sourceNamespace: "synthetic-command-center",
    sourceSha256,
    approvedAt: "2026-10-15T00:00:00.000Z",
    approvedBy: "test-owner",
    blockingDecisions: [],
    entityMappings: [{
      entityType: "task", sourceSheet: "Tasks", sourceKeyFields: ["Task ID"], applyOrder: 1,
      parentEntityTypes: [], existingTargetPolicy: "create_only", reconciliation: { count: true, moneyFields: [] },
    }],
    fieldMappings: [
      {
        sourceSheet: "Tasks", sourceHeader: "Title", handling: "import", targetEntity: "task", targetField: "title",
        transform: "trimmed_string", required: true, valueMap: {}, sensitivity: "internal",
        decision: { status: "approved", rationale: "Synthetic fixture", approvedBy: "test-owner" },
      },
      {
        sourceSheet: "Tasks", sourceHeader: "Status", handling: "import", targetEntity: "task", targetField: "status",
        transform: "mapped_string", required: true, valueMap: { doing: "In Progress" }, sensitivity: "internal",
        decision: { status: "approved", rationale: "Synthetic fixture", approvedBy: "test-owner" },
      },
    ],
  });
}

test("mapped workbook parsing reads approved headers and cached formula results", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "protos-parser-"));
  const workbookPath = path.join(directory, "approved.xlsx");
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Tasks");
    sheet.addRow(["Task ID", "Title", "Status", "Unmapped private column"]);
    sheet.addRow(["T-1", "Launch", { formula: '"doing"', result: "doing" }, "must not be parsed"]);
    await workbook.xlsx.writeFile(workbookPath);
    const sourceSha256 = sha256(await readFile(workbookPath));
    const parsed = await parseMappedWorkbook(workbookPath, approvedMapping(sourceSha256));
    assert.equal(parsed.diagnostics.length, 0);
    assert.deepEqual(parsed.rows[0].values, { "Task ID": "T-1", Title: "Launch", Status: "doing" });

    const plan = buildDryRunPlan({ organizationId: "org_test", mapping: approvedMapping(sourceSha256), sourceRows: parsed.rows });
    const report = sanitizedDryRunReport(plan, parsed.diagnostics);
    assert.equal(report.passed, true);
    assert.equal(JSON.stringify(report).includes("Launch"), false);
    assert.equal(JSON.stringify(report).includes("T-1"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("mapped workbook parsing rejects a different source fingerprint", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "protos-parser-"));
  const workbookPath = path.join(directory, "changed.xlsx");
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Tasks").addRow(["Task ID", "Title", "Status"]);
    await workbook.xlsx.writeFile(workbookPath);
    await assert.rejects(() => parseMappedWorkbook(workbookPath, approvedMapping("b".repeat(64))), /SOURCE_FINGERPRINT_MISMATCH/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("mapped workbook parsing reports formula cells without cached results", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "protos-parser-"));
  const workbookPath = path.join(directory, "formula.xlsx");
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Tasks");
    sheet.addRow(["Task ID", "Title", "Status"]);
    sheet.addRow(["T-1", "Launch", { formula: "A1" }]);
    await workbook.xlsx.writeFile(workbookPath);
    const sourceSha256 = sha256(await readFile(workbookPath));
    const parsed = await parseMappedWorkbook(workbookPath, approvedMapping(sourceSha256));
    assert.deepEqual(parsed.diagnostics.map((item) => item.code), ["SOURCE_STALE_FORMULA"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
