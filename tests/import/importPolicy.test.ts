import assert from "node:assert/strict";
import test from "node:test";
import { assertImportWriteEnabled, canTransitionImportRun, importRunStatuses } from "../../convex/lib/importPolicy.ts";

test("import run transitions are explicit", () => {
  assert.deepEqual(importRunStatuses, ["applying", "completed", "failed", "cancelled"]);
  assert.equal(canTransitionImportRun("applying", "completed"), true);
  assert.equal(canTransitionImportRun("applying", "failed"), true);
  assert.equal(canTransitionImportRun("failed", "applying"), true);
  assert.equal(canTransitionImportRun("completed", "applying"), false);
  assert.equal(canTransitionImportRun("cancelled", "applying"), false);
});

test("import writes require both write and import gates", () => {
  assert.doesNotThrow(() => assertImportWriteEnabled({ deploymentReadOnly: "false", importsEnabled: "true" }));
  assert.throws(() => assertImportWriteEnabled({ deploymentReadOnly: "true", importsEnabled: "true" }), /ENVIRONMENT_WRITE_DISABLED/);
  assert.throws(() => assertImportWriteEnabled({ deploymentReadOnly: "false", importsEnabled: "false" }), /IMPORTS_DISABLED/);
  assert.throws(() => assertImportWriteEnabled({}), /IMPORTS_DISABLED/);
});
