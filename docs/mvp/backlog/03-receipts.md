# Receipt tickets

## BE-012 — Implement receipt upload initiation and confirmation

**Owner:** Codex  
**Dependencies:** BE-005, BE-008  
**Status:** pending

### Scope

- Implement upload-slot creation with a server-generated ledger-scoped object key.
- Return a short-lived presigned upload restricted to the expected object.
- Implement completion confirmation with ownership, existence, size, declared MIME type, and
  JPEG/PNG/WebP signature checks.
- Enforce the 5 MB maximum and safe receipt state transitions.

### Acceptance evidence

- Tests cover valid uploads, oversize files, MIME/signature mismatch, expired uploads, repeat
  completion, and cross-ledger attempts.

## BE-013 — Implement receipt viewing and removal

**Owner:** Codex  
**Dependencies:** BE-012  
**Status:** pending

### Scope

- Return short-lived authorized download URLs only for owned ready/attached receipts.
- Attach at most one ready receipt to an expense using versioned mutation rules.
- Remove an attachment without exposing permanent S3 URLs or client-selected keys.

### Acceptance evidence

- Tests cover ownership, state conflicts, expiry, replacement/removal, and the absence of public or
  permanent URLs.

## BE-014 — Implement receipt cleanup and reconciliation

**Owner:** Codex  
**Dependencies:** BE-012, BE-013  
**Status:** pending

### Scope

- Persist retryable cleanup work when S3 deletion cannot complete.
- Add scheduled reconciliation with bounded attempts and backoff.
- Configure lifecycle cleanup for abandoned staging objects.
- Emit an actionable terminal-failure signal without sensitive receipt content.

### Acceptance evidence

- Tests simulate S3 failure, retry, duplicate execution, terminal failure, and eventual
  database/object consistency.
