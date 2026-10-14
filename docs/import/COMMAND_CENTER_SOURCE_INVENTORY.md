# Command Center Source Inventory

Status: sanitized inventory complete; mapping decisions open

- Source label: `protos-command-center-2026-10-15`
- SHA-256: `e077ad998af485300276ba41bb91b3829e44af084c04e80143486d841fa57120`
- Format: read-only `.xlsx` export of the owner-provided Google Sheet
- Structure: 11 visible sheets, 1900 date system, no defined names

The workbook and detailed inventory remain under ignored `artifacts/import/` paths.

| Sheet | Candidate rows | Proposed treatment |
|---|---:|---|
| Start Here | n/a | Omit instructions. |
| Dashboard | n/a | Derive; do not import formulas or summaries. |
| Roadmap & Phases | 3 | Goals after required defaults are approved. |
| Team & Tasks | 9 | Tasks; archive Phase pending a relationship model. |
| Lead Tracker | 6 | Leads; keep contact channels and notes private. |
| Content Calendar | 1 | Confirm whether this is a placeholder. |
| Budget | 5 | Recurring expenses; exclude the total formula row. |
| Revenue Split | 7 | Defer until an allocation model exists. |
| Clients | 1 | Confirm placeholder; defer until a client model exists. |
| Timeline | 6 | Defer until milestone records exist. |
| Member Detials | 7 | Private owner reconciliation only. |

Observed mappings include task `Not Started` to `Backlog`, lead `Demo Booked` to `Demo Scheduled`, and lead `Demo Done` to `Demo Completed`. Member email, mobile, address, lead contact channels, client details, notes, and financial values are confidential or restricted and are absent from this document.

No source row is eligible for apply until stable keys, owner aliases, defaults, placeholder handling, and archive policy are approved.
