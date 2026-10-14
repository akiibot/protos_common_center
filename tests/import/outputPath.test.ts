import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { assertPrivateImportOutputPath } from "../../scripts/import/lib/output-path.mts";

test("private import reports are limited to ignored or external directories", () => {
  const root = path.resolve("/workspace/project");
  assert.equal(
    assertPrivateImportOutputPath(root, "/workspace/project/artifacts/import/run-1"),
    path.resolve("/workspace/project/artifacts/import/run-1"),
  );
  assert.equal(assertPrivateImportOutputPath(root, "/private/import-run"), path.resolve("/private/import-run"));
  assert.throws(
    () => assertPrivateImportOutputPath(root, "/workspace/project/docs/import"),
    /outside the repository or under artifacts\/import/,
  );
});
