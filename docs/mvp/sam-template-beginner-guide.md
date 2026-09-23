# Understanding TallyNest's AWS SAM template

## Learning goal

After reading this guide, you should be able to open
[`infra/template.yaml`](../../infra/template.yaml), explain what each major section creates, trace a
request through the system, and identify the main security and cost controls. You are not expected
to memorize every property.

This guide is for an AWS beginner. Basic YAML familiarity is helpful but not required. It describes
the template as it exists on 2026-09-23. The application uses the AWS SAM transform
`AWS::Serverless-2016-10-31` and the Lambda `nodejs24.x` runtime. The date in the transform is the
name of the SAM specification, not the age of the Lambda runtime.

## Project context

TallyNest is a private expense-tracking MVP. Its planned backend uses:

- Amazon Cognito for user sign-in;
- API Gateway HTTP API as the public HTTPS entrance;
- Lambda functions for backend code;
- DynamoDB for application data;
- S3 for private receipt images;
- SQS for asynchronous AI jobs;
- EventBridge scheduling for cleanup work;
- CloudWatch Logs for operational logs; and
- IAM roles to restrict what each Lambda function can access.

The template defines a **development** stack. It does not mean the features are already implemented.
The current handlers intentionally return `NOT_IMPLEMENTED` or reject work. It also does not create
anything merely because the file exists: AWS resources are created only when an authorized person
deploys the template.

## Official source map

Use these AWS pages when you want the exact service behavior or property rules:

| Source                                                                                                                                             | Why it matters                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [AWS SAM template anatomy](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-template-anatomy.html) | Defines the top-level sections and explains how SAM extends CloudFormation.              |
| [SAM `Globals`](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-template-anatomy-globals.html)    | Explains how shared settings are inherited by serverless resources.                      |
| [`AWS::Serverless::Function`](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html)           | Defines Lambda function properties used near the end of the template.                    |
| [`AWS::Serverless::HttpApi`](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html)             | Defines the HTTP API, authentication, stages, and route integration behavior.            |
| [CloudFormation intrinsic functions](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference.html)     | Defines `Ref`, `Sub`, `GetAtt`, `If`, and the other template expressions.                |
| [`AWS::Cognito::UserPool`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool.html)              | Defines the user directory and sign-in policy.                                           |
| [`AWS::DynamoDB::Table`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html)                  | Defines the table, keys, indexes, billing mode, TTL, and recovery settings.              |
| [`AWS::S3::Bucket`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html)                            | Defines receipt storage, encryption, lifecycle, ownership, and public-access blocking.   |
| [`AWS::SQS::Queue`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sqs-queue.html)                            | Defines queue retention, visibility, long polling, encryption, and dead-letter behavior. |
| [`AWS::IAM::Role`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html)                              | Defines the trust and permission policies used by each Lambda function.                  |

AWS documentation is the authority for AWS behavior. Explanations about why a setting is used in
TallyNest are project-specific interpretations of the template and technical design.

## Roadmap

1. Build the mental model: YAML, SAM, CloudFormation, and stacks.
2. Learn the template's top-level sections and intrinsic functions.
3. Understand parameters, conditions, and shared Lambda settings.
4. Follow authentication from Cognito to API Gateway.
5. Understand DynamoDB and S3 data storage.
6. Follow asynchronous AI jobs through SQS.
7. Read logs, IAM permissions, and least privilege.
8. Trace every Lambda function and event source.
9. Understand outputs, local testing, deployment, cost, and limitations.
10. Review the whole architecture.

## Module 1 — The mental model

### YAML is a data format

YAML uses indentation to represent parent-child relationships. For example:

```yaml
ReceiptBucket:
  Type: AWS::S3::Bucket
  Properties:
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
```

Read this as: "There is a logical resource named `ReceiptBucket`. Its type is an S3 bucket. One of
its properties is a public-access configuration, and that configuration blocks public ACLs."

Spaces matter. A property indented under the wrong parent changes the meaning or makes validation
fail. The project uses two spaces per indentation level.

