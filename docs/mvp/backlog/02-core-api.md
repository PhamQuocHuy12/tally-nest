# Core API tickets

## BE-004 — Implement shared domain and API contracts

**Owner:** Codex  
**Dependencies:** BE-002  
**Status:** pending

### Scope

- Implement exact money parsing and formatting without floating-point arithmetic.
- Implement VND/USD metadata, category values, calendar dates, IDs, versions, cursors, and bounded
  notes.
- Add runtime request/response schemas, stable error envelopes, request IDs, and safe structured
  logging fields.
- Reject unknown properties on mutation requests.

### Acceptance evidence

- Unit and contract tests cover valid values, boundaries, malformed input, currency precision,
  future dates, and stable errors.

## BE-005 — Implement DynamoDB access and ledger isolation

**Owner:** Codex  
**Dependencies:** BE-001, BE-003, BE-004  
**Status:** pending

### Scope

- Implement repositories for profiles, ledgers, memberships, expenses, receipts, idempotency, AI
  requests, allowance records, and cleanup work.
- Implement the approved primary keys, sparse GSI, deterministic month ordering, opaque cursors,
  conditional writes, transactions, and TTL metadata.
- Require ledger scope in every protected key, query, condition, and object path.
- Provide integration fixtures for at least two isolated users.

### Acceptance evidence

- Repository integration tests prove all required access patterns.
- Cross-ledger reads and writes fail without revealing whether a record exists.
- Pagination is deterministic and no production path performs an unbounded scan.

## BE-006 — Implement authenticated bootstrap

**Owner:** Codex  
**Dependencies:** BE-005  
**Status:** pending

### Scope

- Validate Cognito JWT claims at the gateway and trusted identity at the handler.
- Implement idempotent `POST /v1/bootstrap`.
- Atomically create or return the internal user profile, one personal ledger, and exactly one
  membership.
- Keep Cognito identity separate from ledger ownership identifiers.

### Acceptance evidence

- Repeated and concurrent bootstrap requests return the same logical result.
- Missing/invalid authentication returns the stable `401` contract.
- Tests prove exactly-one membership and cross-user isolation.

## BE-007 — Implement account preferences

**Owner:** Codex  
**Dependencies:** BE-006  
**Status:** pending

### Scope

- Implement `GET /v1/preferences` for default currency and IANA time zone.
- Implement partial `PATCH /v1/preferences`; omitted fields remain unchanged.
- Validate supported currency and time-zone values and return the updated resource.
- Keep theme, language, Android permission state, and local reminder scheduling outside the backend
  contract.

### Acceptance evidence

- Contract tests cover reads, partial updates, invalid values, unknown fields, authentication, and
  ledger isolation.

## BE-008 — Implement idempotent expense creation

**Owner:** Codex  
**Dependencies:** BE-005, BE-006  
**Status:** pending

### Scope

- Implement `POST /v1/expenses` with an `Idempotency-Key`.
- Validate money, currency, category, date, notes, and optional ready receipt.
- Persist the expense and any receipt attachment atomically where required.
- Bind the idempotency record to caller, operation, and normalized request body.

### Acceptance evidence

- Duplicate retries return the original result without another expense.
- Reusing a key with different content returns `409 idempotency_conflict`.
- Money precision, future dates, and receipt ownership are tested.

## BE-009 — Implement expense reads and pagination

**Owner:** Codex  
**Dependencies:** BE-008  
**Status:** pending

### Scope

- Implement expense detail and monthly list routes.
- Return newest-first deterministic pages with bounded limits and opaque cursors.
- Return `404` for absent and cross-ledger resources without distinguishing them.

### Acceptance evidence

- Tests cover empty, single-page, multi-page, equal-date, malformed-cursor, and cross-ledger cases
  without duplicates or omissions.

## BE-010 — Implement expense update and deletion

**Owner:** Codex  
**Dependencies:** BE-009  
**Status:** pending

### Scope

- Implement partial expense updates and confirmed deletion endpoints.
- Require the expected version and use conditional writes.
- Update month-index attributes atomically when the expense date changes.
- Hand failed receipt-object deletion to durable cleanup.

### Acceptance evidence

- Stale versions return `409` without overwriting newer data.
- Tests cover month moves, retries, deletion, cleanup handoff, and isolation.

## BE-011 — Implement monthly summaries

**Owner:** Codex  
**Dependencies:** BE-009  
**Status:** pending

### Scope

- Implement `GET /v1/months/{YYYY-MM}/summary`.
- Query every page for the month and aggregate exact totals and counts by currency and category.
- Keep currencies separate and make summary correctness independent of list-page size.

### Acceptance evidence

- Tests cover multiple pages, currencies, categories, empty months, and exact large-value
  arithmetic.
