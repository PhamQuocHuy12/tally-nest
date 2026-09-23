# TallyNest MVP — Technical design

**Status:** Technical decisions and design review approved  
**Date:** 2026-09-20  
**Scope:** Android React Native MVP and its AWS/DeepSeek backend  
**Product baseline:** [Phase 1 MVP](phase-1-mvp.md)

## 1. Purpose

This document turns the approved MVP behavior into implementable boundaries and contracts. It does
not authorize repository scaffolding, cloud deployment, provider configuration, or release.

The design optimizes for:

- a secure Android-first experience for 2–3 light users;
- an AWS operating target near USD $2–3 per month where actual eligibility and usage permit;
- a separate USD $1 monthly application-wide DeepSeek allowance;
- private personal data with a path to future shared ledgers;
- simple components that can be tested and replaced independently.

## 2. Review decisions

The product decisions in [Open decisions](open-decisions.md) and technical decisions T1–T7 are
approved for the MVP.

| ID            | Proposed decision                                                                                          | Reason                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1 — approved | Use React Native Community CLI with TypeScript, the New Architecture enabled, Hermes, and React Navigation | Provides direct ownership of the Android native project, Fabric/TurboModule readiness, full Gradle control, and reusable shared code for future iOS without an Expo dependency |
| T2 — approved | Use Cognito managed login through the system browser with Authorization Code + PKCE                        | Keeps passwords out of the app, supports registration/verification/reset, and reduces custom authentication risk                                                               |
| T3 — approved | Use one DynamoDB table with one sparse GSI for monthly lists and reconciliation work                       | Minimizes infrastructure while supporting direct ownership checks, expense lookup, month ordering, receipts, idempotency, AI accounting, and recovery of work not yet queued   |
| T4 — approved | Run AI requests asynchronously through SQS and let the app poll their status                               | Provider latency can exceed an HTTP request budget; the queue gives bounded retries, deduplication, and recovery                                                               |
| T5 — approved | Calculate monthly summaries from all month records at read time                                            | It is the simplest correct solution at MVP scale and avoids fragile aggregate maintenance during edits and month changes                                                       |
| T6 — approved | Start with `VND` and `USD` as the supported-currency allowlist                                             | Covers the initial Hanoi use case while retaining exact multi-currency behavior; additional currencies are additive configuration changes                                      |
| T7 — approved | Do not persist unsaved expense form fields to general device storage                                       | Expense drafts are sensitive; avoiding plaintext persistence is safer than adding encrypted local-database complexity to the MVP                                               |

The backend uses Node.js `24.14.0` from the Node 24 LTS line and targets the AWS Lambda `nodejs24.x`
runtime. It uses pnpm `11.19.0`, TypeScript `5.9.3`, Zod `4.6.5`, Vitest `5.0.1`, esbuild `0.28.2`,
ESLint `9.39.5` with typescript-eslint `8.70.1`, and Prettier `3.9.9`. Versions are pinned in the
repository and resolved by the committed lockfile. TypeScript remains on the compatible 5.x release
until the lint toolchain supports TypeScript 7. Exact React Native, React, Android SDK, NDK, JDK,
Gradle, Android Gradle Plugin, Kotlin, and mobile-library versions will be selected from mutually
supported stable releases when the Android scaffold begins.

## 3. System context and boundaries

```text
Android app
  ├─ system browser ──> Amazon Cognito
  ├─ HTTPS ──────────> API Gateway HTTP API
  │                       ├─> API Lambda
  │                       └─> AI request Lambda
  └─ presigned HTTPS ─> private S3 receipt bucket

API/AI Lambdas
  ├─> DynamoDB (source of truth)
  ├─> S3 (private receipts)
  ├─> SQS AI queue ──> AI worker Lambda ──> DeepSeek
  ├─> cleanup task records ──> scheduled cleanup Lambda
  └─> CloudWatch logs and native service metrics
```

### Trust boundaries

- The Android app and all device storage are untrusted.
- Cognito establishes identity; it does not decide ledger authorization.
- API Gateway validates access-token signatures and claims.
- Lambda performs every ledger, expense, receipt, and AI authorization check.
- DynamoDB is the authoritative store for application state and ownership.
- S3 stores private binary objects only; object keys are never authorization.
- DeepSeek is an external processor. Inputs are minimized and all outputs are untrusted.

### Component responsibilities

