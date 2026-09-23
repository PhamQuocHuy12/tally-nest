# Product Engineering Progress Ledger

## Current outcome

Implement the approved TallyNest MVP as small, locally verifiable backend slices before any cloud
deployment.

## Scope boundary

Included now: approved product/design documentation, the ordered backlog, and the local TypeScript
backend workspace foundation.

Not authorized now: AWS account/provider configuration, cloud resource creation, deployment, or
release. Later implementation tickets require their own authorization.

## Lifecycle

| Phase               | Status      | Exit evidence                                                                                                      |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Discovery           | completed   | MVP baseline documented; private one-member ledger/workspace model approved on 2026-09-20                          |
| High-level design   | completed   | Boundaries, components, critical flows, NFRs, and risks documented in `docs/mvp/technical-design.md`               |
| Feature design      | completed   | Approved MVP contains flows, permissions, edge cases, and acceptance criteria                                      |
| Technical design    | completed   | T1–T7 and the documented contracts, data model, failure behavior, security, operations, and cost controls approved |
| Design review       | completed   | Backend design and tooling closure confirmed through completed BE-001 on 2026-09-22                                |
| Implementation plan | completed   | Ordered backend/AWS tickets define dependencies, validation, ownership, and deployment gates                       |
| Implementation      | in_progress | BE-002 workspace scaffold completed locally; BE-003 is the next pending slice                                      |
| Code review onward  | pending     | Requires implementation evidence from later feature slices                                                         |

## Active work

| Work item                                                                | Owner                                        | Status    | Evidence / next action                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirm ownership model for a private MVP that may later support couples | Product                                      | completed | Private one-member personal ledger approved; future sharing uses a separate shared ledger by default                                         |
| Confirm MVP client and reminder scope                                    | Product / React Native                       | completed | Android React Native only; iOS and web later; optional local Android notification; no email or remote push                                   |
| Select infrastructure definition tool                                    | Product engineering                          | completed | AWS SAM with TypeScript Lambda handlers approved for the MVP                                                                                 |
| Select AWS region                                                        | Product engineering                          | completed | Singapore (`ap-southeast-1`) approved for all regional MVP resources                                                                         |
| Set application-wide AI allowance                                        | Product / backend                            | completed | Configurable USD $1.00 per calendar month plus separate 100-call per-user limit                                                              |
| Confirm product name                                                     | Product                                      | completed | TallyNest approved; availability checks remain a pre-release task                                                                            |
| Produce high-level and technical design                                  | Product engineering / backend / React Native | completed | Draft created at `docs/mvp/technical-design.md`                                                                                              |
| Review technical design decisions T1–T7                                  | Product / engineering                        | completed | All seven technical decisions approved on 2026-09-20                                                                                         |
| Perform design challenge                                                 | Product engineering / backend / React Native | completed | Deferred DynamoDB review and backend design/tooling closure completed through BE-001; user confirmed completion on 2026-09-22                |
| Create ordered backend implementation backlog                            | Product engineering / backend                | completed | `docs/mvp/backlog/README.md` and its grouped tickets created on 2026-09-22; hybrid SAM plus user-operated AWS Console prerequisites approved |
| Close backend design and tooling decisions (BE-001)                      | Product engineering / backend                | completed | User confirmed completion on 2026-09-22; ticket and backlog index synchronized                                                               |
| Scaffold the TypeScript backend workspace (BE-002)                       | Product engineering / backend                | completed | Clean frozen-lockfile install and `pnpm check` passed on 2026-09-23; no AWS account or deployment used                                       |

## Reconciled evidence

- 2026-09-20: The supplied handoff states no application, infrastructure, deployment, or automated
  tests exist.
- 2026-09-20: The repository was empty and was not initialized as Git when planning began.
- 2026-09-20: AI quick entry and receipt scanning are required MVP features; standalone chat and
  autonomous changes are excluded.
- 2026-09-20: The first release is private per user; couple/household workflows remain deferred.
- 2026-09-20: The private one-member ledger/workspace model was approved. Existing personal ledgers
  must not become shared automatically; a future shared ledger is separate by default.
- 2026-09-20: Android React Native was approved as the only MVP client. iOS and web are confirmed
  future updates.
- 2026-09-20: Email reminders were excluded. An optional locally scheduled Android monthly
  notification was approved; remote push infrastructure is deferred.
