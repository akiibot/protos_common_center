import type { DryRunPlan } from "./dryRun.ts";
import type { WorkbookParseDiagnostic } from "./workbookParser.ts";

export function sanitizedDryRunReport(plan: DryRunPlan, parserDiagnostics: WorkbookParseDiagnostic[] = []) {
  const diagnosticCodes = [...new Set([
    ...parserDiagnostics.map((item) => item.code),
    ...plan.diagnostics.map((item) => item.code),
  ])].sort();
  const byEntity = Object.fromEntries(
    [...new Set(plan.rows.map((row) => row.entityType))].sort().map((entityType) => [
      entityType,
      {
        canonical: plan.rows.filter((row) => row.entityType === entityType).length,
        errors: plan.diagnostics.filter((item) => item.entityType === entityType && item.severity === "error").length,
        warnings: plan.diagnostics.filter((item) => item.entityType === entityType && item.severity === "warning").length,
      },
    ]),
  );
  return {
    reportVersion: 1,
    mappingVersion: plan.mappingVersion,
    sourceSha256: plan.sourceSha256,
    planDigest: plan.planDigest,
    passed: parserDiagnostics.every((item) => item.severity !== "error") && plan.counts.invalid === 0 && plan.counts.conflict === 0,
    counts: plan.counts,
    parserErrorCount: parserDiagnostics.filter((item) => item.severity === "error").length,
    byEntity,
    diagnosticCodes,
  };
}