### CloudFormation is the resource manager

AWS CloudFormation reads a template and manages a **stack**. A stack is the group of AWS resources
created from that template. CloudFormation compares the desired template with the current stack and
prepares changes when the template changes.

CloudFormation gives resources logical names such as `ApplicationTable`. These are names inside the
template. AWS resources can also have physical names such as `tallynest-development-data`.

### SAM is a CloudFormation extension

AWS Serverless Application Model (SAM) adds concise serverless resource types such as
`AWS::Serverless::Function`. Before deployment, the SAM transform expands them into ordinary
CloudFormation resources such as Lambda functions, permissions, and event-source mappings.

```text
template.yaml
     │
     ▼
SAM transform
     │
     ▼
expanded CloudFormation template
     │
     ▼
CloudFormation change set
     │ explicit approval
     ▼
AWS resources
```

`sam build` prepares application artifacts locally. `sam local start-api` runs supported Lambda/API
behavior in Docker. Neither command is the same as deploying a CloudFormation stack.

### Exercise

In `infra/template.yaml`, find one SAM resource and one ordinary CloudFormation resource. Write down
their logical IDs and types. Verify that the SAM type begins with `AWS::Serverless::`.

## Module 2 — Top-level sections and template language

### File header: lines 1–3

- `AWSTemplateFormatVersion` identifies the CloudFormation template format.
- `Transform: AWS::Serverless-2016-10-31` tells CloudFormation to process SAM syntax.
- `Description` provides a human-readable stack description.

### The six important sections

| Section      | TallyNest line range | Purpose                                               |
| ------------ | -------------------: | ----------------------------------------------------- |
| `Parameters` |                 5–24 | Values supplied when creating or updating the stack.  |
| `Conditions` |                26–27 | Boolean decisions calculated from parameters.         |
| `Globals`    |                29–41 | Settings inherited by all SAM Lambda functions.       |
| `Resources`  |               43–520 | AWS resources and relationships managed by the stack. |
| `Outputs`    |              522–540 | Non-secret values shown after deployment.             |

`Resources` is the only part that directly describes the infrastructure inventory. Other sections
configure, connect, or expose values from those resources.

### Intrinsic functions

CloudFormation evaluates special expressions during stack processing:

| Syntax                     | Beginner meaning                                   | TallyNest example                                                                       |
| -------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `!Ref X`                   | Get the useful value of parameter or resource `X`. | `!Ref Environment` returns `development`; `!Ref ReceiptBucket` returns the bucket name. |
| `!Sub '...'`               | Substitute variables into a string.                | `${AWS::StackName}-api` builds a name from the stack name.                              |
| `!GetAtt X.Arn`            | Read a named attribute from resource `X`.          | `!GetAtt AiQueue.Arn` returns the queue ARN.                                            |
| `!Equals [a, b]`           | Compare two values.                                | Checks whether point-in-time recovery is set to `'true'`.                               |
| `!If [condition, yes, no]` | Select a value using a condition.                  | Enables or disables DynamoDB recovery.                                                  |

An **ARN** is an Amazon Resource Name: AWS's globally structured identifier for a resource. Policies
usually use ARNs because permissions must point to exact resources.

### Pseudo parameters

Names such as `AWS::StackName`, `AWS::Region`, `AWS::AccountId`, and `AWS::URLSuffix` are supplied
by CloudFormation. They are not secrets entered in this file.

### YAML anchors

At line 297, `&LambdaAssumeRolePolicy` gives the Lambda trust policy a YAML anchor. Later roles use
`*LambdaAssumeRolePolicy` to copy that data. This is YAML reuse, not a CloudFormation function.

### Exercise

Find three uses of `!Ref`, one `!GetAtt`, and one `!Sub`. For each, identify whether the resulting
value is a name, ID, ARN, URL, or plain configuration value.

## Module 3 — Parameters, conditions, and globals

### Parameters: lines 5–24

`Environment` currently allows only `development`. This deliberately avoids accidental environment
sprawl while the MVP has only one stack.

