# TallyNest

TallyNest is an Android-first private expense-tracking MVP. The repository currently contains the
product documentation and the backend workspace foundation.

## Backend prerequisites

- Node.js `24.14.0` (the Node 24 LTS line)
- pnpm `11.19.0`

The exact pnpm version is locked in `package.json`; the Node version is recorded in `.nvmrc` and the
package engine constraints.

Local infrastructure checks also require the AWS SAM CLI. Docker is needed only when a future
handler adds a native dependency that must be built in the Lambda-compatible container.

## Backend setup and verification

```sh
pnpm install --frozen-lockfile
pnpm check
```

For the first install, before `pnpm-lock.yaml` exists, run `pnpm install`. The aggregate check
verifies formatting, linting, TypeScript, unit tests, bundling, and committed-file secret scanning.
It does not require an AWS account and does not deploy anything.

## SAM development stack

The root [`template.yaml`](template.yaml) defines the single TallyNest development stack in
`ap-southeast-1`. It contains the Cognito login, authenticated HTTP API, four Lambda functions,
DynamoDB table, private receipt bucket, AI queue and dead-letter queue, cleanup schedule, log
groups, and handler-specific IAM roles.

Build the backend bundles and validate/build the stack locally without contacting AWS or deploying:

```sh
pnpm sam:validate
pnpm sam:build
```

The `development` settings in [`samconfig.toml`](samconfig.toml) require change-set confirmation for
a future deployment. Deployment remains blocked on AWS-002 and explicit user approval. Point-in-time
recovery is represented by the `EnablePointInTimeRecovery` parameter and remains off until its
regional cost is reviewed.

See [`apps/backend/README.md`](apps/backend/README.md) for package boundaries and local
configuration.
