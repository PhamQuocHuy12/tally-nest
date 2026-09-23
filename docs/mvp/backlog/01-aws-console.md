# AWS Console tickets

These are the only tickets that require the user to work in the AWS account. Console labels and
flows may change, so current AWS documentation must be checked when each ticket starts. Never paste
credentials, account identifiers, or secret values into the repository or chat evidence.

## AWS-001 — Secure the AWS account and add cost guardrails

**Owner:** User  
**Dependencies:** None  
**Status:** pending

### Goal

Make the AWS account safe enough for development before application resources are created.

### Console work

- Protect the root user with strong MFA and do not create root access keys.
- Confirm account recovery details and security contacts.
- Create billing and budget notifications appropriate for the MVP cost target.
- Confirm that Singapore (`ap-southeast-1`) is the intended application region.
- Review current free-tier or credit eligibility without assuming it applies.

### Acceptance evidence

- MFA and recovery controls are confirmed without recording sensitive values.
- Budget notifications have a tested destination.
- A dated cost/eligibility note is recorded in the progress ledger.

## AWS-002 — Prepare deployment access

**Owner:** User  
**Dependencies:** AWS-001, BE-003  
**Status:** pending

### Goal

Provide a non-root, auditable way for the user to preview and approve the SAM development
deployment.

### Console work

- Use a dedicated human identity rather than the root user for daily work.
- Configure MFA and short-lived credentials for that identity.
- Grant only the bootstrap/deployment permissions required by the reviewed SAM stack and
  CloudFormation workflow.
- Configure the local AWS profile without committing credential files.

### Acceptance evidence

- The identity can call the AWS identity check and preview the intended stack.
- Root credentials and long-lived secret keys are not used by project scripts.
- The SAM change set can be inspected before execution.

## AWS-003 — Configure the DeepSeek secret and AI settings

**Owner:** User  
**Dependencies:** BE-003, BE-015  
**Status:** pending

### Goal

Supply AI configuration without exposing the provider key or enabling unbounded provider spending.

### Console work

- Verify the current selected model's capability and pricing.
- Store the dedicated TallyNest key in the secret facility selected by BE-001.
- Configure the model name, pricing metadata, per-user 100-call monthly limit, and application-wide
  USD 1.00 monthly allowance through non-secret deployment configuration.
- Keep the AI feature disabled until the worker and allowance tests pass.

### Acceptance evidence

- Only the AI worker role can read the secret.
- The key is absent from source, logs, mobile artifacts, and command history captured as project
  evidence.
- Missing or stale pricing configuration causes AI requests to fail closed.

## AWS-004 — Deploy and run the development smoke test

**Owner:** Joint  
**Dependencies:** AWS-002, AWS-003, BE-019, BE-020  
**Status:** pending

### Goal

Create the reviewed development stack and prove its basic behavior without claiming production
readiness.

### Steps

1. Generate and review the CloudFormation change set and estimated impact.
2. Obtain explicit deployment approval.
3. Deploy the SAM development stack.
4. Run authenticated API, receipt, queue, alarm, and isolation smoke checks.
5. Record resource identifiers safely, without secrets or tokens.
6. Exercise rollback or stack cleanup according to the approved runbook.

### Acceptance evidence

- The deployed resources match the reviewed template with no manual drift.
- Smoke checks pass and CloudWatch exposes the expected signals.
- Costs and alarms are visible.
- Rollback/cleanup behavior is documented and tested proportionately.
