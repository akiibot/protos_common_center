import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildDryRunPlan } from "../../lib/imports/dryRun.ts";
import { importMappingSchema } from "../../lib/imports/mapping.ts";
import { sanitizedDryRunReport } from "../../lib/imports/report.ts";
import { parseMappedWorkbook } from "../../lib/imports/workbookParser.ts";
import { assertPrivateImportOutputPath } from "./lib/output-path.mts";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = argument("--input");
const mappingPath = argument("--mapping");
const outputDirectory = argument("--output-dir");
const organizationId = argument("--organization-id");

if (!input || !mappingPath || !outputDirectory || !organizationId) {
  console.error("Usage: npm run import:dry-run -- --input <workbook.xlsx> --mapping <mapping.json> --output-dir <private-directory> --organization-id <development-organization-id>");
  process.exitCode = 2;
} else {
  const repositoryRoot = process.cwd();
  const privateOutputDirectory = assertPrivateImportOutputPath(repositoryRoot, outputDirectory);
  const mapping = importMappingSchema.parse(JSON.parse(await readFile(path.resolve(mappingPath), "utf8")));
  const parsed = await parseMappedWorkbook(path.resolve(input), mapping);
  const plan = buildDryRunPlan({ organizationId, mapping, sourceRows: parsed.rows });
  const sanitized = sanitizedDryRunReport(plan, parsed.diagnostics);

  await mkdir(privateOutputDirectory, { recursive: true, mode: 0o700 });
  const privateReportPath = path.join(privateOutputDirectory, "dry-run.private.json");
  const sanitizedReportPath = path.join(privateOutputDirectory, "dry-run.sanitized.json");
  await writeFile(privateReportPath, `${JSON.stringify({ parserDiagnostics: parsed.diagnostics, plan }, null, 2)}\n`, { mode: 0o600 });
  await writeFile(sanitizedReportPath, `${JSON.stringify(sanitized, null, 2)}\n`, { mode: 0o600 });

  console.log(JSON.stringify({
    passed: sanitized.passed,
    sourceSha256: sanitized.sourceSha256,
    mappingVersion: sanitized.mappingVersion,
    planDigest: sanitized.planDigest,
    counts: sanitized.counts,
    parserErrorCount: sanitized.parserErrorCount,
    privateReportPath,
    sanitizedReportPath,
  }));
  if (!sanitized.passed) process.exitCode = 1;
}
