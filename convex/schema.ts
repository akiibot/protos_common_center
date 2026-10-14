import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const nullableString = v.union(v.string(), v.null());
const nullableUserId = v.union(v.id("users"), v.null());
const accessRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("manager"),
  v.literal("member"),
  v.literal("viewer"),
);
const membershipStatus = v.union(
  v.literal("invited"),
  v.literal("active"),
  v.literal("deactivated"),
);
const importRunStatus = v.union(
  v.literal("applying"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);
const importRowOutcome = v.union(
  v.literal("created"),
  v.literal("linked"),
  v.literal("unchanged"),
  v.literal("skipped"),
  v.literal("warning"),
  v.literal("failed"),
  v.literal("conflict"),
);
const importCounts = v.object({
  created: v.number(),
  linked: v.number(),
  unchanged: v.number(),
  skipped: v.number(),
  warning: v.number(),
  failed: v.number(),
  conflict: v.number(),
});

export default defineSchema({
  organizations: defineTable({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    timezone: v.string(),
    currency: v.string(),
    createdAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_slug", ["slug"]),

  users: defineTable({
    authSubject: v.string(),
    emailNormalized: v.string(),
    displayName: v.string(),
    avatarUrl: nullableString,
    createdAt: v.string(),
    updatedAt: v.string(),
    lastSeenAt: nullableString,
  })
    .index("by_auth_subject", ["authSubject"])
    .index("by_email_normalized", ["emailNormalized"]),

  memberships: defineTable({
    id: v.string(),
    organizationId: v.string(),
    userId: nullableUserId,
    memberId: v.string(),
    invitedEmailNormalized: v.string(),
    accessRole,
    status: membershipStatus,
    invitedByUserId: nullableUserId,
    invitedAt: v.string(),
    acceptedAt: nullableString,
    deactivatedAt: nullableString,
    updatedAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization", ["organizationId"])
    .index("by_organization_member", ["organizationId", "memberId"])
    .index("by_user", ["userId"])
    .index("by_organization_user", ["organizationId", "userId"])
    .index("by_organization_invited_email", ["organizationId", "invitedEmailNormalized"]),

  members: defineTable({
    id: v.string(),
    organizationId: v.string(),
    authUserId: nullableString,
    name: v.string(),
    role: v.string(),
    discipline: v.string(),
    initials: v.string(),
    color: v.string(),
    openTasks: v.number(),
    createdAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization", ["organizationId"]),

  goals: defineTable({
    id: v.string(),
    organizationId: v.string(),
    title: v.string(),
    owner: v.string(),
    status: v.string(),
    progress: v.number(),
    target: v.string(),
    signal: v.string(),
    createdAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_status", ["organizationId", "status"]),

  projects: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    client: v.string(),
    lead: v.string(),
    stage: v.string(),
    health: v.string(),
    progress: v.number(),
    value: v.number(),
    dueDate: nullableString,
    nextMilestone: v.string(),
    createdAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_stage", ["organizationId", "stage"]),

  tasks: defineTable({
    id: v.string(),
    organizationId: v.string(),
    projectId: nullableString,
    title: v.string(),
    owner: v.string(),
    priority: v.string(),
    status: v.string(),
    dueDate: nullableString,
    context: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_organization_owner", ["organizationId", "owner"]),

  leads: defineTable({
    id: v.string(),
    organizationId: v.string(),
    business: v.string(),
    contact: v.string(),
    stage: v.string(),
    owner: v.string(),
    source: v.string(),
    estimatedValue: v.number(),
    nextAction: v.string(),
    nextActionDate: nullableString,
    lastTouch: nullableString,
    createdAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_stage", ["organizationId", "stage"]),

  contentItems: defineTable({
    id: v.string(),
    organizationId: v.string(),
    title: v.string(),
    platform: v.string(),
    format: v.string(),
    pillar: v.string(),
    owner: v.string(),
    status: v.string(),
    publishDate: nullableString,
    createdAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_status", ["organizationId", "status"]),

  financeEntries: defineTable({
    id: v.string(),
    organizationId: v.string(),
    kind: v.string(),
    label: v.string(),
    category: v.string(),
    amount: v.number(),
    status: v.string(),
    dueDate: nullableString,
    createdAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_kind", ["organizationId", "kind"]),

  activityEvents: defineTable({
    id: v.string(),
    organizationId: v.string(),
    actor: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    createdAt: v.string(),
    actorUserId: v.optional(v.id("users")),
    actorMemberId: v.optional(v.string()),
    actorDisplayNameSnapshot: v.optional(v.string()),
    actionType: v.optional(v.string()),
    source: v.optional(
      v.union(
        v.literal("web"),
        v.literal("import"),
        v.literal("automation"),
        v.literal("admin"),
        v.literal("system"),
      ),
    ),
    requestId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.string())),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_created", ["organizationId", "createdAt"]),

  importRuns: defineTable({
    id: v.string(),
    organizationId: v.string(),
    sourceLabel: v.string(),
    sourceSha256: v.string(),
    sourceSnapshotAt: v.string(),
    mappingVersion: v.string(),
    planDigest: v.string(),
    status: importRunStatus,
    startedByUserId: v.id("users"),
    startedByMemberId: v.string(),
    startedAt: v.string(),
    completedAt: nullableString,
    expectedCounts: importCounts,
    actualCounts: v.union(importCounts, v.null()),
    lastErrorCode: nullableString,
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_created", ["organizationId", "createdAt"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_organization_plan_digest", ["organizationId", "planDigest"]),

  importRowResults: defineTable({
    id: v.string(),
    organizationId: v.string(),
    importRunId: v.string(),
    rowKey: v.string(),
    sourceSheet: v.string(),
    sourceRow: v.number(),
    entityType: v.string(),
    sourceKeyHash: v.string(),
    rowFingerprint: v.string(),
    outcome: importRowOutcome,
    targetExternalId: nullableString,
    diagnosticCodes: v.array(v.string()),
    createdAt: v.string(),
  })
    .index("by_run_row_key", ["importRunId", "rowKey"])
    .index("by_run_outcome", ["importRunId", "outcome"])
    .index("by_organization_run", ["organizationId", "importRunId"]),

  importRecordLinks: defineTable({
    id: v.string(),
    organizationId: v.string(),
    entityType: v.string(),
    sourceNamespace: v.string(),
    sourceKeyHash: v.string(),
    targetExternalId: v.string(),
    firstImportRunId: v.string(),
    lastImportRunId: v.string(),
    sourceRowFingerprint: v.string(),
    targetFingerprintAtImport: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_external_id", ["id"])
    .index("by_organization_source", ["organizationId", "entityType", "sourceNamespace", "sourceKeyHash"])
    .index("by_organization_target", ["organizationId", "entityType", "targetExternalId"])
    .index("by_last_import_run", ["lastImportRunId"]),
});
