# Access Operations Runbook

## Purpose

This runbook covers routine Phase 1 identity and access operations for Protos Common Center. It contains no credentials. Perform identity-provider changes in Clerk, application membership changes in the Common Center Team view, deployment changes in Vercel, and data administration in Convex.

## Roles and ownership

- The Owner is the final approver for access, ownership transfer, security settings, and production write enablement.
- Admins may manage non-owner memberships but cannot alter or deactivate the Owner.
- Managers, Members, and Viewers cannot administer access.
- Job titles remain profile information and do not grant permissions.
- Exactly one intended Owner must be recorded before a production rollout.

## Invite a member

1. Confirm the person's legal name, company job title, verified work email, and requested access role.
2. An Owner or Admin opens **Team → Workspace access**.
3. Create or reconcile the member profile and membership before sending the Clerk invitation.
4. Send the invitation only through Clerk; never copy invitation tickets into chat, issues, logs, or source files.
5. Ask the member to accept with the exact invited email.
6. Confirm the membership becomes `active`, `acceptedAt` is populated, and the linked user matches the invitation.
7. Execute the relevant role checklist before the account is considered onboarded.

## Resend or cancel a pending invitation

- Use **Resend** to revoke any previous pending ticket and issue a new Clerk ticket.
- Use **Cancel** to revoke the Clerk ticket and mark the application membership deactivated.
- Never reuse or manually forward an old ticket URL.

## Change a role

1. Confirm approval and the required business capability.
2. Change the role in **Team → Workspace access**.
3. Verify an audit event records the actor, target member, previous role, and next role.
4. Ask the member to refresh and verify the visible controls.
5. For Owner transfer, use **Make owner**. The previous Owner becomes Admin in the same transaction.

## Deactivate a member

1. Confirm offboarding approval and effective time.
2. Reassign operational records when necessary; historical records keep the original member attribution.
3. Select **Deactivate** in **Team → Workspace access**.
4. Confirm the next protected request fails.
5. Revoke active Clerk sessions and remove unrelated third-party access separately.
6. Preserve audit and business history; Phase 1 does not hard-delete members.

The system prevents self-deactivation and prevents deactivating the Owner. Transfer ownership first when required.

## Reactivate a member

1. Confirm the same person still controls the verified email.
2. Select **Reactivate**.
3. Review the access role before restoring work.
4. Require Owner/Admin MFA and verify the next authenticated request.

## Owner and Admin MFA

- Authenticator-app MFA and backup codes are enabled in Clerk.
- The application returns HTTP 428 and routes privileged users to `/security` until Clerk reports two-step verification enabled.
- Store recovery codes in the approved company password manager, not in source control or chat.
- Do not bypass the MFA gate by changing a privileged user to a less-protected role.

## Lost or compromised device

1. Revoke the affected Clerk sessions immediately.
2. Rotate the user's password and MFA recovery methods.
3. Review access audit events and workspace activity from the suspected period.
4. Deactivate the membership if account control is uncertain.
5. Rotate Vercel, Convex, Clerk, and GitHub credentials only when their exposure is plausible.
6. Record scope, timeline, evidence, actions, and final verification in the incident record.

## Owner recovery

1. Use Clerk workspace recovery through the designated organizational account and recovery contact.
2. Do not create a second application Owner as a shortcut.
3. If the application Owner identity is lost, restore Clerk access first, verify the email, then reconcile the existing membership.
4. If ownership must move, use the transactional ownership-transfer workflow after the replacement account is active and protected by MFA.

## Environment and secret rotation

- Local and Vercel Preview use Clerk Development and Convex Development only.
- Production uses a Clerk Production instance and Convex Production only.
- Rotate `CLERK_SECRET_KEY` in Clerk, update the matching Vercel environment scope, then redeploy.
- Rotate `WORKSPACE_API_SECRET` by generating a new random value, updating Convex and the matching Vercel scope, testing provisioning, and deleting the old value.
- Never put a server secret in a `NEXT_PUBLIC_` variable.
- Keep the legacy `CONVEX_SERVER_SECRET` out of user-facing Preview and remove it from Production after cutover verification.

## Verification after any access change

- Anonymous access reveals no workspace data.
- The member has exactly one membership for Protos.
- The role and status are correct.
- Finance and audit data are minimized for the role.
- Forbidden direct requests fail server-side.
- The activity event contains the authenticated actor and timestamp.

