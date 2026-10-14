import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { sha256 } from "./digests.ts";
import { assertMappingReady, type ImportMapping } from "./mapping.ts";
import type { SourceImportRow } from "./dryRun.ts";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PARSED_ROWS = 25_000;
const MAX_HEADER_SCAN_ROWS = 20;

export type WorkbookParseDiagnostic = {
  code: string;
  sheet: string;
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ParsedWorkbook = {
  sourceSha256: string;
  rows: SourceImportRow[];
  diagnostics: WorkbookParseDiagnostic[];
};

function formulaValue(value: ExcelJS.CellValue): value is ExcelJS.CellFormulaValue | ExcelJS.CellSharedFormulaValue {
  return Boolean(value && typeof value === "object" && ("formula" in value || "sharedFormula" in value));
}

function mappedValue(cell: ExcelJS.Cell): { value: unknown; error?: string } {
  const value = cell.value;
  if (formulaValue(value)) {
    if (value.result === undefined || value.result === null) return { value: null, error: "SOURCE_STALE_FORMULA" };
    if (typeof value.result === "object" && "error" in value.result) return { value: null, error: "VALUE_TYPE_INVALID" };
    return { value: value.result };
  }
  if (value && typeof value === "object" && "error" in value) return { value: null, error: "VALUE_TYPE_INVALID" };
  if (value && typeof value === "object" && "text" in value) return { value: value.text };
  return { value };
}

function findHeaderRow(worksheet: ExcelJS.Worksheet, requiredHeaders: Set<string>) {
  const limit = Math.min(worksheet.rowCount, MAX_HEADER_SCAN_ROWS);
  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const headers = new Set<string>();
    worksheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell) => {
      const header = cell.text.trim();
      if (header) headers.add(header);
    });
    if ([...requiredHeaders].every((header) => headers.has(header))) return rowNumber;
  }
  return null;
}

function headerColumns(worksheet: ExcelJS.Worksheet, headerRow: number) {
  const columns = new Map<string, number>();
  const duplicates = new Set<string>();
  worksheet.getRow(headerRow).eachCell({ includeEmpty: false }, (cell, column) => {
    const header = cell.text.trim();
    if (!header) return;
    if (columns.has(header)) duplicates.add(header);
    else columns.set(header, column);
  });
  return { columns, duplicates };
}

export async function parseMappedWorkbook(inputPath: string, mapping: ImportMapping): Promise<ParsedWorkbook> {
  assertMappingReady(mapping);
  if (path.extname(inputPath).toLowerCase() !== ".xlsx") throw new Error("Only .xlsx workbooks are supported");
  const sourceStat = await stat(inputPath);
  if (!sourceStat.isFile()) throw new Error("Workbook input must be a file");
  if (sourceStat.size > MAX_FILE_BYTES) throw new Error(`Workbook exceeds the ${MAX_FILE_BYTES} byte safety limit`);

  const bytes = await readFile(inputPath);
  const sourceSha256 = sha256(bytes);
  if (sourceSha256 !== mapping.sourceSha256) throw new Error("SOURCE_FINGERPRINT_MISMATCH: workbook does not match the approved mapping");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const rows: SourceImportRow[] = [];
  const diagnostics: WorkbookParseDiagnostic[] = [];
  const mappedSheets = [...new Set(mapping.entityMappings.map((entity) => entity.sourceSheet))].sort();

  for (const sheetName of mappedSheets) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      diagnostics.push({ code: "SHEET_MISSING", sheet: sheetName, row: 0, field: "", message: "A mapped source sheet is missing", severity: "error" });
      continue;
    }
    const requiredHeaders = new Set([
      ...mapping.entityMappings.filter((entity) => entity.sourceSheet === sheetName).flatMap((entity) => entity.sourceKeyFields),
      ...mapping.fieldMappings.filter((field) => field.sourceSheet === sheetName).map((field) => field.sourceHeader),
    ]);
    const headerRow = findHeaderRow(worksheet, requiredHeaders);
    if (!headerRow) {
      diagnostics.push({ code: "HEADER_MISSING", sheet: sheetName, row: 0, field: "", message: "The mapped header row was not found in the first 20 rows", severity: "error" });
      continue;
    }
    const { columns, duplicates } = headerColumns(worksheet, headerRow);
    for (const header of [...duplicates].sort()) {
      diagnostics.push({ code: "HEADER_DUPLICATE", sheet: sheetName, row: headerRow, field: header, message: "A mapped header appears more than once", severity: "error" });
    }
    if ([...requiredHeaders].some((header) => !columns.has(header)) || [...duplicates].some((header) => requiredHeaders.has(header))) continue;

    for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      if (rows.length >= MAX_PARSED_ROWS) throw new Error(`Workbook exceeds the ${MAX_PARSED_ROWS} parsed-row safety limit`);
      const values: Record<string, unknown> = {};
      let populated = false;
      for (const header of requiredHeaders) {
        const cell = worksheet.getCell(rowNumber, columns.get(header)!);
        const extracted = mappedValue(cell);
        values[header] = extracted.value;
        if (extracted.value !== null && extracted.value !== undefined && extracted.value !== "") populated = true;
        if (extracted.error) {
          diagnostics.push({
            code: extracted.error,
            sheet: sheetName,
            row: rowNumber,
            field: header,
            message: extracted.error === "SOURCE_STALE_FORMULA" ? "A formula has no cached result" : "A cell contains an unsupported error value",
            severity: "error",
          });
        }
      }
      if (populated) rows.push({ sheet: sheetName, row: rowNumber, values });
    }
  }

  diagnostics.sort((left, right) => left.sheet.localeCompare(right.sheet) || left.row - right.row || left.field.localeCompare(right.field));
  return { sourceSha256, rows, diagnostics };
}
