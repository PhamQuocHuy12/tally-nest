# Phase 1 — MVP baseline

**Product:** TallyNest  
**Working tagline:** Your spending, clearly organized. **Status:** Approved for technical design on
2026-09-20.

## Goal

Build an Android-first private expense and receipt tracker for an individual, initially supporting
2–3 light users as separate accounts. The client is a React Native Android application. Users can
record spending manually or through reviewed AI suggestions, attach a receipt, and understand
monthly spending. iOS and web clients are future updates, not MVP deliverables.

The target is an ongoing AWS cost near USD $2–3 per month after promotional credits, where current
service eligibility and measured use permit it. DeepSeek billing is separate. Neither target is a
hard cap or guarantee and both must be verified before deployment.

## Required capabilities

1. Register, verify email, sign in, sign out, and reset a password.
2. Create, view, edit, and delete an owned expense.
3. Store category, date, positive amount, currency, and optional notes.
4. Upload, view, replace, and remove one private receipt image per expense.
5. Show monthly expenses, counts, totals, and category breakdowns, always separated by currency.
6. Convert short natural-language descriptions into editable drafts through DeepSeek.
7. Scan receipt images through DeepSeek into editable drafts.

An optional local Android monthly notification may remind the user to review the previous month.
Email reminders and remote push notifications are excluded.

## Product rules

- Every user receives one private personal ledger/workspace and is its only member. Expenses and
  receipts belong to that ledger. Sharing, invitations, household switching, and partner permissions
  are not included.
- The backend must keep membership fixed at one for the MVP and enforce ledger membership for every
  protected operation.
- Future couple support must not automatically expose an existing personal ledger. A separate shared
  ledger is the preferred future model, with any record movement requiring explicit user action.
- Android React Native is the only MVP client platform. iOS and web are planned future updates.
- Categories are Food & Drinks, Transport, Housing & Utilities, Shopping, Health, Entertainment,
  Education, Travel, and Other.
- Expense dates default to today, but users may select past or future calendar dates.
- A future-dated expense is stored immediately and appears in that future month's list and totals.
  It does not create a recurring expense, payment, or additional reminder.
- Amounts must be positive and stored exactly using currency-aware minor-unit rules; ordinary
  floating-point arithmetic must not be used for money.
- Multiple currencies are supported without conversion. Different currencies are never summed
  together.
- Notes are optional and limited to 1,000 characters.
- One JPEG, PNG, or WebP receipt of at most 5 MB may be associated with an expense.
- Receipt identifiers are private storage keys, not permanent public URLs.
- Deletion requires confirmation. Deleted, replaced, or abandoned receipt objects must be cleaned up
  with retryable recovery.
- Monthly grouping uses the entered calendar date and must not shift that date through time-zone
  conversion.
- Every expense and receipt operation requires backend-enforced ownership checks.

## AI rules

- AI produces suggestions only. A user must review and explicitly save every draft.
- Missing or ambiguous fields remain blank or are flagged; they are never invented.
- Relative dates use the user's configured time zone.
- Totals and summaries are calculated by application code, never by the model.
- Manual entry remains available during provider failure, timeout, disablement, or quota exhaustion.
- The interface discloses when submitted text or a receipt image will be sent to DeepSeek.
- The API key remains on the backend and must not appear in frontend assets, source control, or
  logs.
- Start with a configurable allowance of 100 provider calls per user per calendar month, shared by
  quick entry and receipt scanning.
- A configurable USD $1.00 application-wide AI allowance applies per calendar month. It is separate
  from the 100-call per-user limit; whichever is reached first blocks further AI calls while manual
  entry remains available.
- The backend must reserve a conservative estimated cost atomically before each provider call and
  reconcile it against returned usage. AI fails closed if pricing configuration is missing or stale.
- Quota reservation must be atomic. Repeated submissions must be deduplicated. Retries, duration,
  input, image dimensions, and output size must be bounded.
- Provider output is untrusted and must pass the normal expense schema validation.
- Do not send full expense history or log raw prompts, receipt contents, or model responses.
- The selected model's image support and current price must be reverified before implementation.

### Structured AI receipt draft contract

- The Android app never calls DeepSeek directly. It submits an authenticated scan request to the
  TallyNest API.
- Lambda verifies the user, ledger membership, receipt ownership, request deduplication, per-user
  quota, and application-wide allowance before calling DeepSeek.
- Lambda requests structured output using a defined, versioned receipt JSON Schema.
- The provider response is untrusted. Lambda must parse, schema-validate, and normalize it before
  returning a TallyNest-owned `ReceiptDraft` API response to the Android app.
- The receipt draft contains `schemaVersion`, merchant, expense date, amount, currency, category,
  field statuses, and warnings.
- Monetary amounts are decimal strings, never floating-point JSON numbers.
- Dates are `YYYY-MM-DD` calendar dates and are not shifted through time-zone conversion.
- Categories must be one of the predefined TallyNest category values.
- Each extracted field has a status such as `extracted`, `suggested`, `missing`, or `ambiguous`.
- Missing values use `null`; unreadable or uncertain values must not be invented.
- Empty, truncated, malformed, unexpected, or schema-invalid provider output produces a safe scan
  failure while preserving the receipt and any manual form input.
- The Android app uses the validated draft only to prefill an editable expense form. It visibly
  identifies missing or ambiguous fields for the user to complete.
- A draft is not a saved expense, is excluded from totals, and cannot overwrite an existing expense.
  Only the user's explicit submission through the normal validated expense endpoint persists data.
- The mobile API contract must remain independent of DeepSeek's raw response so the model, prompt,
  or provider can change without breaking the app.

