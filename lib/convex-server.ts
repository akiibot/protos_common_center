import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getClient(token: string) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!url) throw new Error("Convex server configuration is unavailable");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}

export async function getWorkspaceSnapshot(token: string) {
  return getClient(token).query(api.workspace.getWorkspaceSnapshot, {});
}

export async function ensureCurrentUser(token: string, verifiedEmail: string) {
  const apiSecret = process.env.WORKSPACE_API_SECRET;
  if (!apiSecret) throw new Error("Workspace provisioning configuration is unavailable");
  return getClient(token).mutation(api.memberships.ensureCurrentUser, { apiSecret, verifiedEmail });
}

export async function listMemberships(token: string) {
  return getClient(token).query(api.memberships.listMemberships, {});
}

export async function updateAccessRole(
  token: string,
  membershipId: string,
  accessRole: "admin" | "manager" | "member" | "viewer",
) {
  return getClient(token).mutation(api.memberships.updateAccessRole, { membershipId, accessRole });
}

export async function updateMembershipStatus(token: string, membershipId: string, status: "active" | "deactivated") {
  return getClient(token).mutation(api.memberships.updateMembershipStatus, { membershipId, status });
}

export async function transferOwnership(token: string, membershipId: string) {
  return getClient(token).mutation(api.memberships.transferOwnership, { membershipId });
}

export async function updateTaskStatus(token: string, id: string, status: string) {
  return getClient(token).mutation(api.workspace.updateTaskStatus, { id, status });
}

export async function updateLeadStage(token: string, id: string, stage: string) {
  return getClient(token).mutation(api.workspace.updateLeadStage, { id, stage });
}

export async function createRecord(
  token: string,
  input: { type: "task" | "lead" | "content"; title: string; owner: string },
) {
  return getClient(token).mutation(api.workspace.createRecord, input);
}
