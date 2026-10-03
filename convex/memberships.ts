import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { accessRoles, type AccessRole } from "./lib/accessPolicy";
import { requireActiveMembership } from "./lib/auth";
import { requirePermission } from "./lib/auth";

const organizationId = "org_protos";

const accessRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("manager"),
  v.literal("member"),
  v.literal("viewer"),
);

function authorizeAdministration(apiSecret: string) {
  const expected = process.env.WORKSPACE_API_SECRET;
  if (!expected || apiSecret !== expected) throw new ConvexError({ code: "UNAUTHORIZED", message: "Unauthorized" });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const provisionInvitations = mutation({
  args: {
    apiSecret: v.string(),
    dryRun: v.boolean(),
    invitations: v.array(
      v.object({
        memberId: v.string(),
        email: v.string(),
        accessRole: accessRoleValidator,
      }),
    ),
  },
  handler: async (ctx, { apiSecret, dryRun, invitations }) => {
    authorizeAdministration(apiSecret);

    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_external_id", (index) => index.eq("id", organizationId))
      .unique();
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found" });

    const emails = invitations.map((invitation) => normalizeEmail(invitation.email));
    if (new Set(emails).size !== emails.length) {
      throw new ConvexError({ code: "DUPLICATE_EMAIL", message: "Invitation emails must be unique" });
    }
    if (invitations.filter((invitation) => invitation.accessRole === "owner").length !== 1) {
      throw new ConvexError({ code: "OWNER_REQUIRED", message: "Exactly one owner invitation is required" });
    }

    const results: Array<{ memberId: string; action: "create" | "update" | "unchanged" }> = [];
    const now = new Date().toISOString();

    for (const invitation of invitations) {
      if (!accessRoles.includes(invitation.accessRole as AccessRole)) {
        throw new ConvexError({ code: "INVALID_ROLE", message: "Unknown access role" });
      }

      const member = await ctx.db
        .query("members")
        .withIndex("by_external_id", (index) => index.eq("id", invitation.memberId))
        .unique();
      if (!member || member.organizationId !== organizationId) {
        throw new ConvexError({ code: "MEMBER_NOT_FOUND", message: `Member profile not found: ${invitation.memberId}` });
      }

      const email = normalizeEmail(invitation.email);
      const existing = await ctx.db
        .query("memberships")
        .withIndex("by_organization_member", (index) =>
          index.eq("organizationId", organizationId).eq("memberId", invitation.memberId),
        )
        .unique();

      if (!existing) {
        results.push({ memberId: invitation.memberId, action: "create" });
        if (!dryRun) {
          await ctx.db.insert("memberships", {
            id: `membership_${invitation.memberId}`,
            organizationId,
            userId: null,
            memberId: invitation.memberId,
            invitedEmailNormalized: email,
            accessRole: invitation.accessRole,
            status: "invited",
            invitedByUserId: null,
            invitedAt: now,
            acceptedAt: null,
            deactivatedAt: null,
            updatedAt: now,
          });
        }
        continue;
      }

      const unchanged = existing.invitedEmailNormalized === email && existing.accessRole === invitation.accessRole;
      results.push({ memberId: invitation.memberId, action: unchanged ? "unchanged" : "update" });
      if (!dryRun && !unchanged) {
        await ctx.db.patch(existing._id, {
          invitedEmailNormalized: email,
          accessRole: invitation.accessRole,
          updatedAt: now,
        });
      }
    }

    return {
      dryRun,
      total: results.length,
      creates: results.filter((result) => result.action === "create").length,
      updates: results.filter((result) => result.action === "update").length,
      unchanged: results.filter((result) => result.action === "unchanged").length,
      results,
    };
  },
});

export const ensureCurrentUser = mutation({
  args: { apiSecret: v.string(), verifiedEmail: v.string() },
  handler: async (ctx, { apiSecret, verifiedEmail }) => {
    authorizeAdministration(apiSecret);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication is required" });

    const email = normalizeEmail(verifiedEmail);
    if (!email) throw new ConvexError({ code: "VERIFIED_EMAIL_REQUIRED", message: "A verified email is required" });

    const now = new Date().toISOString();
    const invitedMembership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_invited_email", (index) =>
        index.eq("organizationId", organizationId).eq("invitedEmailNormalized", email),
      )
      .unique();

    let user = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (index) => index.eq("authSubject", identity.subject))
      .unique();

    if (!user) {
      if (!invitedMembership) {
        throw new ConvexError({ code: "INVITATION_REQUIRED", message: "This account has not been invited" });
      }

      const duplicateEmailUser = await ctx.db
        .query("users")
        .withIndex("by_email_normalized", (index) => index.eq("emailNormalized", email))
        .unique();
      if (duplicateEmailUser) {
        throw new ConvexError({ code: "IDENTITY_CONFLICT", message: "This email is linked to another identity" });
      }

      const userId = await ctx.db.insert("users", {
        authSubject: identity.subject,
        emailNormalized: email,
        displayName: identity.name ?? email,
        avatarUrl: identity.pictureUrl ?? null,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) throw new ConvexError({ code: "USER_PROVISIONING_FAILED", message: "Could not provision user" });

    let membership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (index) => index.eq("organizationId", organizationId).eq("userId", user._id))
      .unique();

    if (!membership) {
      membership = invitedMembership;
    }

    if (!membership) throw new ConvexError({ code: "INVITATION_REQUIRED", message: "This account has not been invited" });
    if (membership.status === "deactivated") {
      throw new ConvexError({ code: "MEMBERSHIP_DEACTIVATED", message: "This membership is deactivated" });
    }
    if (membership.userId && membership.userId !== user._id) {
      throw new ConvexError({ code: "MEMBERSHIP_ALREADY_CLAIMED", message: "This invitation has already been claimed" });
    }

    await ctx.db.patch(user._id, {
      emailNormalized: email,
      displayName: identity.name ?? user.displayName,
      avatarUrl: identity.pictureUrl ?? user.avatarUrl,
      updatedAt: now,
      lastSeenAt: now,
    });

    if (membership.status !== "active" || !membership.userId) {
      await ctx.db.patch(membership._id, {
        userId: user._id,
        status: "active",
        acceptedAt: membership.acceptedAt ?? now,
        deactivatedAt: null,
        updatedAt: now,
      });
    }

    return {
      memberId: membership.memberId,
      organizationId: membership.organizationId,
      accessRole: membership.accessRole,
      displayName: identity.name ?? user.displayName,
    };
  },
});

