# Phase 1 Implementation Plan: Team Access, Identity, and Authorization

Status: ready for review

Created: 2026-10-03

Owners: product owner and implementation lead

Roadmap alignment: Release 2, Epic A

## 1. Outcome

Phase 1 replaces the shared, public-read workspace with an invite-only application in which each Protos team member has an individual identity, an approved organization role, and a trustworthy audit trail.

Phase 1 is complete only when:

- all seven Protos team members can sign in with individual accounts;
- anonymous users cannot read or change workspace data;
- every query and mutation verifies organization membership on the server;
- each important mutation records the authenticated actor;
- deactivated members immediately lose access without losing their history;
- permission behavior is covered by automated tests; and
- production can leave read-only mode without exposing an unauthenticated write path.

This phase introduces a Protos application login. It does not restore ChatGPT sign-in or depend on ChatGPT accounts.

## 2. Current baseline and risks

The current production deployment has a Next.js interface on Vercel and a Convex backend. The browser calls `GET /api/workspace` and `POST /api/workspace`; the Next.js gateway then calls Convex with one server secret.

Known security limitations:

- the production page and workspace snapshot are publicly readable;
- production writes are disabled only by `DEPLOYMENT_READ_ONLY=true`;
- all application traffic shares one backend credential;
- the server assigns the actor name `Protos team` rather than deriving it from a session;
- `members.authUserId` is not connected to real accounts for six of seven members;
- Convex functions validate the server secret but not a human identity or membership;
- roles are job titles such as `Founder`, not access-control roles; and
- the Vercel preview currently reads from the production Convex deployment.

Do not import confidential client, contract, invoice, contact, or financial data until the Phase 1 production gate is passed.

## 3. Architecture decision

### Recommended identity provider

Use Clerk for invite-only authentication and its supported Convex integration.

Reasons:

- Clerk provides a maintained Next.js App Router SDK and server-side session helpers;
- Convex provides a first-party `ConvexProviderWithClerk` integration and validates Clerk tokens in Convex functions;
- invitation, session, password-recovery, and optional multi-factor flows do not need to be built in-house; and
- the existing Next.js gateway can be migrated incrementally rather than rewritten at once.

Official integration references:

- Convex and Clerk: <https://docs.convex.dev/auth/clerk>
- Next.js authentication guidance: <https://nextjs.org/docs/app/guides/authentication>
- Clerk resource protection: <https://clerk.com/docs/guides/secure/protect-content>

This choice is approved when the product owner confirms the provider, account owner, billing owner, permitted sign-in methods, and recovery contact. If Clerk is rejected, stop after the provider decision issue and replace the provider-specific tasks without weakening the authorization model.

### Target request path

```text
Browser
  -> Clerk session
  -> protected Next.js page or /api/workspace route
  -> Clerk-issued Convex token
  -> authenticated Convex query or mutation
  -> ctx.auth.getUserIdentity()
  -> active organization membership lookup
  -> permission check
  -> organization-scoped database operation
  -> append-only activity event with authenticated actor
```

The application must check authorization close to the data operation. Route protection and hidden interface controls improve user experience, but Convex membership checks remain the security boundary.

The existing `CONVEX_SERVER_SECRET` remains only for narrowly scoped administration, migration, and emergency rollback functions. Normal user reads and writes must not depend on it after cutover.

## 4. Scope

### Included

- Invite-only sign-in, sign-out, recovery, and session handling.
- Individual identities for the seven current members.
- Organization memberships with access roles and active status.
- Server-side permission helpers shared by Convex functions.
- Protection for all workspace reads and mutations.
- Permission-aware navigation and controls.
- Member invitation, role change, and deactivation procedures.
- Authenticated activity attribution.
- Development, preview, and production auth configuration.
- Automated authorization tests and a staged production rollout.

### Not included

- Public registration.
- Customer or client portal accounts.
- Multi-organization switching.
- Fine-grained per-record sharing.
- Full CRUD for every business record.
- Attachments, comments, or notifications.
- SSO, SCIM, or enterprise directory sync.
- A custom password database or custom session implementation.

## 5. Roles and permission model

Access roles are separate from job titles. `Founder`, `Operations Lead`, and `Product Designer` remain profile/job fields. Authorization uses one of five fixed access roles.

