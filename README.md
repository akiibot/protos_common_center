# Protos Common Center

Protos Common Center is the shared operating system for Protos, a seven-person AI-powered web development company in Dhaka, Bangladesh. It brings strategy, sales, clients, delivery, tasks, content, finance, team capacity, and company knowledge into one connected workspace.

## Product status

The first usable release is live. It contains:

- a company command dashboard;
- goals and roadmap tracking;
- a sales pipeline with persistent stage changes;
- projects, tasks, and ownership views;
- content, finance, team, and knowledge views;
- quick creation for tasks, leads, and content ideas; and
- persistent Cloudflare D1 storage.

The current release is an operational foundation, not the finished system. Several views are still read-only or use representative seed data. See [ROADMAP.md](ROADMAP.md) for release sequencing and [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the detailed backlog.

## Start here

| If you want to… | Read… |
|---|---|
| Understand the product and company context | [Product vision](docs/PRODUCT_VISION.md) |
| See what comes next | [Roadmap](ROADMAP.md) |
| Choose an implementation task | [Implementation plan](docs/IMPLEMENTATION_PLAN.md) and [GitHub Issues](https://github.com/akiibot/protos_common_center/issues) |
| Understand the codebase | [Architecture](docs/ARCHITECTURE.md) |
| Understand records and relationships | [Data model](docs/DATA_MODEL.md) |
| Run the application locally | [Development setup](docs/DEVELOPMENT_SETUP.md) |
| Contribute safely | [Contributing guide](CONTRIBUTING.md) |

## Technology

- React 19 and Next-compatible Vinext
- TypeScript
- Cloudflare Workers and D1
- Drizzle ORM and generated SQL migrations
- Tailwind CSS and shared UI primitives
- OpenAI Sites hosting

## Local quick start

Requirements: Node.js 22.13 or newer, npm, and Git.

```bash
npm install
npm run build
npm run dev
```

The local application opens at `http://127.0.0.1:5173`. D1 setup and migration instructions are in [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md).

## Collaboration workflow

1. Pick an issue in the `ready` state.
2. Comment that you are taking it and get it assigned.
3. Create a branch such as `feature/12-task-editing`.
4. Keep the change focused on that issue.
5. Run the required checks.
6. Open a pull request and connect it to the issue.
7. Merge only after review.

Merging to GitHub does **not** automatically publish the production Site. Production publication is a separate release step owned by the project maintainer.

## Data and security

This repository is public. Never commit API keys, credentials, private client details, contracts, invoices, phone numbers, or confidential business information. Use invented or explicitly approved sample data in source code and tests.

## Links

- [Live Common Center](https://protos-common-center.bdteam227871.chatgpt.site)
- [GitHub issues](https://github.com/akiibot/protos_common_center/issues)
- [Repository](https://github.com/akiibot/protos_common_center)
