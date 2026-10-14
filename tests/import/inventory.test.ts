import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ExcelJS from "exceljs";
import { inventoryWorkbook } from "../../scripts/import/lib/inventory.mts";

test("inventory reports workbook structure without exposing cell values", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "protos-import-"));
  const workbookPath = path.join(directory, "private-source.xlsx");
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Tasks");
    sheet.addRow(["Task", "Owner", "Budget"]);
    sheet.addRow(["Private client launch", "Private Person", 125.5]);
    sheet.addRow(["Second private task", "Private Person", { formula: "C2*2", result: 251 }]);
    sheet.getCell("B2").dataValidation = { type: "list", allowBlank: false, formulae: ['"Private Person,Other"'] };
    sheet.getRow(3).hidden = true;
    sheet.getColumn(3).numFmt = "#,##0.00";
    await workbook.xlsx.writeFile(workbookPath);

    const inventory = await inventoryWorkbook(workbookPath, "approved-test-snapshot");
    const serialized = JSON.stringify(inventory);
    assert.equal(inventory.workbook.sheetCount, 1);
    assert.equal(inventory.sheets[0].headerRow, 1);
    assert.equal(inventory.sheets[0].formulaCount, 1);
    assert.equal(inventory.sheets[0].validationCount, 1);
    assert.equal(inventory.sheets[0].hiddenRowCount, 1);
    assert.equal(inventory.sheets[0].columns[1].distinctValueCount, 1);
    assert.equal(inventory.source.label, "approved-test-snapshot");
    assert.match(inventory.source.sha256, /^[a-f0-9]{64}$/);
    assert.equal(serialized.includes("Private client launch"), false);
    assert.equal(serialized.includes("Private Person"), false);
    assert.equal(serialized.includes("C2*2"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("inventory rejects unsupported formats", async () => {
  await assert.rejects(() => inventoryWorkbook("source.xlsm", "unsafe"), /Only .xlsx/);
});