### Proposed role definitions

- **Owner**: full control, including ownership transfer and the most sensitive access changes. Exactly one active owner is required.
- **Admin**: manages members and all workspace data but cannot remove or replace the owner.
- **Manager**: manages operational records and sees management reporting; cannot administer access or change sensitive finance records.
- **Member**: performs assigned daily work and creates normal operational records; cannot manage access, organization settings, or finance.
- **Viewer**: read-only access to approved non-sensitive workspace data.

### Proposed permission matrix

`Full` means read and mutate. `Read` means read only. `Own` means mutate records assigned to or created by the member. `None` means the data is not returned.

| Capability | Owner | Admin | Manager | Member | Viewer |
|---|---:|---:|---:|---:|---:|
| View normal workspace data | Read | Read | Read | Read | Read |
| Create tasks, leads, and content | Full | Full | Full | Full | None |
| Edit tasks | Full | Full | Full | Own | None |
| Edit leads and sales stages | Full | Full | Full | Own | None |
| Edit projects and goals | Full | Full | Full | Own | None |
| Edit content | Full | Full | Full | Own | None |
| Archive operational records | Full | Full | Full | None | None |
| View detailed finance | Read | Read | Read | None | None |
| Mutate finance | Full | Full | None | None | None |
| View audit history | Read | Read | Read | Own | None |
| Invite or deactivate members | Full | Full | None | None | None |
| Change non-owner roles | Full | Full | None | None | None |
| Transfer ownership | Full | None | None | None | None |
| Change organization security settings | Full | None | None | None | None |

Before implementation, the product owner must approve or amend this matrix. Tests must encode the approved matrix as data so changes are deliberate and reviewable.

### Authorization invariants

1. A valid identity without an active Protos membership has no workspace access.
2. Every query and mutation derives the organization from membership; the browser cannot select an arbitrary organization ID.
3. Every mutation checks a named permission before reading or changing business data.
4. Record ownership never grants access outside the member's organization.
5. A deactivated membership fails closed on the next request.
6. UI visibility is never the only permission check.
7. The caller cannot provide or override the audit actor.
8. Sensitive finance fields are omitted from responses to roles without finance access.
9. Ownership transfer is transactional and cannot leave the organization without one active owner.
10. There is no hard-delete permission in Phase 1.

## 6. Data-model changes

All changes are additive until production migration and rollback verification are complete.

### New `users` table

| Field | Type | Purpose |
|---|---|---|
| `authSubject` | string | Stable identity-provider subject; unique index |
| `emailNormalized` | string | Lowercase verified email; unique index where supported by policy |
| `displayName` | string | Current display name |
| `avatarUrl` | string or null | Optional profile image |
| `createdAt` | ISO string | First application provisioning time |
| `updatedAt` | ISO string | Last synchronized profile update |
| `lastSeenAt` | ISO string or null | Last successful authenticated application use |

Indexes: `by_auth_subject`, `by_email_normalized`.

### New `memberships` table

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Stable external membership ID |
| `organizationId` | string | Protos organization ID |
| `userId` | Convex user document ID or null | Connected account after acceptance |
| `memberId` | string | Link to the existing team profile |
| `invitedEmailNormalized` | string | Invite target and reconciliation key |
| `accessRole` | role literal | Owner/admin/manager/member/viewer |
| `status` | status literal | Invited/active/deactivated |
| `invitedByUserId` | user ID or null | Actor who initiated access |
| `invitedAt` | ISO string | Invitation creation time |
| `acceptedAt` | ISO string or null | First successful connection |
| `deactivatedAt` | ISO string or null | Access removal time |
| `updatedAt` | ISO string | Last membership change |

Indexes: `by_organization`, `by_user`, `by_organization_user`, and `by_organization_invited_email`.

Constraints enforced in mutations:

- one membership per user per organization;
- one membership per member profile per organization;
- one active owner minimum;
- only invited, verified email addresses may claim unconnected memberships; and
- deactivated memberships cannot be reactivated without an authorized activity event.

### Existing `members` changes

