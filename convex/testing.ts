import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

const roles = ["owner", "admin", "manager", "member", "viewer"] as const;

function authorize(apiSecret: string) {
  if (process.env.ALLOW_SYNTHETIC_TEST_USERS !== "true") {
    throw new ConvexError({ code: "TEST_SUPPORT_DISABLED", message: "Synthetic test support is disabled" });
  }
  const expected = process.env.WORKSPACE_API_SECRET;
  if (!expected || apiSecret !== expected) throw new ConvexError({ code: "UNAUTHORIZED", message: "Unauthorized" });
}

export const seedSyntheticRoleCanary = mutation({
  args: { apiSecret: v.string(), runId: v.string(), emailDomain: v.string() },
  handler: async (ctx, { apiSecret, runId, emailDomain }) => {
    authorize(apiSecret);
    const now = new Date().toISOString();
    const created: Array<{ role: (typeof roles)[number]; memberId: string; email: string }> = [];

    for (const role of roles) {
      const memberId = `test_${runId}_${role}`;
      const email = `protos-${runId}-${role}@${emailDomain}`.toLowerCase();
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_organization_member", (index) => index.eq("organizationId", "org_protos").eq("memberId", memberId))
        .unique();
      if (!existingMembership) {
        await ctx.db.insert("members", {
          id: memberId,
          organizationId: "org_protos",
          authUserId: null,
          name: `Test ${role}`,
          role: `Synthetic ${role}`,
          discipline: "Authorization testing",
          initials: `T${role[0].toUpperCase()}`,
          color: "#64748b",
          openTasks: 0,
          createdAt: now,
        });
        await ctx.db.insert("memberships", {
          id: `membership_${memberId}`,
          organizationId: "org_protos",
          userId: null,
          memberId,
          invitedEmailNormalized: email,
          accessRole: role,
          status: "invited",
          invitedByUserId: null,
          invitedAt: now,
          acceptedAt: null,
          deactivatedAt: null,
          updatedAt: now,
        });
      }
      created.push({ role, memberId, email });
    }

    return created;
  },
});

export const cleanupSyntheticRoleCanary = mutation({
  args: { apiSecret: v.string(), runId: v.string() },
  handler: async (ctx, { apiSecret, runId }) => {
    authorize(apiSecret);
    const prefix = `test_${runId}_`;
    const memberships = await ctx.db.query("memberships").withIndex("by_organization", (q) => q.eq("organizationId", "org_protos")).collect();
    const targets = memberships.filter((membership) => membership.memberId.startsWith(prefix));
    const userIds = targets.flatMap((membership) => membership.userId ? [membership.userId] : []);

    for (const membership of targets) await ctx.db.delete(membership._id);
    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      if (user) await ctx.db.delete(userId);
    }

    const members = await ctx.db.query("members").withIndex("by_organization", (q) => q.eq("organizationId", "org_protos")).collect();
    for (const member of members.filter((item) => item.id.startsWith(prefix))) await ctx.db.delete(member._id);

    const marker = `[canary:${runId}]`;
    const tasks = await ctx.db.query("tasks").withIndex("by_organization_status", (q) => q.eq("organizationId", "org_protos")).collect();
    for (const task of tasks.filter((item) => item.title.includes(marker))) await ctx.db.delete(task._id);
    const leads = await ctx.db.query("leads").withIndex("by_organization_stage", (q) => q.eq("organizationId", "org_protos")).collect();
    for (const lead of leads.filter((item) => item.business.includes(marker))) await ctx.db.delete(lead._id);
    const content = await ctx.db.query("contentItems").withIndex("by_organization_status", (q) => q.eq("organizationId", "org_protos")).collect();
    for (const item of content.filter((entry) => entry.title.includes(marker))) await ctx.db.delete(item._id);
    const activity = await ctx.db.query("activityEvents").withIndex("by_organization_created", (q) => q.eq("organizationId", "org_protos")).collect();
    for (const event of activity.filter((item) => item.actorMemberId?.startsWith(prefix) || item.metadata?.targetMemberId?.startsWith(prefix))) {
      await ctx.db.delete(event._id);
    }

    return { memberships: targets.length, users: userIds.length };
  },
});
