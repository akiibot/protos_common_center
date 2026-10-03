import assert from "node:assert/strict";
import fs from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

function loadLocalEnvironment() {
  const values = {};
  for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const environment = loadLocalEnvironment();
const required = ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CONVEX_URL", "WORKSPACE_API_SECRET"];
for (const name of required) assert.ok(environment[name], `${name} is required`);

const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const marker = `[canary:${runId}]`;
const clerk = createClerkClient({ secretKey: environment.CLERK_SECRET_KEY });
const adminClient = new ConvexHttpClient(environment.NEXT_PUBLIC_CONVEX_URL);
const clerkUsers = [];
const sessions = [];

async function authenticatedClient(userId) {
  const session = await clerk.sessions.createSession({ userId });
  sessions.push(session.id);
  const token = await clerk.sessions.getToken(session.id);
  const client = new ConvexHttpClient(environment.NEXT_PUBLIC_CONVEX_URL);
  client.setAuth(token.jwt);
  return client;
}

async function main() {
  const seeded = await adminClient.mutation(api.testing.seedSyntheticRoleCanary, {
    apiSecret: environment.WORKSPACE_API_SECRET,
    runId,
    emailDomain: "example.com",
  });
  const clients = {};

  for (const record of seeded) {
    const user = await clerk.users.createUser({
      externalId: `protos-role-canary-${runId}-${record.role}`,
      emailAddress: [record.email],
      firstName: "Test",
      lastName: record.role,
      skipPasswordRequirement: true,
      skipLegalChecks: true,
    });
    clerkUsers.push(user.id);
    const client = await authenticatedClient(user.id);
    await client.mutation(api.memberships.ensureCurrentUser, {
      apiSecret: environment.WORKSPACE_API_SECRET,
      verifiedEmail: record.email,
    });
    clients[record.role] = client;
  }

  for (const role of ["owner", "admin", "manager", "member", "viewer"]) {
    const snapshot = await clients[role].query(api.workspace.getWorkspaceSnapshot, {});
    assert.ok(snapshot, `${role} can read the workspace`);
    if (["owner", "admin", "manager"].includes(role)) assert.ok(snapshot.finance.length > 0, `${role} sees finance`);
    else assert.equal(snapshot.finance.length, 0, `${role} cannot see finance`);
  }

  await assert.rejects(
    clients.viewer.mutation(api.workspace.createRecord, { type: "task", title: `${marker} viewer`, owner: "Test viewer" }),
    /FORBIDDEN/,
  );
  await clients.member.mutation(api.workspace.createRecord, { type: "task", title: `${marker} member own`, owner: "Test member" });
  await assert.rejects(
    clients.member.mutation(api.workspace.createRecord, { type: "task", title: `${marker} member other`, owner: "Test manager" }),
    /FORBIDDEN/,
  );
  await clients.manager.mutation(api.workspace.createRecord, { type: "lead", title: `${marker} manager assigned`, owner: "Test member" });
  await clients.admin.query(api.memberships.listMemberships, {});
  await assert.rejects(clients.manager.query(api.memberships.listMemberships, {}), /FORBIDDEN/);

  const membershipList = await clients.owner.query(api.memberships.listMemberships, {});
  const memberMembership = membershipList.find((item) => item.memberId === `test_${runId}_member`);
  const ownerMembership = membershipList.find((item) => item.memberId === `test_${runId}_owner`);
  const adminMembership = membershipList.find((item) => item.memberId === `test_${runId}_admin`);
  assert.ok(memberMembership && ownerMembership && adminMembership);

  await clients.owner.mutation(api.memberships.updateMembershipStatus, { membershipId: memberMembership.id, status: "deactivated" });
  await assert.rejects(clients.member.query(api.workspace.getWorkspaceSnapshot, {}), /MEMBERSHIP_REQUIRED/);
  await clients.owner.mutation(api.memberships.updateMembershipStatus, { membershipId: memberMembership.id, status: "active" });
  await clients.member.query(api.workspace.getWorkspaceSnapshot, {});

  await assert.rejects(
    clients.admin.mutation(api.memberships.updateAccessRole, { membershipId: ownerMembership.id, accessRole: "member" }),
    /OWNER_PROTECTED/,
  );
  await assert.rejects(
    clients.admin.mutation(api.memberships.updateMembershipStatus, { membershipId: adminMembership.id, status: "deactivated" }),
    /SELF_DEACTIVATION_FORBIDDEN/,
  );

  process.stdout.write(JSON.stringify({
    ok: true,
    roles: 5,
    checks: ["workspace-read", "finance-minimization", "create-permissions", "membership-admin", "deactivation", "owner-safeguard", "self-deactivation"],
  }) + "\n");
}

try {
  await main();
} finally {
  try {
    await adminClient.mutation(api.testing.cleanupSyntheticRoleCanary, { apiSecret: environment.WORKSPACE_API_SECRET, runId });
  } catch (error) {
    console.error("Convex canary cleanup failed", error instanceof Error ? error.message : "unknown error");
  }
  for (const sessionId of sessions) {
    try { await clerk.sessions.revokeSession(sessionId); } catch {}
  }
  for (const userId of clerkUsers) {
    try { await clerk.users.deleteUser(userId); } catch {}
  }
}