| Component            | Responsibility                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android app          | Authentication launch, navigation, forms, local validation, editable AI drafts, receipt selection, local notification, and clear offline/error states |
| Cognito User Pool    | Registration, email verification, login, logout session lifecycle, and password reset                                                                 |
| API Gateway HTTP API | HTTPS entry point, JWT authentication, route throttling, and Lambda routing                                                                           |
| API Lambda           | Bootstrap, preferences, expense CRUD, monthly queries, receipt lifecycle, authorization, validation, and idempotency                                  |
| AI request Lambda    | AI request validation, quota/budget reservation, deduplication, and queue submission                                                                  |
| AI worker Lambda     | Image preparation, DeepSeek calls, structured-output validation, usage reconciliation, and normalized draft creation                                  |
| Cleanup Lambda       | Retry failed receipt deletions and reconcile abandoned receipt metadata                                                                               |
| DynamoDB             | Users, ledgers, membership, expenses, receipts, preferences, idempotency, AI requests, and allowance accounting                                       |
| S3                   | Encrypted private receipt objects with no public access                                                                                               |
| SQS + DLQ            | Durable AI work delivery, bounded retry, and terminal-failure visibility                                                                              |
| CloudWatch           | Bounded logs, built-in metrics, alarms, and operational evidence                                                                                      |

## 4. Mobile design

### Application workflow

Use React Native Community CLI. The `android/` native project is source-controlled and is the active
MVP platform. The New Architecture is enabled from the initial scaffold, Hermes is the JavaScript
engine, and Fabric is the renderer. Native build configuration is maintained directly through the
React Native template, Gradle, Kotlin, Android manifest, resources, and narrow native adapters.

Expo Go, Expo Router, EAS, Expo prebuild, and Expo modules are not part of the MVP toolchain. The
generated iOS project may remain in the repository for future work, but no iOS feature, signing,
build, validation, or release is included in the MVP.

Recommended mobile stack:

- strict TypeScript;
- React Navigation with typed root/nested parameter lists and validated notification/deep-link
  routing;
- a query library for server state and request cancellation;
- a form library plus the shared runtime schemas for client-side feedback;
- an Android Keystore-backed secure-storage adapter for tokens or auth-session material;
- maintained New-Architecture-compatible local-notification and image-picker/camera libraries behind
  narrow interfaces.

The exact libraries are selected and compatibility-checked against the chosen React Native version
during scaffolding. Prefer maintained autolinked libraries over custom native modules. Any
unavoidable custom Android module uses Kotlin, a small typed TurboModule/Codegen contract, explicit
lifecycle behavior, and no edits to generated Codegen output. Business rules and authorization never
depend on the mobile framework.

Keep the React Native template's JDK, Gradle wrapper, Android Gradle Plugin, Kotlin, NDK, compile
SDK, and target SDK compatibility set coordinated. Do not upgrade those pieces independently or
disable Hermes/New Architecture to work around an incompatible dependency; replace or isolate the
dependency instead.

### Navigation

```text
Unauthenticated
  └─ Sign in / register / verify / reset through Cognito managed login

Authenticated
  ├─ Dashboard
  │   ├─ Month selector
  │   ├─ Totals and categories by currency
  │   └─ Paginated expense list
  ├─ Add expense
  │   ├─ Manual form
  │   ├─ AI quick entry
  │   └─ Receipt upload and scan
  ├─ Expense details
  │   ├─ Receipt preview
  │   ├─ Edit
  │   └─ Delete confirmation
  └─ Settings
      ├─ Currency and time zone
      ├─ AI allowance remaining
      ├─ Monthly notification
      └─ Sign out
```

Notification route parameters are untrusted. A notification contains only a route name and `YYYY-MM`
month; the app validates both before navigation.

### State ownership

- Server state: expense pages, monthly summary, preferences, receipt status, and AI request status.
- Form state: local to the active form screen.
- Shared app state: authenticated session and narrowly scoped preferences only.
- Derived values: calculated during rendering or in pure selectors, not duplicated in global state.
- Unsaved financial form data: memory only for the MVP; it is not written to general plaintext
  storage.
- AI results: retained on the server for a short period so a completed request can be reopened after
  process death.

### Network and offline behavior

- Normal API requests use explicit timeouts, cancellation, and stable error mapping.
- Reads may show previously cached data with a visible offline/stale indicator.
- Offline creation, editing, and deletion are not supported in the MVP; the app keeps the active
  in-memory form and asks the user to retry.
- Save buttons are disabled while the same submission is in flight and use idempotency keys for safe
  retry.
- Authentication refresh is single-flight so concurrent failed requests cannot start competing
  refresh operations.
- On logout, tokens, cached protected server data, in-memory drafts, and receipt file references are
  cleared.

### Android lifecycle and accessibility

- Treat process death, activity recreation, backgrounding, and network changes as normal.
- Re-fetch security-sensitive state after foregrounding when stale.
- Handle Android back and modal dismissal without losing a confirmed saved state.
- Support TalkBack labels, logical focus, text scaling, adequate touch targets, keyboard avoidance,
  safe areas, and common Android phone sizes.
- Camera/gallery permissions are requested only when the user chooses that action; denial and
  permanently blocked states have recovery guidance.
- Native modules must handle Activity absence/recreation, release listeners correctly, avoid
  retaining React/Activity contexts, and resolve or reject each asynchronous call exactly once.

