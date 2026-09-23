# Two-PC AWS SAM local runbook

## Purpose

This runbook explains how to run the TallyNest API with AWS SAM on one Windows computer and call it
from another computer on the same trusted private network. It also provides a safe shutdown and
cleanup procedure.

This workflow is for local development only. It does not deploy TallyNest, create AWS resources, or
prove that IAM, Cognito, DynamoDB, S3, SQS, or EventBridge will behave exactly as they do in AWS.

## Computer roles

Use these names throughout the guide:

- **PC A — caller:** the computer that sends HTTP requests.
- **PC B — SAM host:** the computer that stores a copy of TallyNest and runs Docker, AWS SAM CLI,
  and the local API.

```text
PC A
  │ HTTP over the trusted LAN
  ▼
PC B port 3000
  │
  ▼
SAM local API Gateway
  │
  ▼
Lambda container in Docker
  │
  ▼
TallyNest handler
```

Use a Windows **Private** network profile. Do not use this setup on public Wi-Fi, forward port 3000
through the router, or expose the SAM server to the internet.

## Prerequisites on PC B

Install:

- Git;
- Node.js `24.14.0`;
- pnpm `11.19.0`;
- Docker Desktop;
- AWS SAM CLI for Windows.

Use the official installation guidance:

- [Install AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Install Docker for AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-docker.html)

Open a new PowerShell window after installing the tools and verify them:

```powershell
git --version
node --version
pnpm --version
docker version
docker ps
sam --version
```

Docker Desktop must be running. `docker ps` may show no containers, but it must not report that the
Docker engine is unavailable.

AWS credentials are not required to start the local API. Do not copy production credentials to PC B
for this workflow. Some SAM validation operations may request AWS configuration; defer any
credential-dependent action to AWS-002.

## Put the project on PC B

Prefer cloning or pulling committed changes through Git. If Git transfer is not available, copy the
repository directory over the LAN.

Do not copy generated or machine-local directories:

```text
node_modules/
.pnpm-store/
.aws-sam/
apps/backend/dist/
coverage/
```

From the repository root on PC B, install the exact dependency graph and run the project checks:

```powershell
pnpm install --frozen-lockfile
pnpm check
```

Stop if either command fails. Do not weaken a test, lint rule, type check, or secret scan merely to
start SAM.

## Validate and build SAM

The SAM template is [`infra/template.yaml`](../../infra/template.yaml). The development
configuration is [`samconfig.toml`](../../samconfig.toml), with Singapore (`ap-southeast-1`) as the
configured region.

From the repository root on PC B, validate the template:

```powershell
sam validate --config-env development --lint --template-file infra/template.yaml
```

Build without deploying:

```powershell
pnpm build
sam build --config-env development --no-cached --template-file infra/template.yaml
```

`sam build` creates `.aws-sam/`. That directory is generated, ignored by Git, and safe to recreate.
AWS documents the build output and workflow in
[Introduction to building with AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-build.html).

Use `--no-cached` after changing handlers or bundler settings so that an older Lambda artifact is
not reused.

## Check the Lambda bundle format

The current SAM template mounts the contents of `apps/backend/dist/` as the Lambda task directory.
The bundles must therefore be directly loadable by the Lambda Node.js runtime.

If esbuild emits `.js` files without copying a nearby `package.json` containing `"type": "module"`,
build the Lambda bundles as CommonJS:

```js
format: 'cjs';
```

Then rebuild both layers:

```powershell
pnpm build
sam build --config-env development --no-cached --template-file infra/template.yaml
```

This prevents the known startup failure:

```text
Runtime.UserCodeSyntaxError
SyntaxError: Unexpected token 'export'
```

Do not repeatedly restart SAM when this error appears. It indicates a module-format mismatch, not a
network problem.

## Identify both LAN addresses

Run this on each PC:

```powershell
ipconfig
```

Find the IPv4 address for the active Ethernet or Wi-Fi adapter. Record the addresses without adding
them to the repository:

```text
PC A IPv4: <PC_A_IPV4>
PC B IPv4: <PC_B_IPV4>
```

These addresses may change if the router uses DHCP. Use a router-side DHCP reservation if PC B must
keep a stable address.

## Add the restricted firewall rule on PC B

Open PowerShell **as Administrator** on PC B. Allow inbound TCP port 3000 only from PC A:

```powershell
New-NetFirewallRule `
  -DisplayName "TallyNest SAM Local API" `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 3000 `
  -RemoteAddress <PC_A_IPV4> `
  -Profile Private
```

Replace `<PC_A_IPV4>` with PC A's actual private address. Do not use `Any`, `0.0.0.0/0`, or the
Public firewall profile.

Inspect the rule and its permitted address:

```powershell
Get-NetFirewallRule -DisplayName "TallyNest SAM Local API"
Get-NetFirewallRule -DisplayName "TallyNest SAM Local API" |
  Get-NetFirewallAddressFilter
```

