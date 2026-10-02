# Architecture

## Current system

```text
Browser
  ├─ Server-rendered workspace page
  ├─ Client-side navigation and optimistic updates
  └─ POST /api/records
            │
            ▼
      Workspace service
            │
            ▼
      Drizzle ORM → Cloudflare D1

OpenAI Sites
  ├─ Cloudflare Worker-compatible application runtime
  ├─ Site-level access policy
  └─ Manual version publication
```

## Runtime

The application uses React 19 with a Next-compatible Vinext build. The deployable output is a Cloudflare Worker. UI code lives primarily under `app/`, shared record logic under `lib/`, and D1 schema definitions under `db/`.

## Rendering and client state

`app/page.tsx` loads a workspace snapshot on the server. `app/dashboard-client.tsx` receives the snapshot, renders all operating views, and performs optimistic updates for supported actions.

The current application uses a single page with client-side view switching. Add separate routes only when deep linking, record detail, navigation history, or loading boundaries make them materially better.

## Persistence

The `DB` binding is a Cloudflare D1 database. `db/index.ts` obtains the runtime binding and creates a Drizzle client. `db/schema.ts` defines tracked tables. SQL migrations live under `drizzle/`.

Data-access principles:

- scope every query to an organization;
- validate all writes on the server;
- use transactions for multi-record workflows;
- use stable identifiers for relationships;
- store money as integer paisha;
- archive business records instead of immediately deleting them; and
- write audit events with important mutations.

## API

The current `/api/records` endpoint supports task-status changes, lead-stage changes, and quick creation of tasks, leads, and content ideas.

This compact endpoint is acceptable for the first release. As complete workflows are implemented, separate route handlers by resource or bounded workflow, for example:

```text
/api/tasks
/api/tasks/:id
/api/leads/:id/stage
/api/leads/:id/convert
/api/projects/:id/milestones
/api/imports/spreadsheet
```

Do not split routes without also introducing clear validation, authorization, and shared service functions.

## Identity and access

There is currently no application-owned login. The hosted Site remains protected by its Sites access policy, while local development uses a shared workspace actor.

Before storing sensitive client or financial data, implement an approved identity and role model. Authorization must be enforced server-side on every read and write. UI visibility is not an authorization boundary.

## Activity and audit history

`activity_events` currently stores a short actor/action/entity record. The target design should add structured action type, before/after summary or change metadata, request source, and stable actor identity. Audit events should be append-only for normal application use.

## Browser agent tools

The dashboard registers read-only WebMCP tools for retrieving a workspace summary and opening a workspace view. Future tools must share the same services and permission checks as the visible interface. Tool names must accurately communicate whether an operation reads, prepares, or commits a change.

## Deployment

GitHub is the collaboration source. The live Site is published separately through OpenAI Sites. Merging `main` is not equivalent to production deployment.

Release sequence:

1. merge an approved pull request;
2. review migrations and access implications;
3. build the exact merged commit;
4. save and publish a Site version;
5. verify terminal deployment success; and
6. record any migration or release notes.

## Target architecture direction

As the product grows, introduce these boundaries gradually:

```text
app/                  Routes, layouts, route handlers
components/           Shared visual and interaction components
features/<domain>/    Domain-specific UI, validation, and actions
lib/auth/             Identity and authorization
lib/services/         Multi-record business workflows
lib/repositories/     Organization-scoped persistence
db/                   Schema and database client
drizzle/              Immutable migrations
tests/                 Business, API, and critical-flow tests
```

Avoid a large rewrite. Move code behind these boundaries as features require it.

## Architectural decisions still required

- final identity provider and role enforcement approach;
- attachment/object-storage strategy;
- spreadsheet import format and idempotency key;
- optimistic concurrency mechanism;
- notification delivery channels;
- backup frequency and restore objectives; and
- whether future multi-workspace support is justified.