### Local monthly notification

- Disabled by default.
- Request Android notification permission only when the user enables the reminder.
- Use a stable notification channel and a single deterministic reminder identifier.
- Schedule for the first day of each month at 09:00 in the configured time zone.
- Reconcile after time-zone or preference changes and prevent duplicate schedules.
- Tapping opens the previous month after validating the route and month.
- The notification contains no amount, merchant, receipt, or expense detail.
- Test foreground, background, cold start, permission denial/revocation, device restart, process
  death, and OEM background restrictions.
- Reinstall removes local schedules and local preferences; the app explains this limitation. Remote
  push is not added to compensate in the MVP.

## 5. Authentication and identity

### Authentication flow

1. The app opens Cognito managed login in the system browser.
2. Registration, email verification, login, and password reset occur in the Cognito flow.
3. The app uses Authorization Code + PKCE and receives the callback through an allowlisted Android
   app link or narrowly scoped custom scheme.
4. Tokens are stored only through an Android Keystore-backed adapter.
5. The app sends the access token as `Authorization: Bearer <token>`.
6. API Gateway verifies issuer, audience/client, expiry, and signature.
7. Lambda uses the immutable Cognito `sub` claim as the external identity key.

Do not place tokens in URLs, logs, analytics, crash reports, or screenshots. Biometrics may later
protect local app opening but never replace server authorization.

### User and ledger bootstrap

The first authenticated call is `POST /v1/bootstrap`.

If the Cognito subject has no application profile, Lambda performs one DynamoDB transaction that
conditionally creates:

- the internal user profile;
- one private personal ledger;
- one membership record with role `owner`.

The operation is idempotent. No API accepts invitations or creates a second member in the MVP.
Expense and receipt routes do not accept a client-selected ledger ID; Lambda resolves the caller's
personal ledger from the authenticated profile. This removes an unnecessary cross-ledger input and
reduces broken-access-control risk.

## 6. Domain and money model

### Expense

```text
Expense
  expenseId          opaque ULID/UUID
  ledgerId           internal ownership scope
  expenseDate        YYYY-MM-DD calendar date
  category           approved enum
  amountMinor        base-10 integer string
  currency           supported ISO 4217 code
  currencyDigits     configured minor-unit digits
  notes              optional, maximum 1,000 characters
  receiptId          optional
  version            positive integer
  createdAt           UTC instant
  updatedAt           UTC instant
```

The API accepts money as a decimal string and currency code. Lambda validates the syntax and
configured fraction digits, converts it to an integer minor-unit string, and never uses JavaScript
floating-point arithmetic for totals. Responses contain a display-safe decimal string plus the
currency code.

Future expense dates are valid. Month grouping is the first seven characters of `expenseDate`; the
date is never shifted through a time zone.

### Categories

Stable API values:

```text
food_drinks
transport
housing_utilities
shopping
health
entertainment
education
travel
other
```

The Android app localizes display labels. Stored/API values are not display strings.

### Optimistic concurrency

Every expense has a monotonically increasing `version`.

- Update and delete require the version last read by the client.
- DynamoDB uses a conditional expression on `version`.
- A stale write returns `409 version_conflict` with no partial mutation.
- The app reloads the current record and asks the user to reapply the change.

## 7. DynamoDB design

### Table

One table per environment:

```text
PK  string
SK  string
GSI1PK string, optional
GSI1SK string, optional
entityType string
...entity attributes
```

Use on-demand capacity during early development unless verified account eligibility makes carefully
bounded provisioned capacity materially cheaper. Before deployment, compare both modes against the
actual account's recurring allowances and expected traffic. No global tables or cross-region
replication.

### Primary items

| Entity             | PK                   | SK                       | Notes                                                        |
| ------------------ | -------------------- | ------------------------ | ------------------------------------------------------------ |
| User profile       | `USER#<sub>`         | `PROFILE`                | Internal user ID, ledger ID, preferences pointer, timestamps |
| Ledger             | `LEDGER#<ledgerId>`  | `META`                   | Type `personal`, state `active`                              |
| Membership         | `LEDGER#<ledgerId>`  | `MEMBER#<sub>`           | Exactly one `owner` in MVP                                   |
| Expense            | `LEDGER#<ledgerId>`  | `EXPENSE#<expenseId>`    | Authoritative expense record                                 |
| Receipt            | `LEDGER#<ledgerId>`  | `RECEIPT#<receiptId>`    | Lifecycle and private object metadata                        |
| AI request         | `LEDGER#<ledgerId>`  | `AI_REQUEST#<requestId>` | Status and normalized result, TTL                            |
| Idempotency result | `IDEMPOTENCY#<sub>`  | `<operation>#<key>`      | Request hash, status/result, TTL                             |
| User monthly usage | `AI_USAGE#<YYYY-MM>` | `USER#<sub>`             | Calls used/reserved                                          |
| App monthly budget | `AI_USAGE#<YYYY-MM>` | `APP`                    | Remaining/reserved/spent micro-USD                           |

