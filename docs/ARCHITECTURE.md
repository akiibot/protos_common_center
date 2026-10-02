# Architecture

## Current system

```text
Browser
  ├─ Single-page operating workspace
  ├─ Optimistic task and lead updates
  ├─ GET /api/workspace
  └─ POST /api/workspace
            │
            ▼
   Server-only Convex gateway
     ├─ Zod request validation
     ├─ Convex deployment URL
     └─ Server credential
            │
            ▼
   Convex queries and mutations
            │
            ▼
       Convex database

OpenAI Sites
  ├─ Cloudflare Worker-compatible web runtime
  ├─ Runtime environment configuration
  ├─ Site-level access policy
  └─ Manual version publication
```

## Runtime

The web application uses React 19 with a Next-compatible Vinext build. Its deployable output is a Cloudflare Worker hosted by OpenAI Sites. The application backend and structured data run on Convex.

UI code lives under `app/`, the server-only Convex client is in `lib/convex-server.ts`, and the Convex schema and backend functions live under `convex/`.

## Rendering and client state

`app/page.tsx` renders the workspace client. `app/dashboard-client.tsx` loads a complete workspace snapshot through the same-origin gateway, renders the operating views, applies optimistic changes for supported actions, and refreshes after committed writes. A short background refresh keeps multiple team sessions reasonably current without exposing backend credentials to the browser.

The application currently uses a single page with client-side view switching. Add separate routes only when deep linking, record detail, navigation history, or loading boundaries make them materially better.

## Persistence

`convex/schema.ts` defines the production data model and indexes. `convex/workspace.ts` contains organization-scoped queries and mutations. Every stored business record carries a stable external ID and an organization ID.

Data-access principles:

- scope every query and mutation to an organization;
- validate browser input at the same-origin API boundary and Convex function boundary;
- keep the Convex server credential out of browser bundles;
- use atomic Convex mutations for multi-record workflows;
- use stable identifiers for relationships;
- store money as integer paisha;
- archive business records instead of immediately deleting them; and
- write activity events with important mutations.

## API and backend boundary

The `/api/workspace` gateway supports workspace reads, task-status changes, lead-stage changes, and quick creation of tasks, leads, and content ideas. It is intentionally the only browser-facing data boundary in the current release.

Convex functions require a server-only credential. The browser never receives that credential or calls protected Convex functions directly. This keeps the existing no-application-login experience while preventing the Convex deployment URL from becoming an unauthenticated data API.

As workflows expand, split the same-origin API by resource or bounded workflow only when it improves validation and ownership. Keep all browser routes thin and place business transactions in Convex mutations.

## Identity and access

There is currently no application-owned login. The hosted Site uses its Sites access policy, while the application gateway uses a server credential to reach Convex.

Before storing sensitive client or financial data, implement an approved member identity and role model. Authorization must be enforced inside Convex functions in addition to any visible interface restrictions. A shared server credential is backend authentication, not user-level authorization.

## Activity and audit history

`activityEvents` currently stores a short actor/action/entity record. The target design should add a stable actor identity, structured action type, before/after summary or change metadata, request source, and correlation ID. Audit events should be append-only for normal application use.

## Browser agent tools

The dashboard registers read-only WebMCP tools for retrieving a workspace summary and opening a workspace view. Future tools must share the same gateway, business rules, and permission checks as the visible interface.

## Deployment

GitHub is the collaboration source. The live web application is published through OpenAI Sites, while backend functions and schema are deployed through Convex.

Release sequence:

1. merge an approved pull request;
2. deploy and verify compatible Convex functions and schema;
3. run and reconcile any required data migration;
4. build the exact merged web commit;
5. save and publish a Site version with the production Convex environment configuration;
6. verify the Site deployment reaches terminal success; and
7. record migration and release notes.

## Target architecture direction

```text
app/                  Routes, layouts, route handlers
components/           Shared visual and interaction components
features/<domain>/    Domain-specific UI and validation
lib/                   Server gateway and shared utilities
convex/                Schema, queries, mutations, actions, workflows
tests/                 Business, API, and critical-flow tests
```

Avoid a large rewrite. Move code behind these boundaries as features require it.

## Architectural decisions still required

- final identity provider and per-member role enforcement;
- attachment and file-storage strategy;
- spreadsheet import format and idempotency key;
- notification delivery channels;
- production backup and restore objectives; and
- whether future multi-workspace support is justified.
