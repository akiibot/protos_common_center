# Phase 1 Release and Rollback Runbook

## Preconditions

- All automated policy, role-canary, browser-canary, lint, and production-build checks pass.
- Seven real member profiles reconcile to seven memberships and no synthetic memberships remain.
- Owner and Admin accounts have MFA.
- Vercel Preview points only to Convex Development and Clerk Development.
- A production Convex snapshot has been exported and its checksum recorded.
- A custom production domain owned by Protos is connected to Vercel and available for Clerk Production DNS records.
- Clerk Production is configured with production OAuth credentials and invite-only registration.
- Production remains `DEPLOYMENT_READ_ONLY=true` until the write canary is approved.

## Staged release

1. Deploy additive Convex schema and authorization functions to Production.
2. Configure `CLERK_JWT_ISSUER_DOMAIN` in Convex Production.
3. Configure production-only Clerk and Convex variables in Vercel.
4. Deploy Vercel Production with read-only mode enabled.
5. Verify anonymous page and API requests fail closed.
6. Invite and verify the Owner; confirm MFA, workspace read, finance visibility, and audit visibility.
7. Verify one Admin, one Member, and one Viewer.
8. Deactivate the synthetic or designated canary member and confirm the next request fails.
9. Enable writes for the Owner/Admin canary window and test a uniquely named temporary record.
10. Reconcile the temporary record and audit event, then remove the temporary business record through the approved cleanup path.
11. Remove read-only mode only after written Owner approval.
12. Rotate or remove the legacy shared production secret.

## Rollback

1. Set `DEPLOYMENT_READ_ONLY=true` in Vercel Production and redeploy.
2. Revoke affected Clerk sessions or invitations.
3. Roll back Vercel to the last verified authenticated deployment.
4. Leave additive Convex schema fields in place unless a reviewed migration proves removal safe.
5. Restore the Convex snapshot only if verified data corruption occurred.
6. Confirm anonymous access remains blocked, writes are stopped, and table counts reconcile.
7. Record the incident and keep the OpenAI Site as a reference environment.

## Current backup evidence

- Snapshot timestamp: `1790989574902869886`
- Convex Production deployment: `little-toucan-807`
- Local archive: `/Users/yeanul/Documents/ChatGPT/Protos/backups/protos-production-pre-phase1-2026-10-03.zip`
- SHA-256: `638afbefa833354155d3ae6f4156e8f3f3531f5421bf2bb6231eda76c91b71ed`

