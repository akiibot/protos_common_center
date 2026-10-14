import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTransform,
  normalizeDateOnly,
  normalizeMappedString,
  normalizeMoneyToPaisha,
} from "../../lib/imports/normalization.ts";

test("money normalization converts BDT to integer paisha without floating point rounding", () => {
  assert.deepEqual(normalizeMoneyToPaisha("1,250.50", "amount", true), { value: 125050, diagnostics: [] });
  assert.deepEqual(normalizeMoneyToPaisha("(12.05)", "amount", true), { value: -1205, diagnostics: [] });
  assert.equal(normalizeMoneyToPaisha("10.009", "amount", true).diagnostics[0].code, "MONEY_PRECISION_INVALID");
});

test("date-only normalization rejects ambiguous and impossible dates", () => {
  assert.equal(normalizeDateOnly("2026-10-15", "dueDate", true).value, "2026-10-15");
  assert.equal(normalizeDateOnly("15/10/2026", "dueDate", true).diagnostics[0].code, "DATE_AMBIGUOUS");
  assert.equal(normalizeDateOnly("2026-02-30", "dueDate", true).diagnostics[0].code, "VALUE_TYPE_INVALID");
});

test("controlled mappings are case-insensitive but never guess unknown values", () => {
  const valueMap = { "in progress": "In Progress", done: "Done" };
  assert.equal(normalizeMappedString(" IN PROGRESS ", "status", true, valueMap).value, "In Progress");
  assert.equal(normalizeMappedString("almost done", "status", true, valueMap).diagnostics[0].code, "STATUS_UNMAPPED");
});

test("required blanks fail and approved defaults produce an explicit warning", () => {
  const missing = applyTransform({ transform: "trimmed_string", value: "  ", field: "title", required: true });
  assert.equal(missing.diagnostics[0].code, "REQUIRED_VALUE_MISSING");

  const defaulted = applyTransform({
    transform: "trimmed_string",
    value: null,
    field: "status",
    required: true,
    defaultValue: "Backlog",
  });
  assert.equal(defaulted.value, "Backlog");
  assert.equal(defaulted.diagnostics[0].code, "DEFAULT_APPLIED");
});

test("unknown transform names fail closed", () => {
  const result = applyTransform({ transform: "best_guess", value: "x", field: "title", required: true });
  assert.equal(result.value, null);
  assert.equal(result.diagnostics[0].code, "TRANSFORM_UNSUPPORTED");
});
