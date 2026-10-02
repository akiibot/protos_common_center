import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { canChangeRole, hasPermission, type AccessRole, type Permission } from "./accessPolicy";

type AuthContextSource = Pick<QueryCtx, "auth" | "db"> | Pick<MutationCtx, "auth" | "db">;

export type AuthorizationContext = {
  userId: Id<"users">;
  memberId: string;
  organizationId: string;
  accessRole: AccessRole;
  displayName: string;
};

type RecordAccess = {
  ownerMemberId: string;
  anyPermission: Permission;
  ownPermission: Permission;
};

function authorizationError(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

export async function requireIdentity(ctx: AuthContextSource) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) authorizationError("UNAUTHENTICATED", "Authentication is required");
  return identity;
}

export async function getCurrentUser(ctx: AuthContextSource) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_subject", (query) => query.eq("authSubject", identity.subject))
    .unique();

  if (!user) authorizationError("USER_NOT_PROVISIONED", "This account has not been provisioned");
  return user;
}

export async function requireActiveMembership(ctx: AuthContextSource, organizationId?: string): Promise<AuthorizationContext> {
  const user = await getCurrentUser(ctx);

  const membership = organizationId
    ? await ctx.db
        .query("memberships")
        .withIndex("by_organization_user", (query) => query.eq("organizationId", organizationId).eq("userId", user._id))
        .unique()
    : await ctx.db
        .query("memberships")
        .withIndex("by_user", (query) => query.eq("userId", user._id))
        .filter((query) => query.eq(query.field("status"), "active"))
        .unique();

  if (!membership || membership.status !== "active") {
    authorizationError("MEMBERSHIP_REQUIRED", "An active organization membership is required");
  }

  return {
    userId: user._id,
    memberId: membership.memberId,
    organizationId: membership.organizationId,
    accessRole: membership.accessRole,
    displayName: user.displayName,
  };
}

export async function requirePermission(
  ctx: AuthContextSource,
  permission: Permission,
  organizationId?: string,
): Promise<AuthorizationContext> {
  const authorization = await requireActiveMembership(ctx, organizationId);
  if (!hasPermission(authorization.accessRole, permission)) {
    authorizationError("FORBIDDEN", "You do not have permission to perform this action");
  }
  return authorization;
}

export async function requireRecordAccess(
  ctx: AuthContextSource,
  access: RecordAccess,
  organizationId?: string,
): Promise<AuthorizationContext> {
  const authorization = await requireActiveMembership(ctx, organizationId);
  if (hasPermission(authorization.accessRole, access.anyPermission)) return authorization;
  if (authorization.memberId === access.ownerMemberId && hasPermission(authorization.accessRole, access.ownPermission)) {
    return authorization;
  }
  authorizationError("FORBIDDEN", "You do not have permission to change this record");
}

export function assertCanChangeRole(actorRole: AccessRole, targetRole: AccessRole, nextRole: AccessRole) {
  if (!canChangeRole(actorRole, targetRole, nextRole)) {
    authorizationError("FORBIDDEN", "You do not have permission to make this role change");
  }
}
