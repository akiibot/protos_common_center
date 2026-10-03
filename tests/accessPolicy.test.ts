import assert from "node:assert/strict";
import test from "node:test";
import { accessRoles, canChangeRole, hasPermission, permissions, type AccessRole, type Permission } from "../convex/lib/accessPolicy.ts";

const expected: Record<AccessRole, Permission[]> = {
  owner: [...permissions],
  admin: [
    "workspace:read", "task:create", "lead:create", "content:create",
    "task:update:own", "lead:update:own", "project:update:own", "goal:update:own", "content:update:own",
    "task:update:any", "lead:update:any", "project:update:any", "goal:update:any", "content:update:any",
    "task:archive", "lead:archive", "project:archive", "goal:archive", "content:archive",
    "finance:read", "audit:read:any", "audit:read:own", "finance:write", "membership:manage", "role:manage",
  ],
  manager: [
    "workspace:read", "task:create", "lead:create", "content:create",
    "task:update:own", "lead:update:own", "project:update:own", "goal:update:own", "content:update:own",
    "task:update:any", "lead:update:any", "project:update:any", "goal:update:any", "content:update:any",
    "task:archive", "lead:archive", "project:archive", "goal:archive", "content:archive",
    "finance:read", "audit:read:any", "audit:read:own",
  ],
  member: [
    "workspace:read", "task:create", "lead:create", "content:create",
    "task:update:own", "lead:update:own", "project:update:own", "goal:update:own", "content:update:own", "audit:read:own",
  ],
  viewer: ["workspace:read"],
};

for (const role of accessRoles) {
  test(`${role} permission matrix is explicit`, () => {
    for (const permission of permissions) {
      assert.equal(hasPermission(role, permission), expected[role].includes(permission), `${role} / ${permission}`);
    }
  });
}

test("admins can change only non-owner roles", () => {
  assert.equal(canChangeRole("admin", "member", "manager"), true);
  assert.equal(canChangeRole("admin", "owner", "member"), false);
  assert.equal(canChangeRole("admin", "member", "owner"), false);
});

test("owners can change every role and other roles cannot", () => {
  assert.equal(canChangeRole("owner", "owner", "admin"), true);
  for (const role of ["manager", "member", "viewer"] as const) {
    assert.equal(canChangeRole(role, "member", "viewer"), false);
  }
});