`CognitoCallbackUrl` and `CognitoLogoutUrl` contain Android deep links. Their `AllowedPattern`
values prevent a deployment from silently redirecting authentication to an unexpected URL.

`EnablePointInTimeRecovery` is represented as a string with allowed values `'true'` and `'false'`.
The condition on line 27 converts that choice into the Boolean used by DynamoDB.

Parameters are configuration, but they should not automatically be treated as a safe place for
secrets. This template contains no API keys or passwords.

### Globals: lines 29–41

Every `AWS::Serverless::Function` inherits:

- ARM64 architecture;
- the Node.js 24 Lambda runtime;
- three shared application environment variables plus AWS connection reuse;
- pass-through tracing behavior.

`TABLE_NAME` and `RECEIPT_BUCKET_NAME` use references, so code receives the actual deployed resource
names rather than hard-coded guesses. A specific function can add variables. For example,
`AiRequestFunction` adds `AI_QUEUE_URL` while keeping the global variables.

Global values reduce repetition, but they also broaden configuration. Do not place a variable in
`Globals` if only one function should receive it—especially a secret.

### Exercise

List the environment variables received by `AiRequestFunction`. Separate inherited variables from
the function-specific variable. Verify your answer using both `Globals` and the function resource.

## Module 4 — Authentication and the public API

### Cognito user pool: lines 44–73

`UserPool` is the TallyNest user directory. Important choices include:

- users sign in with email;
- Cognito verifies email addresses;
- password length is at least 12 with uppercase, lowercase, number, and symbol requirements;
- account recovery uses verified email;
- updated email addresses must be verified;
- Cognito's default email sender is used;
- the pool uses the `ESSENTIALS` feature tier.

`MfaConfiguration: 'OFF'` applies to TallyNest application users in this Cognito pool. It does
**not** disable or replace MFA for the AWS root user or AWS administrator identities. AWS account
MFA is a separate AWS-001 requirement.

### App client: lines 75–106

`UserPoolClient` represents the Android application in Cognito.

- The OAuth authorization-code flow is enabled.
- The scopes request OpenID identity plus email and profile information.
- Access and ID tokens last 60 minutes.
- Refresh tokens last 30 days.
- Token revocation is enabled.
- `GenerateSecret: false` is intentional: a mobile application cannot safely keep a client secret.
- Callback and logout URLs come from the validated parameters.
- User-existence errors are hidden to reduce account-enumeration information.

The approved mobile design uses authorization code with PKCE. PKCE behavior is completed by the
Android client; this CloudFormation resource establishes the compatible public app client.

### Domain and managed login: lines 108–121

`UserPoolDomain` creates a Cognito-hosted domain. The AWS account ID makes the prefix more likely to
be unique. `ManagedLoginVersion: 2` selects managed login, and `ManagedLoginBranding` applies the
Cognito-provided visual defaults.

`DependsOn: UserPoolDomain` forces branding creation to wait for the domain. CloudFormation often
infers dependencies from `!Ref` or `!GetAtt`, but `DependsOn` makes an additional ordering rule
explicit.

### HTTP API: lines 123–153

`HttpApiAccessLogGroup` retains API access logs for 14 days. The JSON log format records request ID,
route, status, response length, and integration error. It intentionally avoids request bodies,
tokens, and financial data.

`HttpApi` creates the API Gateway HTTP API:

- the default JWT authorizer trusts tokens issued by this Cognito pool;
- the token audience must match the Android app client;
- every attached route inherits the authorizer unless explicitly overridden;
- the API allows a burst of 20 requests and a sustained rate of 10 requests per second;
- detailed route metrics are disabled for the low-cost development baseline;
- warnings cause processing to fail instead of being silently ignored;
- the stage name is `development`.

Authentication proves which Cognito user sent a valid token. Backend code must still perform
authorization: every data operation must enforce that the user owns the requested ledger, expense,
or receipt.

### Exercise

Trace the values used to validate an API token. Identify where the issuer and audience come from,
then explain why possessing any valid Cognito token should not automatically grant access to every
expense.

