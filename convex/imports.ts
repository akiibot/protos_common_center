import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requirePermission, type AuthorizationContext } from "./lib/auth";
import { assertImportWriteEnabled, canTransitionImportRun } from "./lib/importPolicy";

const sha256Pattern = /^[a-f0-9]{64}$/;
const mappingVersionPattern = /^\d+\.\d+\.\d+$/;
const importEntityTypeValidator = v.union(
  v.literal("member"), v.literal("goal"), v.literal("project"), v.literal("task"),
  v.literal("lead"), v.literal("content"), v.literal("finance"),
);
const countsValidator = v.object({
  created: v.number(), linked: v.number(), unchanged: v.number(), skipped: v.number(),
  warning: v.number(), failed: v.number(), conflict: v.number(),
});

function importError(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

function validateDigest(value: string, field: string) {
  if (!sha256Pattern.test(value)) importError("INVALID_IMPORT_DIGEST", `${field} must be a lowercase SHA-256 digest`);
}

function validateCounts(counts: Record<string, number>) {
  for (const [name, count] of Object.entries(counts)) {
    if (!Number.isSafeInteger(count) || count < 0) importError("INVALID_IMPORT_COUNTS", `${name} must be a non-negative integer`);
  }
}

function requireImportEnvironment() {
  try {
    assertImportWriteEnabled({ deploymentReadOnly: process.env.DEPLOYMENT_READ_ONLY, importsEnabled: process.env.IMPORTS_ENABLED });
  } catch (error) {
    const code = error instanceof Error ? error.message : "IMPORTS_DISABLED";
    importError(code, "Import writes are disabled in this environment");
  }
}

function importActivity(authorization: AuthorizationContext, importRunId: string, action: string, actionType: string, now: string) {
  return {
    id: crypto.randomUUID(), organizationId: authorization.organizationId, actor: authorization.displayName,
    action, entityType: "import_run", entityId: importRunId, createdAt: now,
    actorUserId: authorization.userId, actorMemberId: authorization.memberId,
    actorDisplayNameSnapshot: authorization.displayName, actionType, source: "import" as const,
  };
}

async function getScopedRun(ctx: MutationCtx, organizationId: string, importRunId: string) {
  const run = await ctx.db.query("importRuns").withIndex("by_external_id", (index) => index.eq("id", importRunId)).unique();
  if (!run || run.organizationId !== organizationId) importError("IMPORT_RUN_NOT_FOUND", "Import run not found");
  return run;
}

type ImportEntityType = "member" | "goal" | "project" | "task" | "lead" | "content" | "finance";

function normalizeForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForFingerprint);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "_id" && key !== "_creationTime")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalizeForFingerprint(nested)]));
  }
  return value;
}

