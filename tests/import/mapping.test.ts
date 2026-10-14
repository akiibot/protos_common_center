import assert from "node:assert/strict";
import test from "node:test";
import draftMapping from "../../config/import/command-center.v1.json" with { type: "json" };
import { digestCanonicalValue, stableJson } from "../../lib/imports/digests.ts";
import { assertMappingReady, importMappingSchema } from "../../lib/imports/mapping.ts";

test("the checked-in mapping shell is valid but deliberately blocked", () => {
  const parsed = importMappingSchema.parse(draftMapping);
  assert.throws(() => assertMappingReady(parsed), /not approved/);
  assert.ok(parsed.blockingDecisions.length > 0);
  assert.equal(parsed.sourceSha256, "e077ad998af485300276ba41bb91b3829e44af084c04e80143486d841fa57120");
});

test("mapping schema rejects an imported field without a target", () => {
  const result = importMappingSchema.safeParse({
    ...draftMapping,
    fieldMappings: [{
      sourceSheet: "Tasks",
      sourceHeader: "Task",
      handling: "import",
      targetEntity: null,
      targetField: null,
      transform: "trimmed_string",
      required: true,
      valueMap: {},
      sensitivity: "internal",
      decision: { status: "open", rationale: "Awaiting mapping", approvedBy: null },
    }],
  });
  assert.equal(result.success, false);
});

test("mapping schema rejects transforms that do not fail closed", () => {
  const result = importMappingSchema.safeParse({
    ...draftMapping,
    fieldMappings: [{
      sourceSheet: "Tasks",
      sourceHeader: "Task",
      handling: "import",
      targetEntity: "task",
      targetField: "title",
      transform: "guess_from_context",
      required: true,
      valueMap: {},
      sensitivity: "internal",
      decision: { status: "approved", rationale: "Synthetic invalid mapping", approvedBy: "test-owner" },
    }],
  });
  assert.equal(result.success, false);
});

test("canonical digests ignore object key order but preserve array order", () => {
  assert.equal(stableJson({ b: 2, a: 1 }), stableJson({ a: 1, b: 2 }));
  assert.equal(digestCanonicalValue({ b: 2, a: 1 }), digestCanonicalValue({ a: 1, b: 2 }));
  assert.notEqual(digestCanonicalValue([1, 2]), digestCanonicalValue([2, 1]));
});
