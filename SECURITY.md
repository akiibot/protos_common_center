# Security Policy

## Reporting a vulnerability

Do not open a public GitHub Issue for a vulnerability that could expose private company or client data. Contact the repository owner directly with the affected route, reproduction steps, likely impact, and any suggested mitigation.

Do not access, copy, or modify data beyond what is necessary to demonstrate the problem.

## Sensitive information

This repository is public. Never commit secrets, private client details, production database exports, internal contracts, or confidential financial records.

If a secret is exposed, notify the owner immediately so it can be revoked and Git history can be cleaned appropriately.

## Security baseline for changes

- Validate all external input on the server.
- Enforce organization scope and authorization in data access.
- Do not treat hidden interface controls as authorization.
- Avoid logging credentials or private record contents.
- Use parameterized database operations.
- Record important mutations in audit history.
- Review migrations for unintended data loss.

