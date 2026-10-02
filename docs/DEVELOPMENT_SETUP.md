# Development Setup

## Requirements

- Node.js 22.13 or newer
- npm
- Git

## Clone and install

```bash
git clone https://github.com/akiibot/protos_common_center.git
cd protos_common_center
npm install
```

## Build

```bash
npm run build
```

The build must succeed before a pull request is ready for review.

## Local database

The application expects a D1 binding named `DB`. Generate a migration after changing `db/schema.ts`:

```bash
npm run db:generate
```

Inspect the new SQL file under `drizzle/`. After one successful build, apply pending migrations to the local D1 database in order:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tiresome_captain_cross.sql
```

Replace the filename with each pending migration. Do not replay migrations already applied to the same local state.

## Start development

```bash
npm run dev
```

Open `http://127.0.0.1:5173`.

Local D1 state is stored under ignored `.wrangler/` directories. The application seeds representative Protos records when the workspace is empty.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server with hot reload. |
| `npm run build` | Create the production-compatible application build. |
| `npm run start` | Run the built Worker locally. |
| `npm run db:generate` | Generate SQL migrations from schema changes. |
| `npm run lint` | Run static lint checks when relevant. |

## Working on an issue

```bash
git checkout main
git pull
git checkout -b feature/12-task-editing
```

Commit focused changes with clear messages. Push the branch and open a pull request against `main`.

## Environment and secrets

Do not commit local environment files, tokens, credentials, production exports, or real confidential client information. If a future feature requires a secret, document the variable name in an example file without adding its value.

## Production deployment

GitHub does not automatically publish the OpenAI Sites deployment. A maintainer publishes an approved merged commit separately. Contributors should not change the production access policy or deploy migrations unless the owner explicitly assigns that release task.

## Troubleshooting

### The database has no tables

Build the application, then apply the pending migrations to local D1.

### A schema change appears locally but not in SQL

Run `npm run db:generate` and inspect the generated migration.

### The development port is already in use

Stop the prior development process or start on a different loopback port:

```bash
npm run dev -- --port 5174
```

### The application shows representative seed data

This is expected in an empty local database. Never replace representative records with confidential production data in a public branch.