async function fingerprintTarget(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeForFingerprint(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getTargetRecord(ctx: QueryCtx, entityType: ImportEntityType, externalId: string) {
  switch (entityType) {
    case "member": return ctx.db.query("members").withIndex("by_external_id", (index) => index.eq("id", externalId)).unique();
    case "goal": return ctx.db.query("goals").withIndex("by_external_id", (index) => index.eq("id", externalId)).unique();
    case "project": return ctx.db.query("projects").withIndex("by_external_id", (index) => index.eq("id", externalId)).unique();
    case "task": return ctx.db.query("tasks").withIndex("by_external_id", (index) => index.eq("id", externalId)).unique();
    case "lead": return ctx.db.query("leads").withIndex("by_external_id", (index) => index.eq("id", externalId)).unique();
    case "content": return ctx.db.query("contentItems").withIndex("by_external_id", (index) => index.eq("id", externalId)).unique();
    case "finance": return ctx.db.query("financeEntries").withIndex("by_external_id", (index) => index.eq("id", externalId)).unique();
  }
}

export const getImportRun = query({
  args: { importRunId: v.string() },
  handler: async (ctx, { importRunId }) => {
    const authorization = await requirePermission(ctx, "import:manage");
    const run = await ctx.db.query("importRuns").withIndex("by_external_id", (index) => index.eq("id", importRunId)).unique();
    if (!run || run.organizationId !== authorization.organizationId) importError("IMPORT_RUN_NOT_FOUND", "Import run not found");
    return run;
  },
});

export const listImportRuns = query({
  args: {},
  handler: async (ctx) => {
    const authorization = await requirePermission(ctx, "import:manage");
    return ctx.db.query("importRuns")
      .withIndex("by_organization_created", (index) => index.eq("organizationId", authorization.organizationId))
      .order("desc").take(20);
  },
});

export const compareImportRows = query({
  args: {
    sourceNamespace: v.string(),
    rows: v.array(v.object({
      rowKey: v.string(), entityType: importEntityTypeValidator, sourceKeyHash: v.string(),
      rowFingerprint: v.string(), targetExternalId: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const authorization = await requirePermission(ctx, "import:manage");
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(args.sourceNamespace)) importError("INVALID_SOURCE_NAMESPACE", "Source namespace is invalid");
    if (args.rows.length > 200) importError("IMPORT_COMPARISON_LIMIT", "At most 200 rows may be compared at once");

    const results = [];
    for (const row of args.rows) {
      validateDigest(row.sourceKeyHash, "sourceKeyHash");
      validateDigest(row.rowFingerprint, "rowFingerprint");
      const links = await ctx.db.query("importRecordLinks")
        .withIndex("by_organization_source", (index) => index
          .eq("organizationId", authorization.organizationId)
          .eq("entityType", row.entityType)
          .eq("sourceNamespace", args.sourceNamespace)
          .eq("sourceKeyHash", row.sourceKeyHash))
        .collect();
      const target = await getTargetRecord(ctx, row.entityType, row.targetExternalId);
      const targetInScope = target?.organizationId === authorization.organizationId ? target : null;

      if (links.length === 0) {
        results.push(targetInScope
          ? { rowKey: row.rowKey, classification: "conflict" as const, diagnosticCode: "TARGET_ALREADY_EXISTS" }
          : { rowKey: row.rowKey, classification: "create" as const, diagnosticCode: null });
        continue;
      }
      if (links.length > 1) {
        results.push({ rowKey: row.rowKey, classification: "conflict" as const, diagnosticCode: "SOURCE_KEY_CONFLICT" });
        continue;
      }
      const link = links[0];
      if (link.targetExternalId !== row.targetExternalId) {
        results.push({ rowKey: row.rowKey, classification: "conflict" as const, diagnosticCode: "TARGET_ALREADY_LINKED" });
        continue;
      }
      if (!targetInScope) {
        results.push({ rowKey: row.rowKey, classification: "conflict" as const, diagnosticCode: "TARGET_CHANGED_SINCE_IMPORT" });
        continue;
      }
      if (link.sourceRowFingerprint !== row.rowFingerprint) {
        results.push({ rowKey: row.rowKey, classification: "conflict" as const, diagnosticCode: "SOURCE_CHANGED_SINCE_IMPORT" });
        continue;
      }
      if (link.targetFingerprintAtImport !== await fingerprintTarget(targetInScope)) {
        results.push({ rowKey: row.rowKey, classification: "conflict" as const, diagnosticCode: "TARGET_CHANGED_SINCE_IMPORT" });
        continue;
      }
      results.push({ rowKey: row.rowKey, classification: "unchanged" as const, diagnosticCode: null });
    }
    return results;
  },
});

export const beginImportRun = mutation({
  args: {
    sourceLabel: v.string(), sourceSha256: v.string(), sourceSnapshotAt: v.string(),
    mappingVersion: v.string(), planDigest: v.string(), expectedCounts: countsValidator,
  },
  handler: async (ctx, args) => {
    const authorization = await requirePermission(ctx, "import:manage");
    requireImportEnvironment();
    validateDigest(args.sourceSha256, "sourceSha256");
    validateDigest(args.planDigest, "planDigest");
    validateCounts(args.expectedCounts);
    if (!mappingVersionPattern.test(args.mappingVersion)) importError("INVALID_MAPPING_VERSION", "Mapping version must use semantic versioning");
    if (!args.sourceLabel.trim() || args.sourceLabel.length > 120) importError("INVALID_SOURCE_LABEL", "Source label is invalid");
    if (!Number.isFinite(Date.parse(args.sourceSnapshotAt))) importError("INVALID_SOURCE_SNAPSHOT", "Source snapshot timestamp is invalid");

    const matchingRuns = await ctx.db.query("importRuns")
      .withIndex("by_organization_plan_digest", (index) => index.eq("organizationId", authorization.organizationId).eq("planDigest", args.planDigest))
      .collect();
    const exactCompleted = matchingRuns.find((run) => run.status === "completed" && run.sourceSha256 === args.sourceSha256 && run.mappingVersion === args.mappingVersion);
    if (exactCompleted) return { importRunId: exactCompleted.id, reused: true };
    if (matchingRuns.some((run) => run.status === "applying")) importError("IMPORT_RUN_ACTIVE", "An import with this plan is already applying");

    const activeRuns = await ctx.db.query("importRuns")
      .withIndex("by_organization_status", (index) => index.eq("organizationId", authorization.organizationId).eq("status", "applying"))
      .collect();
    if (activeRuns.length > 0) importError("IMPORT_RUN_ACTIVE", "Another import is already applying for this organization");

    const now = new Date().toISOString();
    const importRunId = crypto.randomUUID();
    await ctx.db.insert("importRuns", {
      id: importRunId, organizationId: authorization.organizationId, sourceLabel: args.sourceLabel.trim(),
      sourceSha256: args.sourceSha256, sourceSnapshotAt: args.sourceSnapshotAt, mappingVersion: args.mappingVersion,
      planDigest: args.planDigest, status: "applying", startedByUserId: authorization.userId,
      startedByMemberId: authorization.memberId, startedAt: now, completedAt: null,
      expectedCounts: args.expectedCounts, actualCounts: null, lastErrorCode: null, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("activityEvents", importActivity(authorization, importRunId, "started an approved spreadsheet import", "import.started", now));
    return { importRunId, reused: false };
  },
});

export const resumeImportRun = mutation({
  args: { importRunId: v.string(), sourceSha256: v.string(), mappingVersion: v.string(), planDigest: v.string() },
  handler: async (ctx, args) => {
    const authorization = await requirePermission(ctx, "import:manage");
    requireImportEnvironment();
    validateDigest(args.sourceSha256, "sourceSha256");
    validateDigest(args.planDigest, "planDigest");
    const run = await getScopedRun(ctx, authorization.organizationId, args.importRunId);
    if (run.sourceSha256 !== args.sourceSha256 || run.mappingVersion !== args.mappingVersion || run.planDigest !== args.planDigest) {
      importError("PLAN_DIGEST_MISMATCH", "Import source, mapping, or plan does not match the failed run");
    }
    if (!canTransitionImportRun(run.status, "applying")) importError("INVALID_IMPORT_STATE", "This import run cannot be resumed");

    const activeRuns = await ctx.db.query("importRuns")
      .withIndex("by_organization_status", (index) => index.eq("organizationId", authorization.organizationId).eq("status", "applying"))
      .collect();
    if (activeRuns.some((active) => active.id !== run.id)) importError("IMPORT_RUN_ACTIVE", "Another import is already applying");

    const now = new Date().toISOString();
    await ctx.db.patch(run._id, { status: "applying", lastErrorCode: null, updatedAt: now });
    await ctx.db.insert("activityEvents", importActivity(authorization, run.id, "resumed a spreadsheet import", "import.resumed", now));
    return { importRunId: run.id };
  },
});

export const cancelImportRun = mutation({
  args: { importRunId: v.string() },
  handler: async (ctx, { importRunId }) => {
    const authorization = await requirePermission(ctx, "import:manage");
    requireImportEnvironment();
    const run = await getScopedRun(ctx, authorization.organizationId, importRunId);
    if (!canTransitionImportRun(run.status, "cancelled")) importError("INVALID_IMPORT_STATE", "This import run cannot be cancelled");
    const now = new Date().toISOString();
    await ctx.db.patch(run._id, { status: "cancelled", completedAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", importActivity(authorization, run.id, "cancelled a spreadsheet import", "import.cancelled", now));
    return { importRunId: run.id };
  },
});
