import assert from "node:assert/strict";
import fs from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { chromium } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

function loadEnvironment() {
  const values = {};
  for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const environment = loadEnvironment();
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const clerk = createClerkClient({ secretKey: environment.CLERK_SECRET_KEY });
const convex = new ConvexHttpClient(environment.NEXT_PUBLIC_CONVEX_URL);
const createdUserIds = [];
const createdTokenIds = [];
let browser;

function appSignInUrl(signInTokenUrl) {
  const url = new URL(signInTokenUrl);
  url.searchParams.set("redirect_url", "http://localhost:3000/");
  return url.toString();
}

async function createBrowserUser(email, role) {
  const user = await clerk.users.createUser({
    externalId: `protos-browser-canary-${runId}-${role}`,
    emailAddress: [email],
    firstName: "Browser",
    lastName: role,
    skipPasswordRequirement: true,
    skipLegalChecks: true,
  });
  createdUserIds.push(user.id);
  const token = await clerk.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: 600 });
  createdTokenIds.push(token.id);
  return token.url;
}

async function main() {
  const seeded = await convex.mutation(api.testing.seedSyntheticRoleCanary, {
    apiSecret: environment.WORKSPACE_API_SECRET,
    runId,
    emailDomain: "example.com",
  });
  const viewer = seeded.find((record) => record.role === "viewer");
  assert.ok(viewer);

  browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  const viewerTokenUrl = await createBrowserUser(viewer.email, "viewer");
  await viewerPage.goto(appSignInUrl(viewerTokenUrl), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await viewerPage.waitForURL("http://localhost:3000/**", { timeout: 30_000 });
  await viewerPage.getByText("Command", { exact: true }).first().waitFor({ timeout: 30_000 });
  assert.equal(await viewerPage.getByRole("button", { name: /create/i }).count(), 0, "viewer does not see create action");
  assert.equal(await viewerPage.getByRole("button", { name: "Finance", exact: true }).count(), 0, "viewer does not see finance navigation");
  const viewerSnapshot = await viewerPage.evaluate(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
  assert.equal(viewerSnapshot.status, 200);
  assert.deepEqual(viewerSnapshot.body.finance, []);
  const forbiddenWrite = await viewerPage.evaluate(async () => {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", type: "task", title: "forbidden browser canary", owner: "Test viewer" }),
    });
    return response.status;
  });
  assert.equal(forbiddenWrite, 403);
  await viewerContext.close();

  const admin = seeded.find((record) => record.role === "admin");
  assert.ok(admin);
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const adminTokenUrl = await createBrowserUser(admin.email, "admin");
  await adminPage.goto(appSignInUrl(adminTokenUrl), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await adminPage.waitForURL("http://localhost:3000/**", { timeout: 30_000 });
  await adminPage.getByText("Protect your account.", { exact: true }).waitFor({ timeout: 30_000 });
  await adminPage.getByRole("link", { name: "Set up two-step verification" }).waitFor();
  await adminContext.close();

  const outsiderContext = await browser.newContext();
  const outsiderPage = await outsiderContext.newPage();
  const outsiderEmail = `protos-${runId}-outsider@example.com`;
  const outsiderTokenUrl = await createBrowserUser(outsiderEmail, "outsider");
  await outsiderPage.goto(appSignInUrl(outsiderTokenUrl), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await outsiderPage.waitForURL("http://localhost:3000/**", { timeout: 30_000 });
  await outsiderPage.getByText("Your account needs an invitation.", { exact: true }).waitFor({ timeout: 30_000 });
  await outsiderContext.close();

  process.stdout.write(JSON.stringify({
    ok: true,
    checks: ["ticket-sign-in", "viewer-controls", "viewer-data-minimization", "viewer-write-denial", "admin-mfa-gate", "non-member-denial"],
  }) + "\n");
}

try {
  await main();
} finally {
  if (browser) await browser.close();
  try {
    await convex.mutation(api.testing.cleanupSyntheticRoleCanary, { apiSecret: environment.WORKSPACE_API_SECRET, runId });
  } catch (error) {
    console.error("Convex browser-canary cleanup failed", error instanceof Error ? error.message : "unknown error");
  }
  for (const tokenId of createdTokenIds) {
    try { await clerk.signInTokens.revokeSignInToken(tokenId); } catch {}
  }
  for (const userId of createdUserIds) {
    try { await clerk.users.deleteUser(userId); } catch {}
  }
}
