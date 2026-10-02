# Development Setup

## Requirements

- Node.js 22.13 or newer
- npm
- Git
- a Convex account with access to the Protos project

## Clone and install

```bash
git clone https://github.com/akiibot/protos_common_center.git
cd protos_common_center
npm install
```

## Connect a development backend

Run:

```bash
npm run convex:dev
```

The Convex CLI signs you in, connects or creates a development deployment, creates `.env.local`, generates typed API bindings, and watches the `convex/` directory.

The web application uses a server-only gateway. For local development, configure these ignored values in `.env.local`:

```text
CONVEX_URL=<your development deployment URL>
CONVEX_SERVER_SECRET=<a local development secret>
```

Set the same local secret on the Convex development deployment as `WORKSPACE_API_SECRET`. Never commit either secret.

For a fresh development database, run the `workspace:seedWorkspace` mutation once with that development secret. The mutation is idempotent and will not insert a second workspace when `org_protos` already exists.

## Start development

Keep `npm run convex:dev` running in one terminal. In another terminal, run:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`.

## Build

```bash
npm run build
```

The build must succeed before a pull request is ready for review.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the web application with hot reload. |
| `npm run build` | Create the production-compatible Worker build. |
| `npm run start` | Run the built Worker locally. |
| `npm run convex:dev` | Sync Convex functions and regenerate typed bindings. |
| `npm run convex:deploy` | Deploy schema and functions to the production Convex deployment. |
| `npm run lint` | Run static lint checks when relevant. |

## Working on an issue

```bash
git checkout main
git pull
git checkout -b feature/12-task-editing
```

Commit focused changes with clear messages. Push the branch and open a pull request against `main`.

## Environment and secrets

Do not commit local environment files, Convex credentials, Sites credentials, production exports, tokens, or confidential business information. Document variable names without including their values.

Browser code must never receive `CONVEX_SERVER_SECRET` or `WORKSPACE_API_SECRET`. Browser requests go through the same-origin API gateway.

## Production deployment

Production has two coordinated deployments:

1. Deploy compatible backend functions and schema with `npm run convex:deploy`.
2. Verify any data migration in Convex.
3. Configure the Site runtime with the production `CONVEX_URL` and matching secret.
4. Build and publish the OpenAI Site.

Merging into GitHub does not automatically publish either production deployment. Only a maintainer should perform the production release.

## Troubleshooting

### The workspace remains on the loading screen

Confirm `CONVEX_URL` and `CONVEX_SERVER_SECRET` exist in the web runtime and that the matching `WORKSPACE_API_SECRET` exists on the selected Convex deployment.

### The workspace is not initialized

Run the idempotent `workspace:seedWorkspace` mutation against the intended development deployment using its configured secret.

### Convex types are missing or stale

Run `npx convex codegen` or `npm run convex:dev`.

### The development port is already in use

Stop the prior development process or start on a different loopback port:

```bash
npm run dev -- --port 5174
```
