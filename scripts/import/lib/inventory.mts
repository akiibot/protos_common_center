import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_SCANNED_CELLS = 250_000;

type ValueType = "blank" | "boolean" | "date" | "error" | "formula" | "number" | "object" | "string";

type ColumnInventory = {
  column: number;
  header: string;
  nonBlankCount: number;
  blankCount: number;
  formulaCount: number;
  validationCount: number;
  distinctValueCount: number;
  valueTypes: Record<ValueType, number>;
  numberFormats: string[];
};

export type WorkbookInventory = {
  inventoryVersion: 1;
  source: {
    label: string;
    sha256: string;
    byteSize: number;
    fileType: "xlsx";
  };
  workbook: {
    dateSystem: "1900" | "1904";
    calculationMode: string | null;
    definedNameCount: number;
    sheetCount: number;
  };
  sheets: Array<{
    name: string;
    state: string;
    rowCount: number;
    actualRowCount: number;
    columnCount: number;
    headerRow: number | null;
    hiddenRowCount: number;
    hiddenColumnCount: number;
    mergedRangeCount: number;
    formulaCount: number;
    validationCount: number;
    columns: ColumnInventory[];
  }>;
  warnings: string[];
};

function blankValueTypes(): Record<ValueType, number> {
  return { blank: 0, boolean: 0, date: 0, error: 0, formula: 0, number: 0, object: 0, string: 0 };
}

function formulaValue(value: ExcelJS.CellValue): value is ExcelJS.CellFormulaValue | ExcelJS.CellSharedFormulaValue {
  return Boolean(value && typeof value === "object" && ("formula" in value || "sharedFormula" in value));
}

function valueType(value: ExcelJS.CellValue): ValueType {
  if (value === null || value === undefined || value === "") return "blank";
  if (formulaValue(value)) return "formula";
  if (value instanceof Date) return "date";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object" && "error" in value) return "error";
  return "object";
}

function normalizedValueHash(value: ExcelJS.CellValue) {
  let normalized: unknown = value;
  if (formulaValue(value)) normalized = value.result ?? null;
  if (value instanceof Date) normalized = value.toISOString();
  if (normalized && typeof normalized === "object") normalized = JSON.stringify(normalized);
  return createHash("sha256").update(String(normalized ?? "")).digest("hex");
}

function displayHeader(cell: ExcelJS.Cell, columnNumber: number) {
  const text = cell.text.trim();
  return text || `Column ${columnNumber}`;
}

function detectHeaderRow(worksheet: ExcelJS.Worksheet) {
  const maximumCandidate = Math.min(worksheet.rowCount, 20);
  for (let rowNumber = 1; rowNumber <= maximumCandidate; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    let populated = 0;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.text.trim()) populated += 1;
    });
    if (populated >= 2) return rowNumber;
  }
  return null;
}

export async function inventoryWorkbook(inputPath: string, sourceLabel: string): Promise<WorkbookInventory> {
  if (path.extname(inputPath).toLowerCase() !== ".xlsx") throw new Error("Only .xlsx workbooks are supported");
  const sourceStat = await stat(inputPath);
  if (!sourceStat.isFile()) throw new Error("Workbook input must be a file");
  if (sourceStat.size > MAX_FILE_BYTES) throw new Error(`Workbook exceeds the ${MAX_FILE_BYTES} byte safety limit`);

  const bytes = await readFile(inputPath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);

  let scannedCells = 0;
  const warnings = [
    "External links, macros, and workbook connections are not supported by this inventory reader and require separate source review.",
    "Formula results are inventoried from cached workbook values; formulas are never executed.",
  ];

  const sheets = workbook.worksheets.map((worksheet) => {
    const headerRow = detectHeaderRow(worksheet);
    const hiddenRowCount = Array.from({ length: worksheet.rowCount }, (_, index) => worksheet.getRow(index + 1)).filter((row) => row.hidden).length;
    const hiddenColumnCount = Array.from({ length: worksheet.columnCount }, (_, index) => worksheet.getColumn(index + 1)).filter((column) => column.hidden).length;
    const columns: ColumnInventory[] = [];
    let sheetFormulaCount = 0;
    let sheetValidationCount = 0;

    for (let columnNumber = 1; columnNumber <= worksheet.columnCount; columnNumber += 1) {
      const types = blankValueTypes();
      const distinctValues = new Set<string>();
      const numberFormats = new Set<string>();
      let nonBlankCount = 0;
      let blankCount = 0;
      let formulaCount = 0;
      let validationCount = 0;
      const dataStart = headerRow ? headerRow + 1 : 1;

      for (let rowNumber = dataStart; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        scannedCells += 1;
        if (scannedCells > MAX_SCANNED_CELLS) throw new Error(`Workbook exceeds the ${MAX_SCANNED_CELLS} scanned-cell safety limit`);
        const cell = worksheet.getCell(rowNumber, columnNumber);
        const type = valueType(cell.value);
        types[type] += 1;
        if (type === "blank") {
          blankCount += 1;
        } else {
          nonBlankCount += 1;
          distinctValues.add(normalizedValueHash(cell.value));
        }
        if (type === "formula") formulaCount += 1;
        if (cell.dataValidation && Object.keys(cell.dataValidation).length > 0) validationCount += 1;
        if (cell.numFmt && cell.numFmt !== "General") numberFormats.add(cell.numFmt);
      }

      sheetFormulaCount += formulaCount;
      sheetValidationCount += validationCount;
      const header = headerRow ? displayHeader(worksheet.getCell(headerRow, columnNumber), columnNumber) : `Column ${columnNumber}`;
      columns.push({
        column: columnNumber,
        header,
        nonBlankCount,
        blankCount,
        formulaCount,
        validationCount,
        distinctValueCount: distinctValues.size,
        valueTypes: types,
        numberFormats: [...numberFormats].sort(),
      });
    }

    return {
      name: worksheet.name,
      state: worksheet.state,
      rowCount: worksheet.rowCount,
      actualRowCount: worksheet.actualRowCount,
      columnCount: worksheet.columnCount,
      headerRow,
      hiddenRowCount,
      hiddenColumnCount,
      mergedRangeCount: worksheet.model.merges?.length ?? 0,
      formulaCount: sheetFormulaCount,
      validationCount: sheetValidationCount,
      columns,
    };
  });

  return {
    inventoryVersion: 1,
    source: {
      label: sourceLabel,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteSize: bytes.byteLength,
      fileType: "xlsx",
    },
    workbook: {
      dateSystem: workbook.properties.date1904 ? "1904" : "1900",
      calculationMode: workbook.calcProperties.fullCalcOnLoad ? "fullCalcOnLoad" : null,
      definedNameCount: workbook.definedNames.model.length,
      sheetCount: workbook.worksheets.length,
    },
    sheets,
    warnings,
  };
}
