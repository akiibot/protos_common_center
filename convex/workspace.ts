import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { hasPermission, type Permission } from "./lib/accessPolicy";
import { requireActiveMembership, requirePermission, type AuthorizationContext } from "./lib/auth";
import { seedData } from "./seedData";

function authorize(apiSecret: string) {
  const expected = process.env.WORKSPACE_API_SECRET;
  if (!expected || apiSecret !== expected) throw new Error("Unauthorized");
}

function withoutSystemFields<T extends { _id: unknown; _creationTime: number }>(record: T): Omit<T, "_id" | "_creationTime"> {
  const value = { ...record };
  delete (value as Partial<T>)._id;
  delete (value as Partial<T>)._creationTime;
  return value;
}

async function getMemberName(ctx: MutationCtx, authorization: AuthorizationContext) {
  const member = await ctx.db
    .query("members")
    .withIndex("by_external_id", (index) => index.eq("id", authorization.memberId))
    .unique();
  if (!member || member.organizationId !== authorization.organizationId) {
    throw new ConvexError({ code: "MEMBER_NOT_FOUND", message: "Member profile not found" });
  }
  return member.name;
}

async function requireOwnedRecordOrAny(
  ctx: MutationCtx,
  ownerName: string,
  anyPermission: Permission,
  ownPermission: Permission,
) {
  const authorization = await requireActiveMembership(ctx);
  if (hasPermission(authorization.accessRole, anyPermission)) return authorization;
  const memberName = await getMemberName(ctx, authorization);
  if (memberName === ownerName && hasPermission(authorization.accessRole, ownPermission)) return authorization;
  throw new ConvexError({ code: "FORBIDDEN", message: "You do not have permission to change this record" });
}

function authenticatedActivity(
  authorization: AuthorizationContext,
  action: string,
  actionType: string,
  entityType: string,
  entityId: string,
) {
  return {
    id: crypto.randomUUID(),
    organizationId: authorization.organizationId,
    actor: authorization.displayName,
    action,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    actorUserId: authorization.userId,
    actorMemberId: authorization.memberId,
    actorDisplayNameSnapshot: authorization.displayName,
    actionType,
    source: "web" as const,
  };
}