- 2026-09-20: AWS SAM with TypeScript Lambda handlers was selected for MVP infrastructure; CDK is
  deferred unless future complexity justifies it.
- 2026-09-20: Singapore (`ap-southeast-1`) was selected for all regional MVP resources; cross-region
  infrastructure is excluded.
- 2026-09-20: The application-wide DeepSeek allowance was set to USD $1.00 per calendar month,
  enforced by the backend in addition to the per-user call quota.
- 2026-09-20: TallyNest was approved as the product name, written as one word. Public availability
  has not yet been cleared.
- 2026-09-20: Future expense dates were added to the MVP. They are stored immediately and counted
  only in their selected future month; they do not imply recurrence or payment scheduling.
- 2026-09-20: Structured AI receipt drafts were approved for the MVP. DeepSeek returns
  schema-constrained JSON to Lambda; Lambda validates and normalizes it into a versioned TallyNest
  `ReceiptDraft` used only to prefill an editable Android form.
- 2026-09-20: The user approved the reconciled Phase 1 MVP baseline for technical design.
- 2026-09-20: Draft technical design created with mobile, identity, DynamoDB, API, receipt,
  asynchronous AI, security, operations, cost, failure, and validation contracts.
- 2026-09-20: Technical decision T1 approved React Native Community CLI with TypeScript, New
  Architecture, Hermes, and React Navigation. Expo, Expo Router, EAS, prebuild, and Expo modules are
  excluded from the MVP.
- 2026-09-20: Technical decisions T2–T7 approved: Cognito managed login with PKCE, one-table
  DynamoDB design, asynchronous SQS-backed AI, read-time summaries, initial VND/USD support, and no
  plaintext persistence of unsaved financial drafts.
- 2026-09-20: Review checkpoint saved at Section 7 — DynamoDB design. The user plans to learn basic
  DynamoDB concepts and continue the technical-design review on 2026-09-21.
- 2026-09-20: The AWS serverless direction is a proposal constrained by a low operating-cost goal,
  not a verified price guarantee.
- 2026-09-22: The user approved a hybrid infrastructure workflow: application resources remain
  SAM-managed, while the user performs explicit AWS Console prerequisites and approves deployments.
- 2026-09-22: An ordered backend backlog was created under `docs/mvp/backlog/`; no application code,
  cloud resource, provider configuration, or deployment was created.
- 2026-09-22: The user confirmed BE-001 complete, closing the deferred backend design and tooling
  decision gate and unblocking BE-002.
- 2026-09-23: The user authorized BE-002. A pnpm workspace and `apps/backend` modular monolith were
  scaffolded with Node 24, strict TypeScript, Zod configuration validation, Vitest, esbuild,
  ESLint/Prettier, a pinned lockfile, and secret scanning.
- 2026-09-23: A clean `pnpm install --frozen-lockfile --offline` succeeded, followed by a passing
  `pnpm check` (format, lint, typecheck, 3 unit tests, 3 Lambda bundles, and secret scan).
- 2026-09-23: `pnpm audit --prod` reported no known vulnerabilities in production dependencies.

## Key risks

- Future sharing rules must preserve the privacy of existing personal ledgers and require explicit
  record movement.
- Cost targets depend on current account eligibility, region, real usage, and provider pricing.
- AI vision capability and pricing are time-sensitive and must be verified before implementation.
- DeepSeek does not currently document an API-key monthly hard cap in the reviewed API
  documentation, so TallyNest must enforce its own monthly allowance and treat provider balance only
  as a secondary backstop.
- DynamoDB summary and access patterns must be designed from exact queries before keys or indexes
  are committed.
- Receipt cleanup and AI quota reconciliation require explicit recovery behavior, not best-effort
  client logic.
- AI JSON validity does not establish business validity; Lambda must reject or flag invalid,
  missing, ambiguous, truncated, or unexpected values before they reach the mobile form.
- Local Android reminders require explicit permission handling, schedule reconciliation, safe
  notification routing, and documented limits across restart and reinstall behavior.

## Next action

Review and authorize `BE-003` in `docs/mvp/backlog/00-foundation.md` when ready: define and validate
the local AWS SAM development stack without deploying it. `AWS-001` remains a separate user-owned
prerequisite that can proceed independently.