## Module 5 — DynamoDB application data

### Table definition: lines 155–194

`ApplicationTable` is one DynamoDB table for multiple TallyNest entity types. This is called a
single-table design. It does not mean all records have the same shape; it means related access
patterns share a key structure.

The primary key has two string attributes:

- `PK` — partition key (`HASH` in CloudFormation terminology);
- `SK` — sort key (`RANGE` in CloudFormation terminology).

Together they uniquely identify an item. The design document defines patterns for users, ledgers,
expenses, idempotency records, AI jobs, and other entities. The template creates only the physical
key capability; application code must generate and validate the actual values.

### Global secondary index

`GSI1` has its own `GSI1PK` and `GSI1SK`. A global secondary index provides another query path when
the base `PK`/`SK` ordering cannot answer a required query efficiently. `ProjectionType: ALL` copies
all item attributes into the index, trading additional storage/write cost for simpler indexed reads.

### Capacity, recovery, encryption, and expiry

- `PAY_PER_REQUEST` charges by request instead of reserving throughput, which fits uncertain MVP
  traffic but still requires budget monitoring.
- Server-side encryption is enabled.
- Point-in-time recovery is configurable and defaults to off for the development cost baseline.
- TTL uses the `expiresAt` attribute. DynamoDB may delete expired items asynchronously; TTL is not
  an exact scheduler.
- Tags identify the project and environment.

The table definition alone does not enforce tenant isolation. Isolation comes from authenticated
identity mapping, carefully constructed keys, conditional writes, and tests in later tickets.

### Exercise

Draw a hypothetical item with `PK`, `SK`, `GSI1PK`, `GSI1SK`, and `expiresAt` fields. Do not change
the template. Explain which pair supports the primary query and which pair supports the alternate
query.

## Module 6 — Private receipt storage

### S3 bucket: lines 196–221

`ReceiptBucket` stores receipt objects separately from DynamoDB records.

- AES-256 server-side encryption is the bucket default.
- All four S3 public-access-block controls are enabled.
- `BucketOwnerEnforced` disables ACL-based ownership and keeps policy-based access control.
- Incomplete multipart uploads are aborted after one day to avoid abandoned storage parts.
- CloudFormation generates the physical bucket name because `BucketName` is not hard-coded.

The bucket has no public website configuration and no public-read policy. Application access is
intended to use tightly scoped backend permissions and short-lived presigned URLs in later work.

### Bucket policy: lines 223–239

`ReceiptBucketPolicy` contains an explicit deny rule when `aws:SecureTransport` is false. In plain
language: S3 must reject access attempted without HTTPS/TLS, even if another policy would otherwise
allow the operation.

The policy covers both the bucket ARN and every object below it. The Lambda IAM roles narrow their
own permissions further to the `receipts/*` object prefix.

### Lifecycle warning

The current rule only cleans up unfinished multipart upload parts. It does not delete completed
receipt images. Receipt retention, account deletion, abandoned completed uploads, and reconciliation
remain application/operations responsibilities.

### Exercise

Find the controls that prevent public access and the separate control that denies insecure
transport. Explain why encryption, private access, and HTTPS solve different security problems.

## Module 7 — Asynchronous AI work with SQS

### Why a queue exists

AI processing can take longer and fail more often than a normal API request. The API accepts work,
stores its state, and sends a small job message. A worker processes it later.

```text
Android app
    │ POST an AI request
    ▼
API Gateway → AiRequestFunction
                    │ reserve allowance and store job
                    ▼
                  AiQueue
                    │ event source mapping
                    ▼
               AiWorkerFunction → AI provider
                    │
                    ▼
              update job/draft in DynamoDB
```

The queue separates request latency from processing latency and buffers temporary bursts. It also
means delivery can be repeated, so the worker must be idempotent.

### Dead-letter queue: lines 241–251

`AiDeadLetterQueue` keeps messages that could not be processed after the configured attempts. Its
14-day retention window provides time for diagnosis and controlled recovery. Server-side encryption
uses SQS-managed keys.

### Main queue: lines 253–268