### Sparse secondary index

Expense items also contain:

```text
GSI1PK = LEDGER#<ledgerId>#MONTH#<YYYY-MM>
GSI1SK = DATE#<YYYY-MM-DD>#CREATED#<UTC timestamp>#ID#<expenseId>
```

This supports deterministic newest-first monthly pagination. The cursor is an opaque,
base64url-encoded and runtime-validated continuation payload. The server reconstructs the authorized
partition scope instead of trusting a ledger key supplied by the cursor.

The same sparse index is reused by accepted AI request items until they have been sent to SQS:

```text
GSI1PK = AI_ENQUEUE#PENDING
GSI1SK = CREATED#<UTC timestamp>#ID#<requestId>
```

After successful queue submission, Lambda changes the request to `queued` and removes those index
attributes. The reconciliation job can therefore find and re-enqueue requests left pending if the
process stopped between the DynamoDB transaction and SQS submission.

### Required access patterns

| Access pattern                          | Operation                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Resolve caller's personal ledger        | Get user profile, then verify membership                                      |
| Get expense by ID                       | Get `LEDGER#id / EXPENSE#id`                                                  |
| List one month newest first             | Query GSI1 by ledger/month, descending, with cursor                           |
| Calculate complete month summary        | Query every GSI1 page for the month and aggregate exact minor units in Lambda |
| Get receipt                             | Get `LEDGER#id / RECEIPT#id`, then verify relation/state                      |
| Deduplicate a command                   | Conditional put/get idempotency item                                          |
| Reserve AI allowance                    | Transaction across request, user usage, and app-budget items                  |
| Poll AI request                         | Get ledger-scoped AI request by ID                                            |
| Recover accepted AI work not yet queued | Query GSI1 `AI_ENQUEUE#PENDING` partition                                     |

At the expected scale, computing a summary from the month's complete query is simpler and safer than
maintaining materialized counters. Design assumption: substantially fewer than 2,000 expenses per
ledger per month. Monitor page count and latency. If that assumption is approached, introduce
transactionally maintained monthly aggregates in a later compatible change.

### Atomicity

- Bootstrap uses a transaction with conditional creates.
- Expense create and receipt attachment update all relevant DynamoDB items in one transaction.
- Expense updates condition on `version` and update month-index attributes atomically on the item.
- AI acceptance transactionally creates the request, consumes one user call, and reserves
  application budget.
- S3 and DynamoDB cannot share a transaction; receipt reconciliation makes partial failures
  recoverable.

## 8. API conventions

### General

- Base path: `/v1`.
- JSON request and response bodies except direct S3 transfer.
- Runtime schema validation at every API boundary.
- Unknown request properties are rejected for mutation endpoints.
- Timestamps are ISO 8601 UTC instants; expense dates are `YYYY-MM-DD` calendar dates.
- Request IDs are returned and included in structured logs.
- `Idempotency-Key` is required for retryable create/AI commands and is scoped to user plus
  operation.
- Reusing a key with different request content returns `409 idempotency_conflict`.