The command is based on Microsoft's
[`New-NetFirewallRule` documentation](https://learn.microsoft.com/powershell/module/netsecurity/new-netfirewallrule).

## Start the local API on PC B

From the repository root:

```powershell
sam local start-api `
  --template-file .aws-sam/build/template.yaml `
  --host 0.0.0.0 `
  --port 3000
```

Keep the terminal open. `--host 0.0.0.0` binds the development server to PC B's network interfaces;
the Windows Firewall rule limits which LAN computer can reach it.

AWS documents `--host` and the default `127.0.0.1` binding in the
[`sam local start-api` reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-start-api.html).

Do not run this command with an unrestricted firewall rule.

## Test from PC A

First verify that PC B is listening:

```powershell
Test-NetConnection <PC_B_IPV4> -Port 3000
```

The expected result is:

```text
TcpTestSucceeded : True
```

Then call the TallyNest API:

```powershell
curl.exe -i http://<PC_B_IPV4>:3000/v1/expenses
```

During the scaffold stage, a successful Lambda startup returns an intentional response similar to:

```text
HTTP/1.1 501 NOT IMPLEMENTED
```

```json
{ "code": "NOT_IMPLEMENTED" }
```

This response proves that PC A reached PC B, SAM routed the request, Docker started the Lambda
runtime, and the API handler executed. It does not mean expense functionality is implemented.

## Troubleshooting

### `TcpTestSucceeded` is `False`

On PC B, verify:

1. SAM is still running.
2. The startup command used `--host 0.0.0.0`.
3. PC B's address is correct and has not changed.
4. Both PCs are on the same reachable private network.
5. The firewall rule permits PC A's current IPv4 address.
6. No other process is using port 3000.

Check the port on PC B:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

### HTTP `500 Internal Server Error`

An HTTP 500 from SAM normally means the network path worked but the Lambda failed. Read the SAM
terminal on PC B and find the first initialization or invocation error.

For this project, the known error below is an ESM/CommonJS mismatch:

```text
Failed to load the ES module
Runtime.UserCodeSyntaxError
SyntaxError: Unexpected token 'export'
```

Apply the CommonJS bundle setting described above, then run:

```powershell
pnpm build
sam build --config-env development --no-cached --template-file infra/template.yaml
```

Restart `sam local start-api` only after the rebuild succeeds.

### Docker or Lambda image failure

Verify Docker Desktop is running:

```powershell
docker version
docker ps
```

The first local invocation may download the Lambda runtime image and take longer. Do not interrupt
the download unless Docker reports a terminal failure.

### Source changes do not appear

Stop SAM and rebuild without cache:

```powershell
pnpm build
sam build --config-env development --no-cached --template-file infra/template.yaml
```

Then start the local API again. Never edit files under `.aws-sam/build`; SAM overwrites generated
artifacts.

## Shutdown and cleanup

### 1. Stop SAM

In the PC B terminal running SAM, press `Ctrl+C`. Wait for the command prompt to return.

### 2. Confirm the API port is closed

On PC A:

```powershell
Test-NetConnection <PC_B_IPV4> -Port 3000
```

The expected result after shutdown is:

```text
TcpTestSucceeded : False
```

### 3. Remove the firewall rule

On PC B, open an Administrator PowerShell window:

```powershell
Remove-NetFirewallRule -DisplayName "TallyNest SAM Local API"
```

Confirm that the rule is gone:

```powershell
Get-NetFirewallRule -DisplayName "TallyNest SAM Local API" -ErrorAction SilentlyContinue
```

No output is expected.

### 4. Check Docker

SAM normally stops its Lambda containers when it exits. Review the remaining running containers:

```powershell
docker ps
```

Do not run `docker system prune`, remove unrelated containers, or erase Docker's global data as part
of TallyNest cleanup.

### 5. Optionally remove generated SAM artifacts

Removing `.aws-sam` is optional. Do it when troubleshooting stale builds or reclaiming the generated
workspace. From the repository root on PC B:

```powershell
$projectRoot = (Resolve-Path -LiteralPath '.').Path
$expectedSamPath = Join-Path $projectRoot '.aws-sam'

if (Test-Path -LiteralPath $expectedSamPath) {
  $resolvedSamPath = (Resolve-Path -LiteralPath $expectedSamPath).Path
  if ($resolvedSamPath -ne $expectedSamPath) {
    throw "Unexpected SAM cleanup path: $resolvedSamPath"
  }
  Remove-Item -LiteralPath $resolvedSamPath -Recurse -Force
}
```

This deliberately validates the exact generated directory before deleting it. Do not delete the
repository, `apps/backend`, `infra/template.yaml`, `samconfig.toml`, or `pnpm-lock.yaml`.

`node_modules` and `apps/backend/dist` may remain for the next development session. They are ignored
by Git and can be reproduced when necessary.

## Repeatable session checklist

### Start

- [ ] PC A and PC B are on a trusted Private network.
- [ ] Docker Desktop is running on PC B.
- [ ] PC B has the current committed TallyNest code.
- [ ] `pnpm install --frozen-lockfile` succeeds on PC B.
- [ ] `pnpm check` succeeds.
- [ ] `pnpm build` succeeds.
- [ ] `sam build --config-env development --no-cached --template-file infra/template.yaml` succeeds.
- [ ] The firewall rule allows only PC A's current IPv4 address.
- [ ] SAM starts with `--host 0.0.0.0 --port 3000`.
- [ ] `Test-NetConnection` succeeds from PC A.

### Stop

- [ ] Stop SAM with `Ctrl+C`.
- [ ] Confirm port 3000 is closed.
- [ ] Remove the `TallyNest SAM Local API` firewall rule.
- [ ] Confirm no unexpected SAM container remains.
- [ ] Remove `.aws-sam` only when a clean rebuild is needed.

## Local-test limitations

SAM local is useful for Lambda and API request/response development, but it is not a complete AWS
environment. It does not by itself prove:

- Cognito managed-login behavior or production JWT enforcement;
- DynamoDB keys, conditions, transactions, TTL, or cross-user isolation;
- S3 bucket policies and presigned URL behavior;
- SQS retries, visibility timeout, dead-letter handling, or duplicate delivery;
- EventBridge scheduling and retry behavior;
- IAM least privilege;
- CloudWatch logs, metrics, alarms, or deployed concurrency limits.

AWS notes that local testing does not provide full fidelity for every cloud behavior. Use it for
fast feedback, then perform the authorized development-stack smoke test in AWS under AWS-004.