export const getWorkspaceSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const authorization = await requirePermission(ctx, "workspace:read");
    const { organizationId } = authorization;
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_external_id", (q) => q.eq("id", organizationId))
      .unique();

    if (!organization) return null;

    const canReadFinance = hasPermission(authorization.accessRole, "finance:read");
    const canReadAllAudit = hasPermission(authorization.accessRole, "audit:read:any");
    const canReadOwnAudit = hasPermission(authorization.accessRole, "audit:read:own");

    const [tasks, leads, projects, goals, members, content, finance, activity] = await Promise.all([
      ctx.db.query("tasks").withIndex("by_organization_status", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("leads").withIndex("by_organization_stage", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("projects").withIndex("by_organization_stage", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("goals").withIndex("by_organization_status", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("members").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("contentItems").withIndex("by_organization_status", (q) => q.eq("organizationId", organizationId)).collect(),
      canReadFinance
        ? ctx.db.query("financeEntries").withIndex("by_organization_kind", (q) => q.eq("organizationId", organizationId)).collect()
        : Promise.resolve([]),
      canReadAllAudit || canReadOwnAudit
        ? ctx.db.query("activityEvents").withIndex("by_organization_created", (q) => q.eq("organizationId", organizationId)).order("desc").take(40)
        : Promise.resolve([]),
    ]);

    const visibleActivity = canReadAllAudit
      ? activity.slice(0, 8)
      : activity.filter((event) => event.actorMemberId === authorization.memberId).slice(0, 8);

    return {
      tasks: tasks.map(withoutSystemFields),
      leads: leads.map(withoutSystemFields),
      projects: projects.map(withoutSystemFields),
      goals: goals.map(withoutSystemFields),
      members: members.map(withoutSystemFields),
      content: content.map(withoutSystemFields),
      finance: finance.map(withoutSystemFields),
      activity: visibleActivity.map(withoutSystemFields),
    };
  },
});

export const seedWorkspace = mutation({
  args: { apiSecret: v.string() },
  handler: async (ctx, { apiSecret }) => {
    authorize(apiSecret);
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_external_id", (q) => q.eq("id", seedData.organization.id))
      .unique();
    if (existing) return { inserted: false };

    await ctx.db.insert("organizations", seedData.organization);
    for (const record of seedData.members) await ctx.db.insert("members", record);
    for (const record of seedData.goals) await ctx.db.insert("goals", record);
    for (const record of seedData.projects) await ctx.db.insert("projects", record);
    for (const record of seedData.tasks) await ctx.db.insert("tasks", record);
    for (const record of seedData.leads) await ctx.db.insert("leads", record);
    for (const record of seedData.contentItems) await ctx.db.insert("contentItems", record);
    for (const record of seedData.financeEntries) await ctx.db.insert("financeEntries", record);
    for (const record of seedData.activityEvents) await ctx.db.insert("activityEvents", record);

    return { inserted: true };
  },
});

export const updateTaskStatus = mutation({
  args: {
    id: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.query("tasks").withIndex("by_external_id", (q) => q.eq("id", args.id)).unique();
    if (!task) throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    const authorization = await requireOwnedRecordOrAny(ctx, task.owner, "task:update:any", "task:update:own");
    if (task.organizationId !== authorization.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    }

    await ctx.db.patch(task._id, { status: args.status, updatedAt: new Date().toISOString() });
    await ctx.db.insert(
      "activityEvents",
      authenticatedActivity(authorization, `moved a task to ${args.status}`, "task.status_changed", "task", args.id),
    );
  },
});

export const updateLeadStage = mutation({
  args: {
    id: v.string(),
    stage: v.string(),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.query("leads").withIndex("by_external_id", (q) => q.eq("id", args.id)).unique();
    if (!lead) throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
    const authorization = await requireOwnedRecordOrAny(ctx, lead.owner, "lead:update:any", "lead:update:own");
    if (lead.organizationId !== authorization.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
    }

    await ctx.db.patch(lead._id, { stage: args.stage });
    await ctx.db.insert(
      "activityEvents",
      authenticatedActivity(authorization, `moved a lead to ${args.stage}`, "lead.stage_changed", "lead", args.id),
    );
  },
});

export const createRecord = mutation({
  args: {
    type: v.union(v.literal("task"), v.literal("lead"), v.literal("content")),
    title: v.string(),
    owner: v.string(),
  },
  handler: async (ctx, args) => {
    const createPermission = `${args.type}:create` as "task:create" | "lead:create" | "content:create";
    const authorization = await requirePermission(ctx, createPermission);
    const organization = await ctx.db.query("organizations").withIndex("by_external_id", (q) => q.eq("id", authorization.organizationId)).unique();
    if (!organization) throw new Error("Organization not found");

    const memberName = await getMemberName(ctx, authorization);
    const anyUpdatePermission = `${args.type}:update:any` as "task:update:any" | "lead:update:any" | "content:update:any";
    if (args.owner !== memberName && !hasPermission(authorization.accessRole, anyUpdatePermission)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You cannot assign this record to another member" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    if (args.type === "task") {
      await ctx.db.insert("tasks", {
        id,
        organizationId: authorization.organizationId,
        projectId: null,
        title: args.title,
        owner: args.owner,
        priority: "Medium",
        status: "Ready",
        dueDate: null,
        context: "General",
        createdAt: now,
        updatedAt: now,
      });
    } else if (args.type === "lead") {
      await ctx.db.insert("leads", {
        id,
        organizationId: authorization.organizationId,
        business: args.title,
        contact: "To be confirmed",
        stage: "Identified",
        owner: args.owner,
        source: "Direct",
        estimatedValue: 0,
        nextAction: "Define next action",
        nextActionDate: null,
        lastTouch: null,
        createdAt: now,
      });
    } else {
      await ctx.db.insert("contentItems", {
        id,
        organizationId: authorization.organizationId,
        title: args.title,
        platform: "Facebook",
        format: "Post",
        pillar: "Build in public",
        owner: args.owner,
        status: "Idea",
        publishDate: null,
        createdAt: now,
      });
    }

    await ctx.db.insert(
      "activityEvents",
      authenticatedActivity(authorization, `created ${args.type}: ${args.title}`, `${args.type}.created`, args.type, id),
    );
    return id;
  },
});