- Messages are retained for four days (`345600` seconds).
- Long polling waits up to 20 seconds, reducing empty receives.
- `VisibilityTimeout: 180` hides a delivered message for three minutes while it is processed.
- After three receives, the redrive policy sends the message to the DLQ.
- SQS-managed server-side encryption is enabled.

The worker timeout is 60 seconds while visibility is 180 seconds. The longer visibility window
reduces the chance that a still-running invocation becomes visible to a second worker. It does not
guarantee exactly-once delivery.

### Exercise

Describe what happens when the worker receives the same message three times and fails every time.
Identify the two template properties that control this path and the operational action still needed
after the message reaches the DLQ.

## Module 8 — Logs and least-privilege IAM

### Log groups: lines 270–292

Each Lambda function has an explicitly named CloudWatch log group with 14-day retention. Explicit
retention prevents logs from being kept indefinitely by default and makes expected log locations
reviewable.

Logs must contain diagnostic metadata, not access tokens, receipt content, secrets, or unnecessary
financial details. A log group controls storage and retention; application code controls what is
written.

### Trust policies versus permission policies

Each IAM role has two distinct ideas:

1. The **trust policy** allows the Lambda service to assume the role.
2. The inline **permission policy** says what the Lambda function may do after assuming it.

The shared trust policy appears once using the YAML anchor. Permissions remain separate because the
functions have different responsibilities.

| Role                    | Main permissions                                                         | Deliberately absent examples                           |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `ApiFunctionRole`       | Logs, DynamoDB CRUD/query/transactions, receipt-object read/write/delete | SQS worker receive permissions; account-wide S3 access |
| `AiRequestFunctionRole` | Logs, selected DynamoDB operations, send to AI queue                     | Receipt reads; queue receive/delete                    |
| `AiWorkerFunctionRole`  | Logs, selected DynamoDB updates, receipt reads, consume AI queue         | Receipt writes/deletes; arbitrary S3 access            |
| `CleanupFunctionRole`   | Logs, selected DynamoDB cleanup, receipt delete, queue send              | Receipt read/write; queue consumption                  |

Resource ARNs restrict permissions to this table, its indexes, this queue, this bucket prefix, and
the function's own log group. This is **least privilege**: grant the operations and resources needed
for one responsibility, not a broad administrator policy.

IAM permissions do not replace application authorization. IAM can restrict a function to one table,
but the function must still restrict a user to their own records inside that table.

### Exercise

Choose one Lambda role and compare its policy with the function's purpose. Identify one permission
it needs and one permission correctly omitted. Verify both against the actual action list.

## Module 9 — Lambda functions and event sources

### Shared build shape

All four functions load code from `../apps/backend/dist`. `CodeUri` is relative to the template's
location. The build produces bundles named for their handlers.

For example:

```yaml
Handler: api.handler
```

means the runtime loads the `api` bundle and invokes its exported `handler` function. The exact
bundle extension and module format are build concerns documented in the local SAM runbook.

### Function inventory

| Function            | Trigger                             | Purpose                                  |  Memory | Timeout | Reserved concurrency |
| ------------------- | ----------------------------------- | ---------------------------------------- | ------: | ------: | -------------------: |
| `ApiFunction`       | Any `/v1/{proxy+}` HTTP method/path | Normal authenticated API routes          |  256 MB |    15 s |                    5 |
| `AiRequestFunction` | Two explicit POST routes            | Validate and accept AI work              |  256 MB |    15 s |                    2 |
| `AiWorkerFunction`  | SQS messages, batch size 1          | Process AI jobs asynchronously           | 1024 MB |    60 s |                    2 |
| `CleanupFunction`   | Schedule every 15 minutes           | Reconcile abandoned receipts and AI work |  256 MB |    30 s |                    1 |

Reserved concurrency is both a capacity boundary and a cost/safety guardrail. It also reserves part
of the account's Lambda concurrency pool. These small values fit development; future measurements
should drive changes.

### API functions

