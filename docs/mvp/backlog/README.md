# Backend backlog

This folder is the ordered implementation backlog for the TallyNest MVP backend. It translates the
approved technical design into small, reviewable tickets. It does not authorize cloud changes,
deployment, or use of production credentials.

## Working agreement

- Application infrastructure remains defined by AWS SAM and CloudFormation.
- The user performs the explicitly marked AWS Console prerequisites and approves every deployment.
- Application resources are not created manually in the Console unless a ticket records an approved
  exception. This avoids drift from the SAM template.
- Region-scoped resources use `ap-southeast-1`.
- Secrets never enter source control, mobile configuration, ticket evidence, or logs.
- A ticket is complete only when its acceptance evidence exists.

## Status values

- `pending`: accepted but not started.
- `in_progress`: currently being worked on.
- `blocked`: cannot proceed; the blocker and owner must be recorded.
- `completed`: acceptance evidence exists.
- `skipped`: intentionally omitted with a recorded reason.

## Ordered tickets

Work from top to bottom unless a ticket explicitly permits parallel work.

| Order | Ticket                                                                                                                                       | Owner | Depends on                       | Status      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------- | ----------- |
| 1     | [BE-001 — Close backend design and tooling decisions](00-foundation.md#be-001--close-backend-design-and-tooling-decisions)                   | Joint | Approved MVP design              | completed   |
| 2     | [AWS-001 — Secure the AWS account and add cost guardrails](01-aws-console.md#aws-001--secure-the-aws-account-and-add-cost-guardrails)        | User  | None                             | in_progress |
| 3     | [BE-002 — Scaffold the TypeScript backend workspace](00-foundation.md#be-002--scaffold-the-typescript-backend-workspace)                     | Codex | BE-001                           | completed   |
| 4     | [BE-003 — Add the SAM development stack](00-foundation.md#be-003--add-the-sam-development-stack)                                             | Codex | BE-002                           | completed   |
| 5     | [AWS-002 — Prepare deployment access](01-aws-console.md#aws-002--prepare-deployment-access)                                                  | User  | AWS-001, BE-003                  | pending     |
| 6     | [BE-004 — Implement shared domain and API contracts](02-core-api.md#be-004--implement-shared-domain-and-api-contracts)                       | Codex | BE-002                           | pending     |
| 7     | [BE-005 — Implement DynamoDB access and ledger isolation](02-core-api.md#be-005--implement-dynamodb-access-and-ledger-isolation)             | Codex | BE-001, BE-003, BE-004           | pending     |
| 8     | [BE-006 — Implement authenticated bootstrap](02-core-api.md#be-006--implement-authenticated-bootstrap)                                       | Codex | BE-005                           | pending     |
| 9     | [BE-007 — Implement account preferences](02-core-api.md#be-007--implement-account-preferences)                                               | Codex | BE-006                           | pending     |
| 10    | [BE-008 — Implement idempotent expense creation](02-core-api.md#be-008--implement-idempotent-expense-creation)                               | Codex | BE-005, BE-006                   | pending     |
| 11    | [BE-009 — Implement expense reads and pagination](02-core-api.md#be-009--implement-expense-reads-and-pagination)                             | Codex | BE-008                           | pending     |
| 12    | [BE-010 — Implement expense update and deletion](02-core-api.md#be-010--implement-expense-update-and-deletion)                               | Codex | BE-009                           | pending     |
| 13    | [BE-011 — Implement monthly summaries](02-core-api.md#be-011--implement-monthly-summaries)                                                   | Codex | BE-009                           | pending     |
| 14    | [BE-012 — Implement receipt upload initiation and confirmation](03-receipts.md#be-012--implement-receipt-upload-initiation-and-confirmation) | Codex | BE-005, BE-008                   | pending     |
| 15    | [BE-013 — Implement receipt viewing and removal](03-receipts.md#be-013--implement-receipt-viewing-and-removal)                               | Codex | BE-012                           | pending     |
| 16    | [BE-014 — Implement receipt cleanup and reconciliation](03-receipts.md#be-014--implement-receipt-cleanup-and-reconciliation)                 | Codex | BE-012, BE-013                   | pending     |
| 17    | [BE-015 — Implement AI allowance accounting](04-ai.md#be-015--implement-ai-allowance-accounting)                                             | Codex | BE-005                           | pending     |
| 18    | [AWS-003 — Configure the DeepSeek secret and AI settings](01-aws-console.md#aws-003--configure-the-deepseek-secret-and-ai-settings)          | User  | BE-003, BE-015                   | pending     |
| 19    | [BE-016 — Implement asynchronous AI request acceptance](04-ai.md#be-016--implement-asynchronous-ai-request-acceptance)                       | Codex | BE-015                           | pending     |
| 20    | [BE-017 — Implement the DeepSeek worker and normalized drafts](04-ai.md#be-017--implement-the-deepseek-worker-and-normalized-drafts)         | Codex | AWS-003, BE-016                  | pending     |
| 21    | [BE-018 — Implement AI polling and recovery](04-ai.md#be-018--implement-ai-polling-and-recovery)                                             | Codex | BE-017                           | pending     |
| 22    | [BE-019 — Add observability and operational controls](05-readiness.md#be-019--add-observability-and-operational-controls)                    | Codex | BE-003, BE-014, BE-018           | pending     |
| 23    | [BE-020 — Prove security and integration behavior](05-readiness.md#be-020--prove-security-and-integration-behavior)                          | Codex | BE-011, BE-014, BE-018           | pending     |
| 24    | [AWS-004 — Deploy and run the development smoke test](01-aws-console.md#aws-004--deploy-and-run-the-development-smoke-test)                  | Joint | AWS-002, AWS-003, BE-019, BE-020 | pending     |
| 25    | [BE-021 — Complete backend release readiness](05-readiness.md#be-021--complete-backend-release-readiness)                                    | Joint | AWS-004                          | pending     |

## Gates

- BE-001 must resolve the remaining DynamoDB review and the preferences contract before persistence
  or route implementation begins.
- AWS-001 and AWS-002 do not authorize a deployment. AWS-004 is the first ticket that may deploy,
  and it requires explicit approval at execution time.
- AI remains disabled until current model capability, pricing, secret handling, and both allowance
  controls have been verified.
- Public release remains blocked on the retention/account-deletion policy and the pre-release checks
  listed in the technical design.