### Error envelope

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Check the highlighted fields.",
    "requestId": "req_...",
    "fields": {
      "amount": "invalid_precision"
    }
  }
}
```

Stable status mapping:

| Status | Use                                                                                 |
| ------ | ----------------------------------------------------------------------------------- |
| `400`  | Malformed request, month, cursor, or unsupported media metadata                     |
| `401`  | Missing, invalid, or expired authentication                                         |
| `404`  | Resource absent or not visible to this ledger; do not reveal cross-ledger existence |
| `409`  | Version conflict, idempotency mismatch, or incompatible receipt state               |
| `413`  | Receipt exceeds 5 MB                                                                |
| `422`  | Valid JSON with domain validation errors                                            |
| `429`  | Per-user AI quota, application budget, or route throttling exhausted                |
| `502`  | Invalid provider result                                                             |
| `503`  | Provider unavailable or request temporarily unavailable                             |

### Endpoints

| Method and path                                 | Purpose                                          | Key behavior                                                                |
| ----------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `POST /v1/bootstrap`                            | Create/read app profile and personal ledger      | Idempotent conditional transaction                                          |
| `GET /v1/preferences`                           | Read currency, time zone, reminder, AI remaining | Caller-derived ledger                                                       |
| `PATCH /v1/preferences`                         | Update preferences                               | Validates currency/time zone; notification scheduling remains device-side   |
| `POST /v1/expenses`                             | Create expense                                   | Requires idempotency key; may attach one ready receipt                      |
| `GET /v1/expenses?month=&limit=&cursor=`        | Monthly page                                     | Newest first; limit bounded, default 25, maximum 100                        |
| `GET /v1/expenses/{expenseId}`                  | Expense detail                                   | Returns 404 across ledger boundary                                          |
| `PATCH /v1/expenses/{expenseId}`                | Edit expense                                     | Requires expected `version`                                                 |
| `DELETE /v1/expenses/{expenseId}`               | Delete expense                                   | Requires expected `version`; queues cleanup recovery if needed              |
| `GET /v1/months/{YYYY-MM}/summary`              | Complete monthly totals                          | All records, exact amounts, separate by currency/category                   |
| `POST /v1/receipt-uploads`                      | Start upload                                     | Returns receipt ID and short-lived presigned upload details                 |
| `POST /v1/receipt-uploads/{receiptId}/complete` | Verify upload                                    | Checks ownership, object existence, size, declared type, and file signature |
| `GET /v1/receipts/{receiptId}/download-url`     | View receipt                                     | Short-lived authorized URL only                                             |
| `DELETE /v1/expenses/{expenseId}/receipt`       | Remove attached receipt                          | Versioned expense mutation plus recoverable object cleanup                  |
| `POST /v1/ai/quick-entry`                       | Request structured text draft                    | Returns `202` and request ID                                                |
| `POST /v1/ai/receipt-drafts`                    | Request receipt extraction                       | Requires owned ready receipt; returns `202` and request ID                  |
| `GET /v1/ai/requests/{requestId}`               | Poll status/result                               | `queued`, `processing`, `completed`, or `failed`                            |

API models evolve additively within `/v1`. Required semantic changes use a new version or an
explicit compatibility window. Old installed Android versions must continue to receive known fields
and stable error codes.

## 9. Receipt lifecycle

### States

```text
uploading -> ready -> attached -> deletion_pending -> deleted
     └──────────────> expired/deleted