export const getCurrentAccess = query({
  args: {},
  handler: async (ctx) => requireActiveMembership(ctx, organizationId),
});

export const listMemberships = query({
  args: {},
  handler: async (ctx) => {
    const authorization = await requirePermission(ctx, "membership:manage");
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organization", (index) => index.eq("organizationId", authorization.organizationId))
      .collect();

    return Promise.all(
      memberships.map(async (membership) => {
        const member = await ctx.db
          .query("members")
          .withIndex("by_external_id", (index) => index.eq("id", membership.memberId))
          .unique();
        const linkedUser = membership.userId ? await ctx.db.get(membership.userId) : null;
        return {
          id: membership.id,
          memberId: membership.memberId,
          name: member?.name ?? "Unknown member",
          jobTitle: member?.role ?? "Team member",
          email: linkedUser?.emailNormalized ?? membership.invitedEmailNormalized,
          accessRole: membership.accessRole,
          status: membership.status,
          acceptedAt: membership.acceptedAt,
          updatedAt: membership.updatedAt,
          isCurrentUser: membership.userId === authorization.userId,
        };
      }),
    );
  },
});

async function getMembershipByExternalId(ctx: MutationCtx, id: string) {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_external_id", (index) => index.eq("id", id))
    .unique();
  if (!membership) throw new ConvexError({ code: "NOT_FOUND", message: "Membership not found" });
  return membership;
}

async function writeAccessEvent(
  ctx: MutationCtx,
  authorization: Awaited<ReturnType<typeof requirePermission>>,
  action: string,
  actionType: string,
  membershipId: string,
  metadata: Record<string, string>,
) {
  await ctx.db.insert("activityEvents", {
    id: crypto.randomUUID(),
    organizationId: authorization.organizationId,
    actor: authorization.displayName,
    action,
    entityType: "membership",
    entityId: membershipId,
    createdAt: new Date().toISOString(),
    actorUserId: authorization.userId,
    actorMemberId: authorization.memberId,
    actorDisplayNameSnapshot: authorization.displayName,
    actionType,
    source: "admin",
    metadata,
  });
}

