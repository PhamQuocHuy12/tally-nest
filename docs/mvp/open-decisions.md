# MVP open decisions

These are unresolved choices, not approved requirements. Decisions are ordered by how soon they can
block technical design or implementation.

## D1 — Ownership model for future sharing — decided

**Decision:** Use a private one-member ledger/workspace internally, while exposing no sharing UI or
API in the MVP. Keep membership fixed at one and enforce it server-side.

Every new user receives a private personal ledger automatically. Expenses and receipts belong to
that ledger. The authenticated user must be its sole member, and the backend enforces membership for
every protected operation.

Future couple support should create a separate shared ledger by default. It must not automatically
add another person to an existing personal ledger or expose historical personal expenses. Moving or
copying records into a shared ledger will require an explicit user action and separately approved
rules.

**Alternative:** Store `ownerUserId` directly on every record. This is simpler now, but adding
shared ownership later requires a deliberate data migration and privacy transition.

**Status:** Approved on 2026-09-20. This decision now governs DynamoDB keys, authorization
contracts, and receipt key layout.

## D2 — Client platform and monthly reminder — decided

**Decision:** The MVP client is an Android React Native application. iOS and web clients will be
delivered only in future updates and are not parallel first-release work.

Email reminders are excluded. The Android app may offer an optional monthly notification, disabled
by default and enabled only after the user grants notification permission. For the MVP, schedule the
reminder locally on the device for the first day of the month at 09:00 in the user's selected time
zone. Tapping it opens the previous month's summary.

Remote push infrastructure is deferred because this reminder does not require a server-generated
message. The app must reschedule or reconcile the local notification after relevant settings or
time-zone changes and document behavior after reinstall, device restart, permission revocation, and
Android background restrictions.

**Status:** Approved on 2026-09-20. Android is the only MVP client; iOS and web are explicitly
future updates.

## D3 — Infrastructure definition tool — decided

**Decision:** Use AWS SAM with TypeScript Lambda handlers for the first release.

SAM keeps the small serverless stack explicit, provides serverless-focused local tooling, and avoids
introducing CDK abstractions before the project needs them. The SAM template may combine SAM
shorthand with standard CloudFormation resources where a service has no appropriate SAM shorthand.

CDK may be reconsidered in a future architecture review if the system develops multiple complex
environments, reusable infrastructure libraries, or substantial programmatic resource-generation
needs. It is not part of the MVP toolchain.

**Status:** Approved on 2026-09-20. This decision governs repository scaffolding and infrastructure
validation.

## D4 — AWS region — decided

**Decision:** Use Asia Pacific (Singapore), `ap-southeast-1`, for all regional MVP resources.

For the expected 2–3 light users in Hanoi, recurring free allowances should dominate the cost
profile, making the potential savings from a more distant region negligible compared with the
latency and operational simplicity of keeping Cognito, API Gateway, Lambda, DynamoDB, S3, and logs
together in Singapore.

Do not add cross-region replication or regional duplicates in the MVP. Pricing and the user's actual
AWS account eligibility must still be verified before deployment.

**Status:** Approved on 2026-09-20. No cloud resources have been created.

## D5 — AI operating allowance — decided

**Decision:** Start with a configurable USD $1.00 application-wide DeepSeek allowance per calendar
month.

Use a dedicated TallyNest API key. Keep the key only in backend secret storage. The application must
reserve a conservative estimated cost atomically before dispatching a provider call, reject calls
when the remaining allowance cannot cover the reservation, and reconcile the reservation against the
provider's returned usage after completion. The existing 100-call per-user monthly limit remains a
separate control; whichever limit is reached first blocks further AI calls while manual expense
entry remains available.

DeepSeek's documented balance endpoint and insufficient-balance response provide account-balance
visibility and a secondary backstop, but no documented API-key monthly hard cap was identified
during this decision. Therefore, the TallyNest allowance is the primary monthly control. Provider
balance, pricing, and model capability must be checked before AI is enabled, and the app should fail
closed if its price configuration is missing or stale.

**Status:** Approved on 2026-09-20. No API key has been supplied or stored in the repository.

## D6 — Product name — decided

**Decision:** Use **TallyNest** as the product name, written as one word.

The name combines “tally,” meaning to record or total, with “nest,” representing a private home for
personal or household finances. The working tagline remains **Your spending, clearly organized.**

This is a product-name decision, not an availability clearance. Domain, trademark, Google Play
listing, and Android package-name availability must be checked before public release or brand
investment.

**Status:** Approved on 2026-09-20.