- Keep the table as the team profile and job directory.
- Treat the current `role` field as `jobTitle` in application types; migrate the stored field in a later compatible change if desired.
- Deprecate `authUserId` after memberships are verified.
- Add `updatedAt` and optional `archivedAt` as part of the shared record foundation.
- Continue showing historical profiles even when their membership is deactivated.

### Existing `activityEvents` additions

Add optional fields first so old events remain valid:

- `actorUserId`;
- `actorMemberId`;
- `actorDisplayNameSnapshot`;
- `actionType` using a controlled value;
- `source` (`web`, `import`, `automation`, `admin`, or `system`);
- `requestId` or `correlationId`; and
- `metadata` containing a small redacted change summary.

New mutations write both the legacy human-readable fields and structured actor fields during the compatibility window. Audit events are append-only in normal application code.

## 7. Application and backend design

### Authentication configuration

Add:

- `@clerk/nextjs`;
- `convex/auth.config.ts` with the Clerk issuer and application ID;
- a root `proxy.ts` for Clerk session plumbing under Next.js 16;
- a root provider component for Clerk and authenticated Convex state;
- `/sign-in` and recovery routes using provider-hosted or prebuilt components; and
- environment-specific Clerk and Convex configuration.

Public signup stays disabled. Accounts are created by invitation only. Email verification is required. MFA is required for owner and admin accounts and recommended for all members.

### Server authorization layer

Create an authorization module in `convex/lib/auth.ts` with small composable helpers:

- `requireIdentity(ctx)`;
- `getCurrentUser(ctx)`;
- `requireActiveMembership(ctx)`;
- `requirePermission(ctx, permission)`;
- `requireRecordAccess(ctx, record, action)`; and
- `assertCanChangeRole(actorMembership, targetMembership, nextRole)`.

Helpers return a normalized authorization context:

```ts
type AuthorizationContext = {
  userId: Id<"users">;
  memberId: string;
  organizationId: string;
  accessRole: AccessRole;
  displayName: string;
};
```

Each Convex query or mutation starts with one of these helpers. Business functions receive the normalized context rather than raw user-controlled actor or organization values.

### Next.js gateway changes

The current same-origin gateway remains during Phase 1 to reduce migration risk.

- `GET /api/workspace` requires a valid session before loading data.
- `POST /api/workspace` requires a valid session and derives the Convex token server-side.
- The gateway never accepts `actor`, `userId`, `memberId`, `role`, or `organizationId` from browser input.
- The authenticated Convex token is attached to the server-side Convex client so `ctx.auth.getUserIdentity()` is available.
- The shared server secret is removed from user-facing workspace calls.
- API responses use consistent status semantics: `401` unauthenticated, `403` authenticated but forbidden, `404` unavailable in the authorized scope, `409` conflicting state, `422` validation failure, and `500` unexpected failure.
- Responses include a request ID for support correlation but never expose tokens or internal authorization details.

### Interface changes

- Replace the hard-coded `Akib` user in `app/page.tsx` with the authenticated membership profile.
- Show a dedicated auth-loading state before requesting workspace data.
- Provide sign-in, sign-out, expired-session, access-pending, and access-deactivated states.
- Add a user menu showing display name, job title, and access role.
- Hide or disable controls the current role cannot use, while preserving backend enforcement.
- Explain permission failures in plain language and preserve unsaved form input when reasonable.
- Add an owner/admin member-access screen listing invited, active, and deactivated memberships.

### Caching and data minimization

- Keep authenticated workspace responses `Cache-Control: private, no-store`.
- Do not place tokens, membership lists, or finance data in static page output.
- Return role-appropriate data transfer objects rather than loading sensitive fields and hiding them in React.
- Redact emails from general member lists unless the caller manages access.
- Do not log tokens, provider responses, complete workspace snapshots, or confidential record bodies.

## 8. Environment strategy

| Environment | Identity configuration | Convex configuration | Data policy |
|---|---|---|---|
| Local | Clerk development instance | Convex development deployment | Synthetic test data only |
| Vercel Preview | Clerk development/test instance | Isolated Convex preview deployment | Seeded non-confidential data |
| Production | Clerk production instance | Convex production deployment | Approved operational data |