export const updateAccessRole = mutation({
  args: {
    membershipId: v.string(),
    accessRole: v.union(v.literal("admin"), v.literal("manager"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, { membershipId, accessRole }) => {
    const authorization = await requirePermission(ctx, "role:manage");
    const target = await getMembershipByExternalId(ctx, membershipId);
    if (target.organizationId !== authorization.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Membership not found" });
    }
    if (target.accessRole === "owner") {
      throw new ConvexError({ code: "OWNER_PROTECTED", message: "Transfer ownership before changing the owner role" });
    }

    const previousRole = target.accessRole;
    if (previousRole === accessRole) return { changed: false };
    await ctx.db.patch(target._id, { accessRole, updatedAt: new Date().toISOString() });
    await writeAccessEvent(ctx, authorization, `changed a member role from ${previousRole} to ${accessRole}`, "membership.role_changed", membershipId, {
      previousRole,
      nextRole: accessRole,
      targetMemberId: target.memberId,
    });
    return { changed: true };
  },
});

export const updateMembershipStatus = mutation({
  args: {
    membershipId: v.string(),
    status: v.union(v.literal("active"), v.literal("deactivated")),
  },
  handler: async (ctx, { membershipId, status }) => {
    const authorization = await requirePermission(ctx, "membership:manage");
    const target = await getMembershipByExternalId(ctx, membershipId);
    if (target.organizationId !== authorization.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Membership not found" });
    }
    if (target.userId === authorization.userId && status === "deactivated") {
      throw new ConvexError({ code: "SELF_DEACTIVATION_FORBIDDEN", message: "You cannot deactivate your own account" });
    }
    if (target.accessRole === "owner" && status === "deactivated") {
      throw new ConvexError({ code: "OWNER_PROTECTED", message: "Transfer ownership before deactivating the owner" });
    }

    const previousStatus = target.status;
    if (previousStatus === status) return { changed: false };
    const now = new Date().toISOString();
    await ctx.db.patch(target._id, {
      status,
      deactivatedAt: status === "deactivated" ? now : null,
      updatedAt: now,
    });
    await writeAccessEvent(ctx, authorization, `${status === "deactivated" ? "deactivated" : "reactivated"} a member`, `membership.${status}`, membershipId, {
      previousStatus,
      nextStatus: status,
      targetMemberId: target.memberId,
    });
    return { changed: true };
  },
});

export const transferOwnership = mutation({
  args: { membershipId: v.string() },
  handler: async (ctx, { membershipId }) => {
    const authorization = await requirePermission(ctx, "ownership:transfer");
    const target = await getMembershipByExternalId(ctx, membershipId);
    if (target.organizationId !== authorization.organizationId || target.status !== "active" || !target.userId) {
      throw new ConvexError({ code: "INVALID_OWNER_TARGET", message: "The new owner must be an active member" });
    }
    if (target.userId === authorization.userId) return { changed: false };

    const currentOwner = await ctx.db
      .query("memberships")
      .withIndex("by_organization_user", (index) =>
        index.eq("organizationId", authorization.organizationId).eq("userId", authorization.userId),
      )
      .unique();
    if (!currentOwner || currentOwner.accessRole !== "owner") {
      throw new ConvexError({ code: "OWNER_REQUIRED", message: "Only the current owner can transfer ownership" });
    }

    const now = new Date().toISOString();
    await ctx.db.patch(currentOwner._id, { accessRole: "admin", updatedAt: now });
    await ctx.db.patch(target._id, { accessRole: "owner", updatedAt: now });
    await writeAccessEvent(ctx, authorization, "transferred organization ownership", "membership.ownership_transferred", membershipId, {
      previousOwnerMemberId: currentOwner.memberId,
      nextOwnerMemberId: target.memberId,
    });
    return { changed: true };
  },
});
