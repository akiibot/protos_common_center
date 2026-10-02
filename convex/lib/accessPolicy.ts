export const accessRoles = ["owner", "admin", "manager", "member", "viewer"] as const;

export type AccessRole = (typeof accessRoles)[number];

export const membershipStatuses = ["invited", "active", "deactivated"] as const;

export type MembershipStatus = (typeof membershipStatuses)[number];

export const permissions = [
  "workspace:read",
  "task:create",
  "task:update:any",
  "task:update:own",
  "task:archive",
  "lead:create",
  "lead:update:any",
  "lead:update:own",
  "lead:archive",
  "project:update:any",
  "project:update:own",
  "project:archive",
  "goal:update:any",
  "goal:update:own",
  "goal:archive",
  "content:create",
  "content:update:any",
  "content:update:own",
  "content:archive",
  "finance:read",
  "finance:write",
  "audit:read:any",
  "audit:read:own",
  "membership:manage",
  "role:manage",
  "ownership:transfer",
  "organization:security",
] as const;

export type Permission = (typeof permissions)[number];

const operationalCreatePermissions: Permission[] = ["task:create", "lead:create", "content:create"];
const operationalOwnPermissions: Permission[] = [
  "task:update:own",
  "lead:update:own",
  "project:update:own",
  "goal:update:own",
  "content:update:own",
];
const operationalAnyPermissions: Permission[] = [
  "task:update:any",
  "lead:update:any",
  "project:update:any",
  "goal:update:any",
  "content:update:any",
];
const operationalArchivePermissions: Permission[] = [
  "task:archive",
  "lead:archive",
  "project:archive",
  "goal:archive",
  "content:archive",
];

const memberPermissions: Permission[] = [
  "workspace:read",
  ...operationalCreatePermissions,
  ...operationalOwnPermissions,
  "audit:read:own",
];

const managerPermissions: Permission[] = [
  "workspace:read",
  ...operationalCreatePermissions,
  ...operationalOwnPermissions,
  ...operationalAnyPermissions,
  ...operationalArchivePermissions,
  "finance:read",
  "audit:read:any",
  "audit:read:own",
];

const adminPermissions: Permission[] = [
  ...managerPermissions,
  "finance:write",
  "membership:manage",
  "role:manage",
];

export const rolePermissions: Readonly<Record<AccessRole, ReadonlySet<Permission>>> = {
  owner: new Set<Permission>([...permissions]),
  admin: new Set<Permission>(adminPermissions),
  manager: new Set<Permission>(managerPermissions),
  member: new Set<Permission>(memberPermissions),
  viewer: new Set<Permission>(["workspace:read"]),
};

export function hasPermission(role: AccessRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export function canChangeRole(actorRole: AccessRole, targetRole: AccessRole, nextRole: AccessRole) {
  if (actorRole === "owner") return true;
  if (actorRole !== "admin") return false;
  return targetRole !== "owner" && nextRole !== "owner";
}
