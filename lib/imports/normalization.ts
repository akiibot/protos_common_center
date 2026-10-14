import { z } from "zod";

export type ImportDiagnostic = {
  code: string;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type TransformResult = {
  value: unknown;
  diagnostics: ImportDiagnostic[];
};

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const integerPattern = /^[+-]?\d+$/;
const decimalPattern = /^[+-]?(?:\d+|\d*\.\d+)$/;

function diagnostic(code: string, field: string, message: string, severity: "error" | "warning" = "error"): ImportDiagnostic {
  return { code, field, message, severity };
}

function isBlank(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function requiredValue(value: unknown, field: string, required: boolean, defaultValue?: unknown): TransformResult | null {
  if (!isBlank(value)) return null;
  if (defaultValue !== undefined) {
    return {
      value: defaultValue,
      diagnostics: [diagnostic("DEFAULT_APPLIED", field, "An approved default was applied", "warning")],
    };
  }
  if (required) {
    return {
      value: null,
      diagnostics: [diagnostic("REQUIRED_VALUE_MISSING", field, "A required value is missing")],
    };
  }
  return { value: null, diagnostics: [] };
}

export function normalizeTrimmedString(value: unknown, field: string, required: boolean, defaultValue?: unknown): TransformResult {
  const empty = requiredValue(value, field, required, defaultValue);
  if (empty) return empty;
  if (typeof value !== "string") {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "Expected a text value")] };
  }
  return { value: value.trim(), diagnostics: [] };
}

export function normalizeMappedString(
  value: unknown,
  field: string,
  required: boolean,
  valueMap: Record<string, string>,
  defaultValue?: unknown,
): TransformResult {
  const empty = requiredValue(value, field, required, defaultValue);
  if (empty) return empty;
  if (typeof value !== "string") {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "Expected a controlled text value")] };
  }
  const normalized = value.trim().toLocaleLowerCase("en-US");
  const match = Object.entries(valueMap).find(([source]) => source.trim().toLocaleLowerCase("en-US") === normalized);
  if (!match) {
    return { value: null, diagnostics: [diagnostic("STATUS_UNMAPPED", field, "The source value has no approved mapping")] };
  }
  return { value: match[1], diagnostics: [] };
}

export function normalizeDateOnly(value: unknown, field: string, required: boolean, defaultValue?: unknown): TransformResult {
  const empty = requiredValue(value, field, required, defaultValue);
  if (empty) return empty;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "The date is invalid")] };
    }
    return { value: value.toISOString().slice(0, 10), diagnostics: [] };
  }
  if (typeof value !== "string") {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "Expected an ISO date-only value")] };
  }
  const match = dateOnlyPattern.exec(value.trim());
  if (!match) {
    return { value: null, diagnostics: [diagnostic("DATE_AMBIGUOUS", field, "Date must use YYYY-MM-DD")] };
  }
  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "The date does not exist")] };
  }
  return { value: `${year}-${month}-${day}`, diagnostics: [] };
}

export function normalizeInteger(value: unknown, field: string, required: boolean, defaultValue?: unknown): TransformResult {
  const empty = requiredValue(value, field, required, defaultValue);
  if (empty) return empty;
  const candidate = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!integerPattern.test(candidate)) {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "Expected a whole number")] };
  }
  const parsed = Number(candidate);
  if (!Number.isSafeInteger(parsed)) {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "The whole number is outside the supported range")] };
  }
  return { value: parsed, diagnostics: [] };
}

export function normalizeMoneyToPaisha(value: unknown, field: string, required: boolean, defaultValue?: unknown): TransformResult {
  const empty = requiredValue(value, field, required, defaultValue);
  if (empty) return empty;
  let candidate: string;
  if (typeof value === "number") {
    candidate = value.toString();
  } else if (typeof value === "string") {
    candidate = value.trim().replaceAll(",", "");
    if (/^\(.*\)$/.test(candidate)) candidate = `-${candidate.slice(1, -1)}`;
  } else {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "Expected a BDT amount")] };
  }
  if (!decimalPattern.test(candidate)) {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "Expected a numeric BDT amount")] };
  }
  const unsigned = candidate.replace(/^[+-]/, "");
  const [whole, fraction = ""] = unsigned.split(".");
  if (fraction.length > 2) {
    return { value: null, diagnostics: [diagnostic("MONEY_PRECISION_INVALID", field, "BDT amounts may have at most two decimal places")] };
  }
  const sign = candidate.startsWith("-") ? -1 : 1;
  const paisha = sign * (Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0") || "0"));
  if (!Number.isSafeInteger(paisha)) {
    return { value: null, diagnostics: [diagnostic("VALUE_TYPE_INVALID", field, "The amount is outside the supported range")] };
  }
  return { value: paisha, diagnostics: [] };
}

export const supportedTransforms = ["trimmed_string", "mapped_string", "date_only", "integer", "money_bdt_to_paisha"] as const;
export const transformNameSchema = z.enum(supportedTransforms);

export function applyTransform(input: {
  transform: string;
  value: unknown;
  field: string;
  required: boolean;
  defaultValue?: unknown;
  valueMap?: Record<string, string>;
}): TransformResult {
  const transform = transformNameSchema.safeParse(input.transform);
  if (!transform.success) {
    return { value: null, diagnostics: [diagnostic("TRANSFORM_UNSUPPORTED", input.field, "The configured transform is unsupported")] };
  }
  switch (transform.data) {
    case "trimmed_string":
      return normalizeTrimmedString(input.value, input.field, input.required, input.defaultValue);
    case "mapped_string":
      return normalizeMappedString(input.value, input.field, input.required, input.valueMap ?? {}, input.defaultValue);
    case "date_only":
      return normalizeDateOnly(input.value, input.field, input.required, input.defaultValue);
    case "integer":
      return normalizeInteger(input.value, input.field, input.required, input.defaultValue);
    case "money_bdt_to_paisha":
      return normalizeMoneyToPaisha(input.value, input.field, input.required, input.defaultValue);
  }
}
