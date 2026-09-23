# MVP project plan

## Planning intent

Deliver the smallest secure, observable vertical slices that prove the product before adding
optional behavior. The current architecture direction is an Android React Native client, Cognito
authentication, API Gateway HTTP API, TypeScript Lambda functions, DynamoDB, private S3 receipt
storage, and a backend-only DeepSeek adapter. iOS and web clients are future updates. This
architecture remains a proposal until technical design review.

No deployment, cloud mutation, or provider configuration is authorized by this plan.

## Phase 1 — Confirm the product baseline

**Outcome:** MVP behavior, exclusions, and decision gates are explicit.

- Review [Phase 1 MVP](phase-1-mvp.md).
- Apply the approved private one-member ledger/workspace decision from
  [Open decisions](open-decisions.md).
- Apply the approved Android-first client and local monthly notification decision.
- Confirm the working product name when convenient.

**Exit evidence:** Required scope and the ownership decision are approved; unresolved choices are
either non-blocking or assigned to a later gate.

## Phase 2 — Technical design

**Outcome:** A reviewable `technical-design.md` with no material decisions hidden in coding tasks.

Cover:

- trust boundaries and component responsibilities;
- React Native Community CLI with New Architecture/Hermes, Android application lifecycle, React
  Navigation, native-module compatibility, secure credential storage, offline/error behavior, and
  supported Android versions;
- identity mapping and expense/receipt ownership;
- DynamoDB access patterns, keys, indexes, conditional writes, pagination, and concurrency behavior;
- exact money representation and supported currency metadata;
- API request, response, validation, error, authorization, and idempotency contracts;
- receipt upload, confirmation, replacement, download, deletion, and abandoned-object cleanup;
- monthly list and complete-summary queries;
- AI quick-entry and receipt-scan request lifecycles, quota reservation, deduplication, timeout,
  retry, and reconciliation;
- a versioned receipt JSON Schema, provider-response validation, normalized `ReceiptDraft` API
  contract, and compatibility rules between Lambda and the Android form;
- secrets, logging, data minimization, monitoring, alarms, and retention;
- configuration, local development, compatibility, rollout, rollback, and cost guardrails;
- local Android notification permission, scheduling, time-zone reconciliation, notification routing,
  restart/reinstall behavior, and duplicate prevention.

**Exit evidence:** Technical design reviewed against the acceptance criteria; ownership, failure
paths, security, and cost controls are testable.

## Phase 3 — Repository and delivery foundation

**Outcome:** A minimal project builds and can be validated locally without deploying.

- Establish repository structure and code-quality conventions.
- Add the Android React Native client, API/Lambda packages, shared contracts where justified, and an
  AWS SAM infrastructure definition.
- Add unit/integration test harnesses and CI checks.
- Document configuration and keep secrets out of the repository.
- Define one initial environment; do not add environment sprawl.
- Set the single-region default to `ap-southeast-1`; do not deploy cross-region resources for the
  MVP.

**Exit evidence:** Clean install, Android debug build, lint/type checks, and baseline tests pass
from documented commands; the AWS SAM template validates and infrastructure changes can be previewed
without deployment.

## Phase 4 — First secure vertical slice

**Outcome:** Sign in → create a manual expense → persist → display in the selected month.

- Implement authentication and internal identity mapping.
- Implement server-side ownership enforcement.
- Implement validated, idempotent expense creation.
- Implement monthly list pagination and core dashboard states.
- Test cross-user isolation before expanding feature breadth.

**Exit evidence:** Automated API/integration evidence proves authentication, validation, duplicate
protection, calendar-date grouping, and cross-user isolation; the flow works in the Android app
across supported phone sizes and lifecycle states.

## Phase 5 — Complete expense management and summaries

**Outcome:** Users can view, edit, delete, and accurately summarize expenses.

- Add detail, edit, and confirmed deletion.
- Define stale-write or concurrent-edit behavior.
- Add full-month counts and category totals by currency.
- Ensure summaries are independent of list pagination.

**Exit evidence:** CRUD, concurrency, money precision, multi-currency separation, month movement,
empty/loading/error states, and summary correctness are covered.

## Phase 6 — Private receipt lifecycle

**Outcome:** One private receipt can be safely managed per expense.

- Add constrained upload initiation and completion confirmation.
- Add authorized short-lived viewing.
- Add replace/remove behavior and retryable cleanup.
- Add abandoned-upload cleanup with observable failures.

**Exit evidence:** Authorization, type/size enforcement, failed uploads, replacement, deletion,
expiry, and cross-user attempts are tested.

## Phase 7 — AI quick entry

**Outcome:** Natural language becomes a validated editable draft with safe fallback.

- Add the provider adapter and structured schema validation.
- Add atomic per-user and application-wide allowance accounting.
- Configure the initial application-wide allowance at USD $1.00 per calendar month, independently of
  the 100-call per-user limit.
- Add request deduplication, bounded timeout/retry, usage reconciliation, and safe error mapping.
- Add disclosure and editable draft UX.

**Exit evidence:** Valid, ambiguous, malformed, repeated, concurrent, timeout, quota, and
provider-failure cases pass; no AI path directly persists an expense.

## Phase 8 — AI receipt scan

**Outcome:** An owned uploaded image becomes an editable draft without exposing the receipt.

- Add image preparation and explicit scan initiation.
- Request structured provider output using the versioned receipt JSON Schema.
- Parse, validate, and normalize provider output in Lambda; never expose the raw DeepSeek response
  to the Android app.
- Prefill the editable Android expense form from the normalized `ReceiptDraft` and highlight missing
  or ambiguous fields.
- Reuse allowance, deduplication, provider, and draft validation controls.
- Preserve uploads and manual input on failure.
- Test representative Vietnamese and low-quality receipts.

**Exit evidence:** Ownership, privacy, extraction, schema validation, malformed/truncated output,
ambiguity, editable-prefill, failure, and no-autosave behavior pass with representative fixtures and
contract tests.

## Phase 9 — Release readiness

**Outcome:** A measured, reversible first release.

- Run full automated and manual regression.
- Complete mobile security, TalkBack/accessibility, responsive layout, lifecycle, notification,
  failure-mode, and dependency reviews.
- Validate Android debug and release builds, notification permission states, cold-start routing, and
  representative physical-device behavior.
- Verify current AWS eligibility/pricing and DeepSeek model capability/pricing.
- Configure separate AWS and AI budgets/alerts and bounded log retention.
- Document deployment, smoke checks, rollback, data recovery, and operator actions.
- Include the optional local Android monthly notification; do not add email or remote push
  infrastructure.

**Exit evidence:** Required acceptance criteria pass, remaining risks are accepted, deployment and
rollback are rehearsed, and cost signals are visible.

## Immediate next step

BE-002 has established and verified the local TypeScript backend workspace. The next backend ticket
is BE-003, which adds the AWS SAM development stack after explicit authorization without deploying
it. AWS-001 can proceed independently as the user-owned AWS account and cost-guardrail prerequisite.