```

### Upload and validation

1. The authenticated app requests an upload slot with MIME type and byte size.
2. Lambda creates a ledger-scoped receipt record in `uploading` and returns a short-lived presigned
   upload.
3. The app uploads directly to S3 using the fixed key supplied by the server.
4. The app calls the completion endpoint.
5. Lambda checks the S3 object, maximum 5 MB size, allowed declared MIME type, and JPEG/PNG/WebP
   magic bytes before marking it `ready`.

The bucket has Block Public Access enabled, ownership enforcement, TLS-only access, server-side
encryption, and no permanent public URLs. Object keys follow a server-generated form such as
`receipts/<ledgerId>/<receiptId>` and are never accepted from the client.

### Attachment and replacement

- Create/update expense may attach only a `ready` receipt owned by the same ledger.
- A transaction changes the receipt to `attached`, records the expense relation, and updates the
  expense.
- Replacing a receipt first attaches the new ready object, then marks the old receipt for deletion.
- A user never observes a state where a failed new upload removed the previously attached receipt.

### Deletion and recovery

- Expense deletion removes the database relation and attempts the S3 deletion.
- If object deletion fails, a durable cleanup task is stored with next-attempt time and capped
  attempt count.
- A scheduled cleanup Lambda retries with backoff and emits a terminal-failure signal for operator
  action.
- S3 lifecycle rules remove abandoned staging objects after a short retention period.
- DynamoDB TTL removes expired upload/idempotency/AI-result metadata eventually; correctness does
  not depend on exact TTL timing.

## 10. AI design

### Shared asynchronous flow

1. Android sends a quick-entry description or owned `receiptId` with an idempotency key.
2. Lambda validates authentication, ledger scope, input limits, AI feature configuration, and
   receipt state.
3. One DynamoDB transaction:
   - conditionally creates the AI request;
   - consumes one call from the user's 100-call monthly allowance;
   - reserves a conservative amount from the application's USD $1 monthly budget.
4. Lambda sends the request ID to SQS, marks it `queued`, removes its pending-enqueue index fields,
   and returns `202`.
5. The worker conditionally changes `queued` to `processing`; duplicate deliveries observe the
   existing state and do no duplicate provider work.
6. The worker calls DeepSeek with a total timeout, bounded output, and a configured model name.
7. Lambda validates/normalizes the output, stores only the normalized result and usage metadata,
   reconciles the cost reservation, and marks the request complete.
8. Android polls with increasing intervals and fills the editable form when complete.

If SQS submission fails, the API returns `202` with the accepted request rather than creating a
second reservation. The reconciliation job finds its pending-enqueue index entry and retries
submission. If a permanent configuration error prevents queueing, a compensation transaction marks
the request failed and restores the user call and application reservation. Duplicate queue messages
remain safe because the worker owns the conditional `queued` to `processing` transition.

Do not automatically retry a timeout or connection loss when provider processing may already have
occurred. One retry is allowed only for a clearly transient failure known to have happened before
provider acceptance. Retries count toward the user allowance when they create provider work.

### Cost accounting

- Represent application budget values as integer micro-USD.
- Monthly application item starts with `1_000_000` micro-USD remaining.
- Price configuration contains model ID, effective date, conservative input/output/image rates,
  reservation size, and expiry.
- New AI requests fail closed when pricing is missing or stale.
- Reserve before queueing; refund only amounts known not to have been consumed.
- Reconcile successful calls from provider-reported usage.
- For uncertain outcomes, retain the conservative reservation as spent.
- DeepSeek account balance is a secondary backstop, not the monthly control.
- Manual expense entry is never disabled by AI configuration, budget, or provider failure.

### Data minimization

- Text quick entry sends only the selected description, allowed category list, current calendar
  date, time zone, and default currency.
- Receipt scan sends only a resized derivative and the allowed category/currency context.
- Do not send expense history, Cognito identifiers, email addresses, ledger IDs, or unrelated
  receipt metadata.
- Strip image metadata and orientation-normalize before provider transmission.
- Build the derivative in temporary memory/storage and do not persist it after the request.
- Never log raw prompts, original images, OCR text, or raw provider responses.

### Receipt JSON Schema

The provider is asked to return a schema-constrained object. All objects set
`additionalProperties: false`; all keys are required and nullable values represent missing data.

```json
{
  "schemaVersion": 1,
  "merchant": { "value": "WinMart", "status": "extracted" },
  "expenseDate": { "value": "2026-09-20", "status": "extracted" },
  "amount": { "value": "125000", "status": "extracted" },
  "currency": { "value": "VND", "status": "extracted" },
  "category": { "value": "food_drinks", "status": "suggested" },
  "issues": []
}
```

Field status enum:

```text
extracted | suggested | missing | ambiguous
```

Issue objects use stable codes and optional field names so the Android app can localize
explanations. Initial codes:

```text
image_unreadable
multiple_totals
date_ambiguous
currency_ambiguous
amount_ambiguous
unsupported_currency
other
```

### Lambda normalization

JSON syntax or schema compliance alone is insufficient. Lambda also verifies:

- `schemaVersion` is supported;
- date is a real `YYYY-MM-DD` calendar date;
- amount is a positive decimal string within configured precision and maximum bounds;
- currency is on the supported allowlist;
- category is on the stable enum;
- status/value combinations agree (`missing` requires `null`);
- merchant and issue counts/lengths are bounded;
- completion status is not truncated or incomplete.

Invalid output becomes `ai_invalid_response`. The receipt and form remain available for manual
entry. The app never receives the raw provider response.

### TallyNest ReceiptDraft response

The normalized mobile contract is versioned independently from the provider:

```json
{
  "draftVersion": 1,
  "requestId": "air_...",
  "fields": {
    "merchant": { "value": "WinMart", "status": "extracted" },
    "expenseDate": { "value": "2026-09-20", "status": "extracted" },
    "amount": { "value": "125000", "status": "extracted" },
    "currency": { "value": "VND", "status": "extracted" },
    "category": { "value": "food_drinks", "status": "suggested" }
  },
  "issues": [],
  "expiresAt": "2026-09-21T12:00:00Z"
}
```

Merchant is displayed separately in the draft UI and, if retained by the user, is converted into
editable notes for the MVP. The draft never writes or overwrites an expense. The final form
submission goes through the normal expense endpoint and all normal validation.

### Queue behavior

- Standard SQS queue; ordering is not required.
- Visibility timeout exceeds worker timeout with margin.
- Worker uses conditional state transitions for idempotency.
- Bounded retry with a dead-letter queue.
- Terminal failure stores a safe error code and preserves manual fallback.
- Metrics/alerts cover queue age, DLQ depth, request failures, provider latency, invalid-response
  rate, and budget exhaustion.

## 11. Backend structure

Use one TypeScript codebase with a modular-monolith layout and separate Lambda entry points:

```text
transport/http
application
  identity
  expenses
  receipts
  summaries
  ai
domain
  money
  expense
  ledger
ports
  expense-repository
  receipt-storage
  ai-provider
adapters
  dynamodb
  s3
  deepseek
handlers
  api
  ai-worker
  cleanup