Required web-host variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`;
- `CLERK_SECRET_KEY`;
- Clerk sign-in and redirect configuration as required by the selected flow;
- `NEXT_PUBLIC_CONVEX_URL`; and
- `DEPLOYMENT_READ_ONLY` during rollout.

Required Convex variable:

- `CLERK_JWT_ISSUER_DOMAIN` for each deployment.

Secret values must be configured through Clerk, Convex, and Vercel dashboards or approved CLIs. They must never be committed, printed in logs, copied into issue text, or embedded in `NEXT_PUBLIC_` values unless explicitly designed to be public.

Before auth testing begins, Preview must stop reading Production Convex data.

## 9. Implementation work packages

Each work package should become a GitHub Issue and normally one focused pull request. Sizes are relative complexity, not delivery promises.

### P1-01 — Approve authentication decision and access policy

Size: S

Depends on: none

Deliverables:

- approve Clerk as provider or record the replacement;
- name the Clerk account owner and recovery contact;
- approve permitted sign-in methods, invitation-only policy, and MFA requirement;
- approve the role/permission matrix; and
- create an architecture decision record without credentials.

Acceptance:

- every open policy decision has a named approver;
- no implementation assumption remains hidden; and
- owner recovery does not depend on one unavailable person.

### P1-02 — Separate Preview from Production data

Size: M

Depends on: P1-01

Deliverables:

- configure a Convex preview/development deployment for Vercel previews;
- seed it with non-confidential representative data;
- remove the production Convex URL and secret from Preview; and
- add an automated check that reports the connected environment without exposing secrets.

Acceptance:

- preview mutations cannot affect production counts;
- preview contains no private production records; and
- deleting a preview cannot damage production.

### P1-03 — Add identity-provider and session shell

Size: M

Depends on: P1-01, P1-02

Deliverables:

- install and configure Clerk for Next.js;
- add `proxy.ts`, root providers, sign-in, sign-out, recovery, and auth-loading states;
- protect the application page and workspace API resources; and
- configure local, preview, and production redirect URLs.

Acceptance:

- an anonymous request cannot receive workspace HTML containing data or a workspace API payload;
- an invited test user can sign in and sign out;
- expired sessions fail closed; and
- no provider secret appears in the client bundle.

### P1-04 — Add users, memberships, and migration scaffolding

Size: M

Depends on: P1-01

Deliverables:

- add additive `users` and `memberships` schema definitions and indexes;
- add typed role and membership-status validators;
- add idempotent migration/seed functions for the seven existing member profiles;
- create one pending membership for each approved email; and
- create a reconciliation report with linked, pending, duplicate, and error counts.

Acceptance:

- re-running the migration creates no duplicates;
- the organization has exactly one intended owner;
- all seven profiles have one membership row; and
- no existing business record is deleted or rewritten.

### P1-05 — Implement Convex authorization helpers

Size: L

Depends on: P1-03, P1-04

Deliverables:

- configure Convex token validation;
- implement identity, membership, permission, and record-access helpers;
- encode the approved permission matrix as typed policy data;
- add safe, typed authorization errors; and
- add unit tests for every role/capability combination.

Acceptance:

- missing identity, missing membership, deactivated membership, wrong organization, and insufficient role all fail closed;
- a caller cannot gain access by changing request fields; and
- every matrix cell has a passing allow or deny test.

### P1-06 — Protect workspace reads and minimize responses

Size: M

Depends on: P1-05

Deliverables:

- migrate `getWorkspaceSnapshot` from the server-secret check to authenticated membership;
- derive organization scope from membership;
- produce role-specific response DTOs;
- omit finance and audit details when the role lacks access; and
- return consistent authentication and authorization errors through the gateway.

Acceptance:

- anonymous reads fail;
- an authenticated non-member receives no workspace data;
- a viewer receives approved normal data but no detailed finance or audit data; and
- one organization cannot request another organization's snapshot.

### P1-07 — Protect mutations and trustworthy activity attribution

Size: L

Depends on: P1-05

Deliverables:

- migrate task, lead, and create-record mutations to named permissions;
- remove browser-supplied actor and organization fields;
- write structured activity events from the authorization context;
- reject deactivated users and forbidden record ownership changes; and
- retain the server secret only for separately named administrative functions.

Acceptance:

- direct API and direct Convex attempts enforce the same permissions;
- every successful mutation records the correct authenticated member and timestamp;
- denied mutations create no business-data change; and
- retry behavior does not create duplicate activity entries where idempotency is required.

### P1-08 — Build membership administration

Size: L

Depends on: P1-04, P1-05

Deliverables:

- owner/admin access screen;
- invite, resend, cancel, role-change, deactivate, and reactivate workflows;
- email-to-membership claim validation;
- last-owner and self-deactivation safeguards; and
- activity events for access changes.

Acceptance:

- only owner/admin can manage normal memberships;
- admin cannot alter the owner role;
- deactivation blocks the next protected request;
- historical records still show the deactivated member; and
- invitation secrets are handled only by the identity provider.

### P1-09 — Add permission-aware application states

Size: M

Depends on: P1-03, P1-06, P1-07

Deliverables:

- replace the hard-coded current user;
- render signed-out, pending-access, deactivated, forbidden, and session-expired states;
- add account and sign-out controls;
- apply role-aware controls across task, lead, content, finance, and member views; and
- preserve accessible keyboard and mobile behavior.

Acceptance:

- the visible user and role match the active membership;
- forbidden actions are not presented as available;
- forced API calls still fail server-side; and
- auth state changes do not display another user's cached data.

### P1-10 — Authorization integration and browser tests

Size: L

Depends on: P1-06, P1-07, P1-08, P1-09

Deliverables:

- route-handler tests for 401, 403, 404, 409, 422, and success paths;
- Convex integration tests for role and organization scope;
- browser tests for sign-in, sign-out, invitation acceptance, expired session, viewer restrictions, member mutation, admin deactivation, and owner safeguard;
- secret-scanning and client-bundle checks; and
- a manual seven-role/member acceptance checklist.

Acceptance:

- critical authorization failures block merge;
- tests demonstrate both allowed and denied behavior;
- direct mutation attempts cannot bypass the interface; and
- logs and test artifacts contain no live credentials or private production records.

### P1-11 — Production migration and staged write enablement

Size: M

Depends on: P1-02 through P1-10

Deliverables:

- deploy additive schema and auth configuration;
- invite and verify the owner first, then one admin, then remaining members;
- reconcile all seven memberships;
- smoke-test authenticated production reads while writes remain locked;
- enable writes for owner/admin canary testing;
- enable approved roles after sign-off;
- rotate or restrict the legacy server secret; and
- record release and rollback evidence.

Acceptance:

- anonymous production reads and writes fail;
- all seven intended members have the approved access state;
- the owner, viewer, member, and deactivated-user checks pass in production;
- authenticated mutations record the correct actor;
- `DEPLOYMENT_READ_ONLY` is removed only after written approval; and
- the rollback procedure has been rehearsed.

### P1-12 — Documentation and operational handoff

Size: S

Depends on: P1-11

Deliverables:

- update architecture, data model, development setup, deployment, security, and README documents;
- add member onboarding/offboarding runbooks;
- add lost-device, compromised-account, and owner-recovery procedures;
- document environment ownership and secret rotation; and
- mark the old shared identity path deprecated.

Acceptance:

- a second maintainer can invite, deactivate, recover, deploy, and roll back without undocumented knowledge;
- all production URLs and runtime descriptions are current; and
- documentation contains no real secrets or unapproved personal data.

## 10. Recommended pull-request sequence

```text
PR 1  Policy ADR + preview isolation
PR 2  Clerk session shell and protected empty application boundary
PR 3  Users/memberships schema + idempotent migration
PR 4  Convex authorization library + permission unit tests
PR 5  Authenticated reads + role-specific DTOs
PR 6  Authenticated mutations + structured audit events
PR 7  Membership administration UI and workflows
PR 8  Permission-aware workspace UI
PR 9  Integration/E2E tests + release runbook
PR 10 Production migration, canary enablement, and documentation closeout
```

Do not combine the production migration with the first auth implementation pull request. Schema compatibility, identity provisioning, and access cutover must be independently reviewable.

## 11. Rollout plan

### Stage 0 — Freeze and prepare

- Keep Vercel Production in read-only mode.
- Keep the existing OpenAI Site available as a rollback reference.
- Export a verified Convex backup or snapshot according to the supported procedure.
- Record current table counts and production commit/deployment IDs.
- Create separate development/preview identity and Convex environments.

### Stage 1 — Additive backend release

- Deploy auth configuration, new tables, optional audit fields, and authorization helpers.
- Do not remove legacy fields or functions.
- Run the membership migration as a dry run, review the report, then commit it once.

### Stage 2 — Owner canary

- Invite the owner account.
- Verify login, membership claim, read-only data, sign-out, session expiry, and MFA.
- Confirm anonymous requests now fail before enabling any write.

### Stage 3 — Admin and role canaries

- Add one admin, one normal member, and one viewer/test account.
- Execute the allow/deny checklist for each role.
- Confirm actor attribution and immediate deactivation.

### Stage 4 — Full-team onboarding

- Invite the remaining team members.
- Resolve pending or duplicate email matches.
- Confirm every person can reach only the intended organization and capabilities.

### Stage 5 — Enable writes

- Keep the global read-only switch available.
- Enable owner/admin write canary and test task creation, task movement, lead movement, and content creation.
- Reconcile data and audit events.
- Remove the read-only flag for approved roles only after sign-off.

### Stage 6 — Close compatibility window

- Restrict or rotate the shared server secret.
- Remove user-facing calls to legacy secret-authorized functions.
- Keep any required migration/admin function internal and separately named.
- Update docs and record the final production verification.

## 12. Rollback plan

If authentication, authorization, or data integrity fails:

1. set `DEPLOYMENT_READ_ONLY=true` in Vercel Production and redeploy;
2. revoke or disable affected Clerk sessions/invitations;
3. roll Vercel back to the last verified authenticated deployment, not to the current public-readable release unless explicitly approved;
4. leave additive Convex fields and tables in place unless a reviewed migration proves removal safe;
5. restore data only when a verified mutation caused corruption;
6. preserve audit evidence and record the incident; and
7. keep the OpenAI Site as a reference/fallback during the migration window.

Rollback success means writes are stopped, unauthorized reads are stopped, data counts reconcile, and the failure is reproducible in a non-production environment.

## 13. Verification checklist

### Identity

- [ ] Public registration is disabled.
- [ ] Only an invited, verified email can activate a membership.
- [ ] Sign-in, sign-out, recovery, expiration, and revocation work.
- [ ] Owner/admin MFA policy is enforced.

### Authorization

- [ ] Anonymous page and API requests reveal no workspace data.
- [ ] Authenticated non-members reveal no workspace data.
- [ ] Every role matches the approved permission matrix.
- [ ] Cross-organization IDs cannot bypass membership scope.
- [ ] Deactivation takes effect on the next protected request.
- [ ] The last active owner cannot be removed or demoted accidentally.

### Data and audit

- [ ] All seven existing profiles reconcile to exactly one membership.
- [ ] Important mutations record user, member, organization, action, entity, source, and timestamp.
- [ ] Old activity remains readable.
- [ ] Denied mutations cause no partial database changes.

### Deployment

- [ ] Local, Preview, and Production use separate approved configuration.
- [ ] Preview cannot read or mutate Production data.
- [ ] No auth or Convex secret appears in Git, logs, browser storage, or client JavaScript.
- [ ] Production stays read-only until the final gate is signed off.
- [ ] Backup and rollback evidence is recorded.

## 14. Production gate

The product owner and implementation reviewer must explicitly confirm all of the following before production writes are enabled:

- the provider and recovery ownership are approved;
- the permission matrix is approved;
- all seven membership records reconcile;
- anonymous and non-member access tests fail closed;
- owner, admin, member, viewer, and deactivated-user tests pass;
- Preview is isolated from Production data;
- the backup and rollback procedure is verified; and
- no critical or high-severity security issue remains open.

Until this gate passes, `DEPLOYMENT_READ_ONLY=true` remains enabled in Vercel Production.

## 15. Definition of done

Phase 1 is done when the production workspace is private, all intended team members have individual identities and approved roles, all reads and writes are authorized in Convex, activity history names the real actor, production writes are safely enabled, and onboarding/offboarding can be operated by a second maintainer from documented procedures.
