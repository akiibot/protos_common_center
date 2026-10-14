import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { inventoryWorkbook } from "./lib/inventory.mts";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = argument("--input");
const output = argument("--output");
const sourceLabel = argument("--source-label") ?? "private-workbook";

if (!input || !output) {
  console.error("Usage: npm run import:inventory -- --input <workbook.xlsx> --output <inventory.json> [--source-label <safe-label>]");
  process.exitCode = 2;
} else {
  const inventory = await inventoryWorkbook(path.resolve(input), sourceLabel);
  const outputPath = path.resolve(output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify({
    output: outputPath,
    sourceSha256: inventory.source.sha256,
    sheets: inventory.workbook.sheetCount,
    warnings: inventory.warnings.length,
  }));
}
