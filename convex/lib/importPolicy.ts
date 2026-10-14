export const importRunStatuses = ["applying", "completed", "failed", "cancelled"] as const;
export type ImportRunStatus = (typeof importRunStatuses)[number];

const allowedTransitions: Readonly<Record<ImportRunStatus, ReadonlySet<ImportRunStatus>>> = {
  applying: new Set(["completed", "failed", "cancelled"]),
  completed: new Set(),
  failed: new Set(["applying", "cancelled"]),
  cancelled: new Set(),
};

export function canTransitionImportRun(current: ImportRunStatus, next: ImportRunStatus) {
  return allowedTransitions[current].has(next);
}

export function assertImportWriteEnabled(environment: { deploymentReadOnly?: string; importsEnabled?: string }) {
  if (environment.deploymentReadOnly === "true") throw new Error("ENVIRONMENT_WRITE_DISABLED");
  if (environment.importsEnabled !== "true") throw new Error("IMPORTS_DISABLED");
}