## Primary journeys

### Authentication

The user registers, verifies their email, signs in, and arrives at an empty or populated dashboard.
Returning users can sign out or request a password reset.

### Manual expense entry

The user enters the required fields, optionally adds notes and a receipt, and saves. If receipt
upload fails, the expense remains saved and the upload can be retried.

### Monthly review

The user selects a month, sees newest-first expenses and complete summary totals, opens details, and
can edit or confirm deletion. Any mutation updates the affected monthly summary.

### Optional monthly device notification

The user explicitly enables notifications and grants Android notification permission. The app
schedules a local notification for the first day of each month at 09:00 in the selected time zone.
Tapping it opens the previous month's summary. The app reconciles the schedule after relevant
settings or time-zone changes. Email and remote push delivery are not used in the MVP.

### AI quick entry

The user enters a short description, acknowledges provider processing, and requests a draft. The
backend checks authentication, limits, and quota, then returns validated suggestions. The user
corrects and explicitly saves through the normal expense workflow.

### Receipt scan

The user uploads a receipt and explicitly starts scanning. Uploading alone never triggers AI. The
backend verifies ownership and quota, prepares the image, and requests output conforming to the
versioned receipt JSON Schema. Lambda validates and normalizes the provider response into a
TallyNest `ReceiptDraft`. The Android app prefills the form, highlights missing or ambiguous fields,
and lets the user complete or correct everything before explicitly saving. Failures preserve the
image and manual input.

## Minimum screens

| Screen          | Responsibilities                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication  | Registration, verification, login, and password reset                                                                                  |
| Dashboard       | Month selection, totals by currency, category breakdown, expense count, and expense list                                               |
| Expense form    | Manual fields, AI quick entry, scan action, editable suggestions, receipt input, and validation                                        |
| Expense details | Saved values, private receipt preview, edit, and delete confirmation                                                                   |
| Settings        | Default currency, time zone, AI allowance remaining, sign out, notification permission state, and optional monthly reminder preference |

Core flows must work across supported Android phone sizes, text scaling settings, and relevant
foreground, background, and process-restart states.

## Acceptance criteria

### Authentication and isolation

- A user can complete registration, email verification, login, logout, and password reset.
- Unauthenticated requests cannot read or mutate protected data.
- Changing an identifier never grants access to another user's expense or receipt.

### Expenses and summaries

- A user can create, view, edit, and delete an expense with server-side validation.
- Repeated save actions do not create accidental duplicates.
- Lists support pagination or incremental loading and expose clear empty, loading, validation, and
  failure states.
- Month summaries cover all matching records, not only the visible page.
- Totals and categories are exact and separated by currency.
- Create, edit, and delete operations update the correct monthly summaries.
- A future-dated expense appears in the selected future month and is excluded from other months.

### Receipts

- A user can upload, privately view, replace, and remove one supported image.
- File type and the 5 MB limit are enforced by the upload workflow, not only in the browser.
- Access uses short-lived authorized links.
- Upload failure preserves the expense and offers retry.
- Deleted, replaced, and abandoned objects are eventually removed.

### AI

- Representative quick-entry text and readable receipts produce editable drafts when fields are
  present.
- Ambiguous, missing, malformed, or unreadable values require user correction.
- Provider disclosure appears before content is sent.
- Only authenticated users can invoke AI, and receipt scans enforce ownership.
- Suggestions cannot save or overwrite expenses without explicit confirmation.
- DeepSeek's raw response is never passed directly to the Android app; Lambda returns only a
  validated, normalized, versioned `ReceiptDraft`.
- Receipt draft amounts are decimal strings, dates use `YYYY-MM-DD`, categories use the approved
  enum, and missing values are represented explicitly as `null`.
- The Android form is prefilled from valid draft values and clearly identifies every missing or
  ambiguous required field.
- Empty, truncated, malformed, extra-field, and schema-invalid provider responses are rejected
  without saving an expense or losing the user's receipt and manual input.
- Provider failure, timeout, malformed output, and quota exhaustion leave manual entry usable.
- Concurrent and repeated requests cannot bypass quota or create duplicate provider work.
- Secrets and raw receipt content are absent from frontend output and application logs.
- Vietnamese descriptions, ambiguous dates, and blurry receipt cases are covered before release.

### Optional Android notification

- Notifications are disabled by default and require explicit user opt-in and Android permission
  where applicable.
- The reminder targets the previous month's summary and contains no receipt image or detailed
  expense information.
- Tapping the notification routes safely to the intended summary from cold-start, background, and
  foreground states.
- Settings and time-zone changes reconcile the scheduled reminder without creating duplicates.
- Denied, revoked, and permanently blocked permission states are explained without blocking expense
  tracking.
- Device restart, process death, reinstall, and Android background restrictions have documented and
  tested behavior.

## Explicitly outside the first release

- Shared wallets, partner invitations, household switching, and collaboration permissions
- AI chat, AI-written monthly insights, and autonomous financial actions
- Bank connections and transaction import
- Exchange-rate conversion
- Budgets, overspending alerts, recurring expenses, and subscription detection
- Custom categories, multiple receipts, and PDF receipts
- Advanced reports, CSV export, and tax calculations
- iOS and web clients; both are confirmed future updates after the Android MVP
- Remote push messaging and server-generated reminder delivery

## Release success condition

A user can securely sign in, maintain expenses manually or through reviewed AI drafts, privately
attach and scan receipts, and review accurate monthly totals. All required acceptance criteria pass,
deployment is reproducible, and AWS and DeepSeek costs are monitored separately.