`ApiFunction` uses an `ANY` proxy route, so application code performs internal method/path routing.
`AiRequestFunction` has explicit quick-entry and receipt-draft POST routes. Both connect to the same
authenticated `HttpApi`.

### SQS worker

The AI worker receives one message per invocation. `MaximumConcurrency: 2` limits simultaneous
queue-driven invocations. `ReportBatchItemFailures` supports reporting failed records, although a
batch size of one keeps the initial behavior simple.

### Scheduled cleanup

The cleanup function is invoked every 15 minutes. Event retry is limited to two retries and events
older than one hour are discarded by the event-delivery policy. Cleanup code must remain safe when
run more than once.

### Exercise

Starting from each `Events` block, name the AWS service that initiates the invocation. Then find the
corresponding TypeScript handler under `apps/backend/src/handlers`.

## Module 10 — Outputs, workflows, cost, and limits

### Outputs: lines 522–540

After deployment, CloudFormation exposes:

- the development API base URL;
- AWS Region;
- Cognito managed-login domain;
- Cognito user-pool client ID;
- Cognito user-pool ID; and
- receipt bucket name.

These values are identifiers or endpoints needed by the Android client and deployment checks. They
are not passwords or API keys. An output can still reveal infrastructure information, so outputs
should be limited to values with a real consumer.

### Local versus deployed behavior

| Workflow                               | What it proves                                                             | What it does not prove                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `sam validate --lint`                  | Template structure and lint rules are acceptable to the installed tooling. | That AWS will create every resource in this account and Region.              |
| `pnpm build`                           | TypeScript Lambda bundles can be produced.                                 | That those bundles have correct business behavior.                           |
| `sam build`                            | SAM can prepare local deployment artifacts.                                | That CloudFormation permissions and service quotas are sufficient.           |
| `sam local start-api`                  | API-to-Lambda routing and runtime loading work locally in Docker.          | Cognito, IAM, DynamoDB, S3, SQS, EventBridge, and CloudWatch cloud behavior. |
| CloudFormation change set              | Proposed AWS additions, changes, and replacements are reviewable.          | Correct runtime behavior after execution.                                    |
| Authorized deployment plus smoke tests | Real resources and critical integrations work in development.              | Production readiness by itself.                                              |

The successful LAN call returning `{"code":"NOT_IMPLEMENTED"}` is good BE-003 evidence: routing,
Docker, Lambda loading, and the scaffold handler worked. The `501` response also honestly states
that expense functionality is not implemented yet.

### Cost-aware choices

The template uses on-demand DynamoDB, small Lambda concurrency limits, finite log retention, short
SQS retention, no VPC, no NAT Gateway, and no load balancer. These choices reduce fixed development
cost and operational complexity. They do not make the stack free.

Costs can still come from Cognito tier/usage, API requests, Lambda duration, DynamoDB requests and
storage, S3 objects and transfers, SQS, logs, backups, and taxes. Free Tier or credits depend on the
account and current AWS terms. AWS-001 requires budgets and verified eligibility before deployment.

### Important limitations and future checks

- Application handlers are still placeholders.
- No deployed integration test has proven Cognito JWT behavior or IAM policies.
- DynamoDB ownership/isolation rules still need application code and automated tests.
- S3 completed-object retention and account deletion policy are not finished.
- DLQ alarms and recovery procedures are later readiness work.
- The AI provider secret and allowance controls are intentionally absent for now.
- Point-in-time recovery defaults to off in development and must be an explicit deployment choice.
- Resource deletion and retention behavior must be reviewed before any important data exists.

### Exercise

Classify each output as a URL, Region, ID, or resource name. Then explain why a DeepSeek API key
must not be added to this section.

## Complete architecture walkthrough

### Sign-in and ordinary API request

```text
1. Android opens Cognito managed login.
2. Cognito authenticates the user and redirects to the approved app deep link.
3. Android receives tokens through the authorization-code/PKCE flow.
4. Android calls API Gateway with a bearer access token.
5. API Gateway validates issuer and audience using the Cognito JWT authorizer.
6. API Gateway invokes ApiFunction.
7. ApiFunction maps the authenticated identity and enforces record ownership.
8. ApiFunction reads or changes DynamoDB and, when required, private S3 receipts.
9. The function returns an API response; operational metadata goes to CloudWatch Logs.
```

