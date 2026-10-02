import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const nullableString = v.union(v.string(), v.null());

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
  })
    .index("by_external_id", ["id"])
    .index("by_organization_created", ["organizationId", "createdAt"]),
});
