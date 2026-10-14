import path from "node:path";

export function assertPrivateImportOutputPath(repositoryRoot: string, outputDirectory: string) {
  const root = path.resolve(repositoryRoot);
  const output = path.resolve(outputDirectory);
  const relative = path.relative(root, output);
  const isOutsideRepository = relative.startsWith(`..${path.sep}`) || relative === "..";
  const ignoredImportRoot = path.join(root, "artifacts", "import");
  const insideIgnoredImportRoot = output === ignoredImportRoot || output.startsWith(`${ignoredImportRoot}${path.sep}`);
  if (!isOutsideRepository && !insideIgnoredImportRoot) {
    throw new Error("Private import reports must be written outside the repository or under artifacts/import");
  }
  return output;
}
