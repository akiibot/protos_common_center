import { digestCanonicalValue } from "./digests.ts";
import { assertMappingReady, type ImportMapping } from "./mapping.ts";
import { applyTransform, type ImportDiagnostic } from "./normalization.ts";

export type SourceImportRow = {
  sheet: string;
  row: number;
  values: Record<string, unknown>;
};

export type CanonicalImportRow = {
  rowKey: string;
  source: { sheet: string; row: number; sourceKeyHash: string };
  entityType: ImportMapping["entityMappings"][number]["entityType"];
  operation: "create";
  targetExternalId: string;
  parentKeys: string[];
  values: Record<string, unknown>;
  rowFingerprint: string;
  warnings: ImportDiagnostic[];
};

export type LocatedImportDiagnostic = ImportDiagnostic & {
  sheet: string;
  row: number;
  entityType: CanonicalImportRow["entityType"];
};

export type DryRunPlan = {
  mappingVersion: string;
  sourceSha256: string;
  rows: CanonicalImportRow[];
  diagnostics: LocatedImportDiagnostic[];
  counts: {
    source: number;
    canonical: number;
    skippedDuplicate: number;
    invalid: number;
    conflict: number;
    warning: number;
  };
  planDigest: string;
};

function safeKeyPart(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return digestCanonicalValue(value);
}

function located(
  item: ImportDiagnostic,
  source: SourceImportRow,
  entityType: CanonicalImportRow["entityType"],
): LocatedImportDiagnostic {
  return { ...item, sheet: source.sheet, row: source.row, entityType };
}

export function buildDryRunPlan(input: {
  organizationId: string;
  mapping: ImportMapping;
  sourceRows: SourceImportRow[];
}): DryRunPlan {
  assertMappingReady(input.mapping);
  const sourceSha256 = input.mapping.sourceSha256;
  if (!sourceSha256) throw new Error("Approved source fingerprint is required");

  const canonicalRows: CanonicalImportRow[] = [];
  const diagnostics: LocatedImportDiagnostic[] = [];
  const seen = new Map<string, CanonicalImportRow>();
  let skippedDuplicate = 0;
  let invalid = 0;
  let conflict = 0;

  for (const sourceRow of input.sourceRows) {
    const entityMappings = input.mapping.entityMappings
      .filter((entity) => entity.sourceSheet === sourceRow.sheet)
      .sort((left, right) => left.applyOrder - right.applyOrder || left.entityType.localeCompare(right.entityType));

    for (const entity of entityMappings) {
      const sourceKeyParts = entity.sourceKeyFields.map((field) => safeKeyPart(sourceRow.values[field]));
      if (sourceKeyParts.some((part) => part === "")) {
        diagnostics.push(located({
          code: "SOURCE_KEY_MISSING",
          field: entity.sourceKeyFields.join(","),
          message: "A stable source-key value is missing",
          severity: "error",
        }, sourceRow, entity.entityType));
        invalid += 1;
        continue;
      }

      const sourceIdentity = [input.mapping.sourceNamespace, entity.entityType, ...sourceKeyParts].join("\u001f");
      const sourceKeyHash = digestCanonicalValue(sourceIdentity);
      const values: Record<string, unknown> = {};
      const rowDiagnostics: ImportDiagnostic[] = [];
      const fieldMappings = input.mapping.fieldMappings.filter(
        (field) => field.sourceSheet === sourceRow.sheet && field.targetEntity === entity.entityType && field.handling === "import",
      );

      for (const field of fieldMappings) {
        const result = applyTransform({
          transform: field.transform,
          value: sourceRow.values[field.sourceHeader],
          field: field.targetField ?? field.sourceHeader,
          required: field.required,
          defaultValue: field.default,
          valueMap: field.valueMap,
        });
        rowDiagnostics.push(...result.diagnostics);
        if (!result.diagnostics.some((item) => item.severity === "error") && field.targetField) {
          values[field.targetField] = result.value;
        }
      }

      diagnostics.push(...rowDiagnostics.map((item) => located(item, sourceRow, entity.entityType)));
      if (rowDiagnostics.some((item) => item.severity === "error")) {
        invalid += 1;
        continue;
      }

      const rowFingerprint = digestCanonicalValue({ entityType: entity.entityType, values });
      const rowKey = digestCanonicalValue({ entityType: entity.entityType, sourceKeyHash });
      const prior = seen.get(rowKey);
      if (prior) {
        if (prior.rowFingerprint === rowFingerprint) {
          diagnostics.push(located({
            code: "SOURCE_DUPLICATE_IDENTICAL",
            field: entity.sourceKeyFields.join(","),
            message: "An identical source key and row was already included",
            severity: "warning",
          }, sourceRow, entity.entityType));
          skippedDuplicate += 1;
        } else {
          diagnostics.push(located({
            code: "SOURCE_KEY_CONFLICT",
            field: entity.sourceKeyFields.join(","),
            message: "The same source key resolves to different canonical values",
            severity: "error",
          }, sourceRow, entity.entityType));
          conflict += 1;
        }
        continue;
      }

      const canonical: CanonicalImportRow = {
        rowKey,
        source: { sheet: sourceRow.sheet, row: sourceRow.row, sourceKeyHash },
        entityType: entity.entityType,
        operation: "create",
        targetExternalId: `${entity.entityType}_${digestCanonicalValue({
          organizationId: input.organizationId,
          sourceNamespace: input.mapping.sourceNamespace,
          entityType: entity.entityType,
          sourceKeyHash,
        }).slice(0, 24)}`,
        parentKeys: [],
        values,
        rowFingerprint,
        warnings: rowDiagnostics.filter((item) => item.severity === "warning"),
      };
      seen.set(rowKey, canonical);
      canonicalRows.push(canonical);
    }
  }

  canonicalRows.sort((left, right) => left.rowKey.localeCompare(right.rowKey));
  diagnostics.sort((left, right) =>
    left.sheet.localeCompare(right.sheet)
    || left.row - right.row
    || left.entityType.localeCompare(right.entityType)
    || left.code.localeCompare(right.code));
  const counts = {
    source: input.sourceRows.length,
    canonical: canonicalRows.length,
    skippedDuplicate,
    invalid,
    conflict,
    warning: diagnostics.filter((item) => item.severity === "warning").length,
  };
  const planDigest = digestCanonicalValue({
    mappingVersion: input.mapping.mappingVersion,
    sourceSha256,
    rows: canonicalRows.map(({ source, ...row }) => ({ ...row, source: { sheet: source.sheet, sourceKeyHash: source.sourceKeyHash } })),
    counts,
  });

  return {
    mappingVersion: input.mapping.mappingVersion,
    sourceSha256,
    rows: canonicalRows,
    diagnostics,
    counts,
    planDigest,
  };
}