Steps 7–9 describe intended later implementation. The template supplies the infrastructure and
permissions but not those business rules.

### AI request

```text
1. Android sends an authenticated POST request.
2. API Gateway invokes AiRequestFunction.
3. The function validates input, reserves allowance, stores request state, and sends an SQS message.
4. The API returns an accepted/pending response without waiting for the AI provider.
5. SQS invokes AiWorkerFunction.
6. The worker processes the job and writes a normalized draft or failure state.
7. Android later polls for the result.
8. Repeated failures move the message to the DLQ for operator attention.
```

The template implements only the infrastructure connections. Allowance accounting, idempotency,
provider calls, schema validation, polling, and reconciliation are later backend tickets.

## Diagnostic and review questions

Answer these without looking at the explanations first, then verify against the template:

1. What is the difference between SAM and CloudFormation?
2. Does `sam local start-api` create Cognito or DynamoDB resources?
3. Why does the Android Cognito client have no generated secret?
4. What is the difference between authentication and record authorization?
5. Why are both `PK` and `SK` required?
6. What happens after an AI queue message fails three receives?
7. Why is the SQS visibility timeout longer than the worker timeout?
8. What is the difference between an IAM trust policy and permission policy?
9. Why can a successful `501 NOT_IMPLEMENTED` response be useful evidence?
10. Which template choices reduce cost without guaranteeing a zero bill?

## Review rubric

| Level                    | Evidence                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Beginning                | Can locate sections and identify the AWS service created by each major resource.                                                |
| Developing               | Can explain `Ref`, `Sub`, `GetAtt`, triggers, and the main request/data flows.                                                  |
| Proficient               | Can explain security boundaries, retry behavior, cost controls, and local-test limits.                                          |
| Ready for the next topic | Can review a proposed template change and identify affected resources, permissions, costs, failure paths, and validation steps. |

## Completion criteria

You have completed this guide when you can:

- describe the stack from Android sign-in through Lambda and storage;
- explain every top-level template section;
- identify each Lambda trigger and role;
- distinguish local validation, change-set review, and deployment;
- explain at least five security controls and five cost/reliability controls; and
- answer at least 8 of the 10 review questions accurately.

## Glossary

| Term               | Meaning in this project                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| ARN                | Structured AWS identifier used heavily in IAM policies.                    |
| CloudFormation     | AWS service that creates and updates a stack from a template.              |
| Stack              | The group of resources CloudFormation manages together.                    |
| SAM                | Serverless extension that expands concise resources into CloudFormation.   |
| Logical ID         | Template-local resource name such as `AiQueue`.                            |
| Physical name      | Actual deployed service name, often based on the stack name.               |
| Parameter          | Deployment-time input with validation rules.                               |
| Condition          | Boolean rule used to choose template behavior.                             |
| Event source       | Service or route that invokes a Lambda function.                           |
| JWT                | Signed token whose issuer and audience API Gateway validates.              |
| PK/SK              | DynamoDB partition and sort keys.                                          |
| GSI                | Alternate DynamoDB query index.                                            |
| TTL                | Attribute-based asynchronous item expiration.                              |
| DLQ                | Queue holding repeatedly failed messages for investigation.                |
| Visibility timeout | Period during which a received SQS message is hidden from other consumers. |
| IAM role           | Temporary identity and permission set assumed by a Lambda function.        |
| Least privilege    | Grant only the actions on resources required for one responsibility.       |
| Change set         | Preview of CloudFormation changes before execution.                        |

## Suggested next topics

Study these one at a time after this guide:

1. DynamoDB single-table access patterns for TallyNest.
2. OAuth authorization code with PKCE in React Native.
3. API Gateway JWT claims and server-side ownership enforcement.
4. Idempotent SQS workers and DLQ recovery.
5. CloudFormation change-set review and safe rollback.
