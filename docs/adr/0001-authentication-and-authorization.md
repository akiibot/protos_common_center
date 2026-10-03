# ADR 0001: Authentication and Authorization Foundation

Date: 2026-10-03

Status: accepted for implementation; external account setup pending

## Context

Protos Common Center currently exposes its production workspace snapshot without an application login. Mutations are routed through a shared server credential and production is kept safe by a global read-only switch. This does not provide individual accountability, organization membership enforcement, or a safe path to confidential operational data.

Phase 1 requires invite-only access for seven team members, server-enforced roles, trustworthy activity attribution, and a staged path to production writes.

## Decision

Use Clerk as the application identity provider and the supported Clerk-to-Convex token validation path.

Keep organization membership and access roles authoritative in Convex. Clerk proves the external identity; it does not decide which Protos records that identity may access.

Use five application roles: owner, admin, manager, member, and viewer. Keep job titles separate from access roles.

Preserve the existing same-origin Next.js gateway during the migration. The gateway must authenticate the request and forward an authenticated Convex token. Convex functions must independently resolve the identity, require an active membership, derive the organization scope, and check a named permission.

Keep the existing shared Convex server secret only for narrowly scoped migration, administration, and emergency rollback functions. Remove it from normal user read and write paths after cutover.

## Consequences

- Public registration remains disabled; team accounts are invitation-only.
- Production stays read-only until the Phase 1 production gate passes.
- Preview must use non-confidential data in a Convex deployment isolated from Production.
- Every protected Convex function begins with a shared authorization helper.
- The browser cannot choose its actor, access role, or organization scope.
- Finance and audit responses must be reduced for roles without those permissions.
- Owner and admin accounts require MFA before production writes are enabled.
- Provider configuration and credentials remain outside Git.

## Alternatives considered

### Continue relying on hosting-layer protection

Rejected because it does not produce application identities, roles, record-level permissions, or trustworthy activity actors.

### Build custom password and session management

Rejected because it adds avoidable security and recovery risk without providing product differentiation.

### Store authorization only in identity-provider metadata

Rejected because organization membership and business-data authorization belong next to the Convex data and must remain enforceable inside Convex functions.

## Follow-up

- Confirm the Clerk account owner, billing owner, and recovery contact.
- Approve permitted sign-in methods and the proposed permission matrix.
- Configure separate development and production Clerk instances.
- Implement the work packages in `docs/PHASE_1_ACCESS_IMPLEMENTATION_PLAN.md`.
