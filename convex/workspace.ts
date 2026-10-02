import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

export const getWorkspaceSnapshot = query({
  args: { organizationId: v.string(), apiSecret: v.string() },
  handler: async (ctx, { organizationId, apiSecret }) => {
    authorize(apiSecret);
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_external_id", (q) => q.eq("id", organizationId))
      .unique();

    if (!organization) return null;

    const [tasks, leads, projects, goals, members, content, finance, activity] = await Promise.all([
      ctx.db.query("tasks").withIndex("by_organization_status", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("leads").withIndex("by_organization_stage", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("projects").withIndex("by_organization_stage", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("goals").withIndex("by_organization_status", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("members").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("contentItems").withIndex("by_organization_status", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("financeEntries").withIndex("by_organization_kind", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("activityEvents").withIndex("by_organization_created", (q) => q.eq("organizationId", organizationId)).order("desc").take(8),
    ]);

    return {
      tasks: tasks.map(withoutSystemFields),
      leads: leads.map(withoutSystemFields),
      projects: projects.map(withoutSystemFields),
      goals: goals.map(withoutSystemFields),
      members: members.map(withoutSystemFields),
      content: content.map(withoutSystemFields),
      finance: finance.map(withoutSystemFields),
      activity: activity.map(withoutSystemFields),
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
    organizationId: v.string(),
    id: v.string(),
    status: v.string(),
    actor: v.string(),
    apiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    authorize(args.apiSecret);
    const task = await ctx.db.query("tasks").withIndex("by_external_id", (q) => q.eq("id", args.id)).unique();
    if (!task || task.organizationId !== args.organizationId) throw new Error("Task not found");

    await ctx.db.patch(task._id, { status: args.status, updatedAt: new Date().toISOString() });
    await ctx.db.insert("activityEvents", {
      id: crypto.randomUUID(),
      organizationId: args.organizationId,
      actor: args.actor,
      action: `moved a task to ${args.status}`,
      entityType: "task",
      entityId: args.id,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateLeadStage = mutation({
  args: {
    organizationId: v.string(),
    id: v.string(),
    stage: v.string(),
    actor: v.string(),
    apiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    authorize(args.apiSecret);
    const lead = await ctx.db.query("leads").withIndex("by_external_id", (q) => q.eq("id", args.id)).unique();
    if (!lead || lead.organizationId !== args.organizationId) throw new Error("Lead not found");

    await ctx.db.patch(lead._id, { stage: args.stage });
    await ctx.db.insert("activityEvents", {
      id: crypto.randomUUID(),
      organizationId: args.organizationId,
      actor: args.actor,
      action: `moved a lead to ${args.stage}`,
      entityType: "lead",
      entityId: args.id,
      createdAt: new Date().toISOString(),
    });
  },
});

export const createRecord = mutation({
  args: {
    organizationId: v.string(),
    type: v.union(v.literal("task"), v.literal("lead"), v.literal("content")),
    title: v.string(),
    owner: v.string(),
    actor: v.string(),
    apiSecret: v.string(),
  },
  handler: async (ctx, args) => {
    authorize(args.apiSecret);
    const organization = await ctx.db.query("organizations").withIndex("by_external_id", (q) => q.eq("id", args.organizationId)).unique();
    if (!organization) throw new Error("Organization not found");

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    if (args.type === "task") {
      await ctx.db.insert("tasks", {
        id,
        organizationId: args.organizationId,
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
        organizationId: args.organizationId,
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
        organizationId: args.organizationId,
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

    await ctx.db.insert("activityEvents", {
      id: crypto.randomUUID(),
      organizationId: args.organizationId,
      actor: args.actor,
      action: `created ${args.type}: ${args.title}`,
      entityType: args.type,
      entityId: id,
      createdAt: now,
    });
    return id;
  },
});
