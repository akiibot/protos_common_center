# Vercel Deployment Plan

## Goal

Deploy Protos Common Center to Vercel without interrupting the current OpenAI Sites deployment or exposing production Convex data through an unprotected preview.

## Initial deployment shape

- Keep the OpenAI Site live as the rollback environment.
- Add a native Next.js build alongside the existing Sites/Vinext build.
- Connect Vercel to the GitHub repository.
- Deploy this branch as a read-only Vercel Preview.
- Keep the existing production Convex deployment unchanged.
- Promote to a Vercel production domain only after access control is approved and the preview passes smoke testing.

## Current Preview checkpoint

- Deployment: <https://protos-common-center-ofogi0d3j-akiiibots-projects.vercel.app>
- Vercel deployment ID: `dpl_ASsoZQL7QixvktTqkA4t6eUzxs36`
- Preview uses the Clerk Development instance and Convex Development deployment.
- Preview has its own matching `WORKSPACE_API_SECRET`; the legacy `CONVEX_SERVER_SECRET` has been removed from Preview.
- `DEPLOYMENT_READ_ONLY=true` remains enforced in Preview.
- Vercel SSO currently protects the deployment before application authentication.
- The Preview URL is registered as an allowed Clerk Development redirect.
- Hosted owner-canary evidence: `POST /api/access`, `GET /api/memberships`, and repeated `GET /api/workspace` requests returned HTTP 200 on 2026-10-03.
- Production variables and the production deployment were not changed.

## Build commands

| Target | Command |
|---|---|
| OpenAI Sites | `npm run build` |
| Vercel | `npm run build:vercel` |
| Native Next development | `npm run dev:vercel` |

## Environment contract

The authenticated Vercel runtime requires:

- `NEXT_PUBLIC_CONVEX_URL` — the selected Convex deployment URL;
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — the environment-specific Clerk publishable key;
- `CLERK_SECRET_KEY` — the environment-specific server-only Clerk key;
- `WORKSPACE_API_SECRET` — a server-only credential matching the selected Convex deployment; and
- `DEPLOYMENT_READ_ONLY=true` on the first Preview deployment.

Never expose the server credential in a `NEXT_PUBLIC_` variable.

## Preview acceptance checks

- The root dashboard loads without a server or browser error.
- All nine migrated record groups reconcile with production counts.
- Navigation, search, charts, and responsive layout work.
- `GET /api/workspace` succeeds.
- Preview write requests are rejected with HTTP 403.
- Direct Convex requests without the server credential remain rejected.
- No secret is present in browser JavaScript or repository files.

## Production gate

Do not promote the preview until one of these access models is approved:

1. application-owned team authentication and Convex role enforcement; or
2. Vercel production deployment protection suitable for every intended team member.

The first option is preferred because it provides individual identities, roles, and trustworthy activity history.

## Later CI improvement

After the first Vercel deployment is stable:

- add a Convex production deploy key scoped only to Production;
- add a separate Convex preview deploy key scoped only to Preview;
- give every pull request an isolated Convex preview deployment;
- seed previews with representative non-confidential data; and
- require successful build, lint, and smoke checks before production promotion.

## Rollback

- Keep the current OpenAI Site published during the migration window.
- Do not move a custom domain during the first deployment.
- If Vercel fails, continue using the existing Site and roll back the Vercel deployment.
- Keep Convex schema changes backward-compatible so both web deployments can use the same production backend during the transition.
