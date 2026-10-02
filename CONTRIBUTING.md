# Contributing to Protos Common Center

Thank you for helping build the operating system Protos uses to run the company.

## Before starting

1. Read [README.md](README.md), [ROADMAP.md](ROADMAP.md), and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. Choose an open GitHub Issue marked `ready`.
3. Confirm the issue has clear acceptance criteria and no unresolved `needs-decision` label.
4. Comment on the issue before starting so two people do not implement the same work.

## Branches

Create branches from the latest `main`.

Use one of these formats:

- `feature/<issue-number>-short-name`
- `fix/<issue-number>-short-name`
- `docs/<issue-number>-short-name`
- `chore/<issue-number>-short-name`

Do not commit directly to `main` for normal feature work.

## Local development

Follow [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md). Keep dependency changes intentional. Never commit `.env`, `.wrangler`, `.sites-runtime`, build output, tokens, or production data.

## Database changes

When changing `convex/schema.ts`:

1. update the relevant documentation in `docs/DATA_MODEL.md`;
2. run `npx convex dev --once` against the development deployment;
3. review index additions, removals, and schema validation output;
4. test the change against existing development data;
5. verify old records remain valid; and
6. include the data migration and rollback plan in the pull request.

Never remove or narrow a production field until existing data has been migrated and verified.

## Product rules

- Reuse the existing visual system and UI primitives.
- Keep essential text readable and controls usable on mobile.
- Every write must validate input on the server.
- Do not rely only on hidden buttons for authorization.
- Record important business mutations in activity history.
- Store money as integer paisha, not floating-point taka.
- Store dates consistently and display them in the workspace timezone.
- Do not add speculative fields or workflows without an approved issue.

## Required checks

Before opening a pull request:

```bash
npm run build
```

Also verify the changed flow manually. If the change includes a data migration, test it against both an empty development deployment and a deployment containing representative records.

## Pull requests

Keep each pull request focused on one issue. The description must include:

- the problem and user outcome;
- the implementation summary;
- screenshots for visible changes;
- database or access implications;
- verification performed;
- known limitations; and
- `Closes #<issue-number>` when appropriate.

At least one collaborator should review functional changes before merge. Resolve comments with code or an explicit recorded decision.

## Production releases

Merging into `main` updates GitHub but does not automatically deploy the live Site. Only the maintainer should publish production after reviewing the merged commit, migration impact, and access policy.

## Security and private information

The GitHub repository is public. Do not commit:

- API keys, tokens, passwords, or cookies;
- private client contact information;
- client contracts, invoices, or confidential files;
- production database exports; or
- unapproved internal financial or strategic data.

If sensitive data is committed, stop work and alert the repository owner immediately. Do not merely delete it in a later commit because Git history retains it.
