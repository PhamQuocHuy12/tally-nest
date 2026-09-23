# Backend foundation tickets

## BE-001 — Close backend design and tooling decisions

**Owner:** Joint  
**Dependencies:** Approved MVP design  
**Status:** completed

### Goal

Remove decisions that would otherwise be hidden inside implementation.

### Scope

- Finish review of the DynamoDB access patterns, keys, sparse index, TTL usage, conditional writes,
  and transaction boundaries.
- Correct the preferences contract: server preferences are default currency and time zone; theme,
  language, notification permission, and local reminder state remain on the Android device.
- Decide the supported Node.js runtime, package manager, workspace layout, validation library, test
  runner, bundler, and local AWS testing approach.
- Decide the development environment name and configuration naming convention.
- Select the backend-only AWS secret facility after checking current Singapore pricing.
- Record compatibility rules for installed older Android clients.

### Acceptance evidence

- Relevant technical-design sections contain the agreed decisions.
- No material database, API, runtime, or secret-storage choice remains hidden in a later coding
  ticket.
- The backend backlog is revised if a decision changes dependencies or scope.
- Completion confirmed by the user on 2026-09-22.

## BE-002 — Scaffold the TypeScript backend workspace

**Owner:** Codex  
**Dependencies:** BE-001  
**Status:** completed

### Goal

Create a backend workspace that can be installed, built, checked, and tested locally without an AWS
account.

### Scope

- Initialize the chosen package manager and lockfile.
- Add strict TypeScript configuration and the modular-monolith directories from the technical
  design.
- Add formatting, linting, type-checking, unit-test, and build commands.
- Add validated configuration loading with safe local examples and no secrets.
- Document supported tool versions and clean-install commands.

### Acceptance evidence

- A clean dependency install succeeds from the committed lockfile.
- Formatting, linting, type-checking, unit tests, and build all pass.
- Secret scanning finds no credentials or provider keys.
- Completed on 2026-09-23: `pnpm install --frozen-lockfile --offline` succeeded from a clean
  dependency directory, `pnpm check` passed all required gates, and `pnpm audit --prod` found no
  known vulnerabilities.

## BE-003 — Add the SAM development stack

**Owner:** Codex  
**Dependencies:** BE-002  
**Status:** completed

### Goal

Represent all application-owned AWS resources in one reviewable development stack before anything is
deployed.

### Scope

- Define API Gateway HTTP API, Lambda entry points, Cognito, DynamoDB, private S3, SQS and DLQ,
  EventBridge cleanup schedule, log groups, and IAM roles.
- Keep the default region at `ap-southeast-1` and use one development environment.
- Add bounded timeouts, memory, concurrency where justified, log retention, and least-privilege
  resource policies.
- Export only the values needed by approved clients and deployment checks.
- Exclude VPC, NAT Gateway, load balancer, Redis, containers, and cross-region resources.

### Acceptance evidence

- SAM validation passes locally.
- A build succeeds without deploying.
- A change-set preview can be generated once AWS-002 is complete.
- Review confirms that the template contains no secret values.

Completed on 2026-09-23. The user confirmed that local SAM validation passed and that the built
stack started successfully on the SAM host. A caller on the trusted LAN reached the API route and
received the expected scaffold response, `{"code":"NOT_IMPLEMENTED"}`. Repository secret scanning
also passed. The change-set preview remains intentionally deferred until AWS-002 is complete and
does not authorize deployment.