```

The repository is a pnpm workspace. The backend package lives at `apps/backend`, leaving space for
the Android application and any deliberately shared contracts without splitting the backend into
services. Zod validates runtime boundaries, Vitest runs unit tests, esbuild creates Lambda bundles,
and ESLint plus Prettier enforce code quality and formatting.

Transport parses requests and maps errors. Application services orchestrate use cases. Domain
modules enforce money, category, date, and state-transition rules. Adapters contain AWS and DeepSeek
details. Lambda handlers remain thin.

Avoid a full dependency-injection framework unless implementation evidence justifies it. Use
explicit construction and small interfaces. This reduces Lambda bundle size and cold-start work.

## 12. AWS SAM design

One stack in `ap-southeast-1` defines:

- Cognito User Pool, public native app client, callback/logout URLs, and managed login domain;
- API Gateway HTTP API with JWT authorizer and bounded route throttles;
- API, AI-request, AI-worker, and cleanup Lambda functions;
- one DynamoDB table with sparse GSI1, TTL, encryption, and point-in-time recovery subject to
  verified cost;
- one private S3 receipt bucket with lifecycle rules and noncurrent-version retention if versioning
  is enabled;
- SQS AI queue and DLQ;
- EventBridge schedule for cleanup reconciliation;
- explicit CloudWatch log groups with short retention;
- least-privilege IAM roles per handler;
- outputs required by the Android build configuration.

No VPC, NAT Gateway, load balancer, public IPv4 resource, Redis, container service, global table, or
always-running server is included.

The DeepSeek key is supplied by reference from a backend-only encrypted parameter/secret store. Its
value is never present in source control, mobile configuration, build artifacts, SAM parameters
committed to disk, or logs. The specific AWS secret facility is chosen after current pricing is
verified against the cost target.

Prefer ARM64 Lambda where all compiled dependencies, especially image processing, are verified
compatible. Otherwise use x86_64 only for the incompatible handler rather than changing every
function.

## 13. Security and privacy

### Authorization invariant

Every protected use case resolves the caller's ledger from authenticated identity and includes that
ledger in every DynamoDB key, condition, query, cleanup task, and S3 object path. Tests must prove
that changing an expense, receipt, cursor, request, or object identifier cannot cross this boundary.

### Controls

- HTTPS with normal Android certificate validation; no disabled TLS checks.
- API Gateway JWT validation plus Lambda authorization.
- Least-privilege IAM and separate AI-secret access for the worker only.
- S3 Block Public Access, TLS-only bucket policy, encryption at rest, and short-lived presigned
  URLs.
- Runtime validation for requests, provider output, notification routes, cursors, and stored
  external data.
- Bounded payload sizes, pagination, Lambda timeouts, concurrency, and API throttles.
- No receipt details in notifications.
- No secrets or raw financial/receipt content in logs.
- Dependency lockfiles and review of native SDK permissions/data collection.
- Separate release configuration; debug menus and test endpoints absent from release builds.

WAF, certificate pinning, remote attestation, and device-compromise blocking are excluded from the
MVP unless a later threat review demonstrates the need and the cost/recovery model is acceptable.

## 14. Reliability and failure behavior

| Failure                                 | User/data outcome                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Network loss during manual save         | App retains in-memory form and safely retries with the same idempotency key                 |
| Duplicate save tap                      | Same idempotency result; no duplicate expense                                               |
| Stale edit                              | `409`; no overwrite; reload and reconcile                                                   |
| Receipt upload failure                  | Existing expense is preserved; upload remains retryable                                     |
| Receipt validation failure              | Object is rejected/cleaned; no attachment                                                   |
| S3 deletion failure                     | DB relation is removed as requested; durable cleanup retries and alerts on terminal failure |
| DeepSeek unavailable                    | AI request fails safely; receipt/manual form remain usable                                  |
| DeepSeek timeout with uncertain billing | No blind retry; conservative reservation remains consumed                                   |
| Invalid AI JSON/business value          | No draft is trusted; return safe failure and manual fallback                                |
| SQS duplicate delivery                  | Conditional request state prevents duplicate provider work                                  |
| AI worker terminal failure              | DLQ plus safe request status and operator recovery path                                     |
| Monthly budget exhausted                | New AI requests return `429`; all non-AI features continue                                  |
| App process death during AI work        | Result remains pollable until TTL expiry                                                    |

## 15. Observability and cost controls

### Structured logs

Log event name, request/correlation ID, route/use case, status, latency, retry count, provider
model, token counts, estimated cost, and safe internal identifiers where needed. Never log access
tokens, email addresses, notes, prompts, receipt bytes/text, presigned URLs, or raw AI output.

### Health signals

- API success/error count and latency;
- Lambda errors, throttles, duration, and concurrency;
- DynamoDB throttles and conditional-conflict rates;
- S3 upload validation and cleanup failures;
- SQS age, retry, and DLQ depth;
- AI completion, timeout, invalid-result, token, estimated-cost, and quota-denial rates;
- application budget remaining and AWS billing alerts.

Use built-in metrics first. Add paid custom metrics only when logs and built-in metrics cannot
provide an actionable signal within budget.

### Retention and recovery

- Set explicit short log retention, initially 7–14 days pending operational review.
- AI normalized results and idempotency records expire after a short window such as 24 hours unless
  implementation testing justifies longer.
- Do not rely on DynamoDB TTL for exact-time deletion.
- Enable recovery features only after their actual regional cost is included in the AWS estimate.
- Data retention and user-requested account deletion require a policy before public release; no
  silent indefinite retention assumption is approved by this document.

## 16. Performance and scale assumptions

- 2–3 initial light users.
- Approximately 10,000 API requests per month.
- Approximately 1 GB total receipt storage in the initial estimate.
- Receipt upload maximum 5 MB.
- Fewer than 2,000 expenses per ledger per month.
- AI concurrency is very low and bounded by allowance controls.

Targets for design validation, not contractual SLAs:

- non-AI API p95 below 1 second under expected load, excluding direct S3 transfer;
- first monthly page and summary complete within a usable mobile wait under representative month
  sizes;
- AI requests expose queued/processing state rather than holding an HTTP connection open;
- no unbounded query, scan, retry, queue, output, or log path.

Revisit the design when measured traffic, expense density, AI duration, receipt storage, or support
workload approaches an order of magnitude above these assumptions.

## 17. Validation strategy

### Contract and domain tests

- money parsing, precision, bounds, multi-currency separation, and exact aggregation;
- past/current/future dates and month grouping;
- category, notes, currency, and ID validation;
- receipt and AI state transitions;
- request/response schemas and stable error envelopes;
- provider JSON Schema, semantic normalization, null/status rules, truncation, and extra-field
  rejection.

### Backend integration tests

- bootstrap idempotency and exactly-one membership;
- cross-user expense, receipt, cursor, AI-request, and S3 denial;
- idempotency replay and mismatched-body rejection;
- optimistic concurrency conflicts;
- DynamoDB month ordering/pagination and complete summary across pages;
- receipt type/size/signature checks, replacement, deletion, and cleanup recovery;
- atomic user quota and app-budget reservation under concurrency;
- SQS duplicate delivery, retry, DLQ, and uncertain provider outcomes.

### Android tests

- authentication callback and logout cleanup;
- form validation and duplicate-submit prevention;
- loading, empty, stale, offline, timeout, and retry states;
- receipt selection/upload/scan and editable draft mapping;
- app background/foreground and process-restart behavior;
- local notification permission, schedule reconciliation, and safe routing;
- TalkBack, text scaling, keyboard, and common phone layouts.
- New Architecture/Fabric rendering, TurboModule or autolinking contracts, Hermes behavior, and
  native lifecycle cleanup.

### Infrastructure and release checks

- SAM template validation and change preview before deployment;
- least-privilege IAM review;
- secret scanning and proof that mobile bundles contain no provider secret;
- Android debug and release builds;
- React Native Community CLI Metro/Hermes bundle checks, Gradle compatibility, Codegen/autolinking
  output, native ABI packaging, and release R8 behavior;
- physical-device receipt and notification checks;
- AWS and DeepSeek cost estimate using current Singapore/model pricing;
- smoke test, rollback, cleanup, and data-recovery runbooks.

## 18. Design challenge and accepted tradeoffs

### Why DynamoDB instead of PostgreSQL

DynamoDB fits the approved low-cost serverless direction and known key-based/month-based access
patterns. The tradeoff is less flexible reporting and more deliberate key design. Advanced reporting
and arbitrary export remain deferred.

### Why a queue for AI

SQS adds one component but prevents mobile/API timeouts from owning a long provider call, gives
observable retries and DLQ recovery, and supports safe process restart. It is justified specifically
by external AI latency; other MVP operations remain synchronous.

### Why calculate summaries on read

The expected month size is small. Read-time aggregation avoids transactionally maintaining many
currency/category counters during edits, deletes, and month changes. Materialized summaries become
appropriate only after measured query cost or latency crosses the stated trigger.

### Why no offline writes

Offline mutation queues introduce conflict resolution, duplicate behavior, sensitive local
persistence, and substantial mobile testing. Clear retry with idempotent online writes provides the
required value more safely for the first release.

### Why retain a ledger abstraction without sharing

It avoids coupling financial ownership to a login identity and permits a future separate shared
ledger. The MVP does not expose membership mutation, and existing personal records must never become
shared automatically.

### Rollback characteristics

- AI can be disabled by configuration without affecting manual entry.
- Local reminders can be disabled without backend changes.
- Receipt scan and quick entry share an adapter but are separately configurable.
- Additive API/schema evolution supports old installed clients.
- Infrastructure changes are previewed through CloudFormation/SAM; irreversible data changes require
  a separate migration plan.

## 19. Remaining pre-release gates

These items do not reopen T1–T7, but must be resolved before a public release:

1. Define the data-retention and user-requested account-deletion policy.
2. Verify current AWS account eligibility and Singapore pricing before infrastructure deployment.
3. Verify the current DeepSeek model capability and pricing before enabling AI.
4. Check TallyNest trademark, Google Play listing, and Android package-name availability before
   public brand investment.

## 20. Recommended next phase

Perform `DESIGN_REVIEW`: challenge the approved choices against simplicity, privacy, failure
recovery, mobile UX, and the cost targets. Record any revisions, then create the ordered
implementation backlog. Pre-release gates remain tracked even when they do not block initial
implementation planning.
