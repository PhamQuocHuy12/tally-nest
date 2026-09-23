# Backend readiness tickets

## BE-019 — Add observability and operational controls

**Owner:** Codex  
**Dependencies:** BE-003, BE-014, BE-018  
**Status:** pending

### Scope

- Emit structured request/correlation logs with bounded safe fields.
- Add metrics and alarms for API/Lambda failures, throttles, DynamoDB conflicts, receipt cleanup,
  queue age, DLQ depth, AI failures, and allowance exhaustion.
- Use short explicit log retention and built-in metrics before paid custom metrics.
- Add operator notes for alarm diagnosis and recovery.

### Acceptance evidence

- Automated checks prove sensitive fields are excluded from logs.
- Alarm paths and recovery notes are exercised in the development environment.

## BE-020 — Prove security and integration behavior

**Owner:** Codex  
**Dependencies:** BE-011, BE-014, BE-018  
**Status:** pending

### Scope

- Run contract, domain, repository, handler, and infrastructure checks.
- Prove cross-user denial for expenses, receipts, cursors, AI requests, and S3 access.
- Review IAM least privilege, payload bounds, throttling, secret access, and dependency risk.
- Verify idempotency, concurrency, recovery, and failure branches end to end.

### Acceptance evidence

- Required automated suites pass from documented clean commands.
- A security review records findings and resolutions without invented pass claims.
- Any accepted residual risk has an owner and release gate.

## BE-021 — Complete backend release readiness

**Owner:** Joint  
**Dependencies:** AWS-004  
**Status:** pending

### Scope

- Verify current AWS Singapore and DeepSeek costs against the approved limits.
- Finalize data-retention and user-requested account-deletion policy.
- Document configuration, deployment, smoke checks, rollback, cleanup, recovery, DLQ replay, and
  provider-disable procedures.
- Confirm additive API compatibility with the supported Android release.
- Record a backend release recommendation: GO, GO WITH RISK, or NO-GO.

### Acceptance evidence

- Runbooks have been followed successfully in the development environment.
- Cost signals and rollback paths are visible.
- All backend release gates are completed or explicitly accepted by the owner.
