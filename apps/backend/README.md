# TallyNest backend

This package is the TypeScript modular monolith for the TallyNest Lambda backend. It builds four
fail-closed placeholder entry points: HTTP API, AI request acceptance, AI worker, and scheduled
cleanup. Their business behavior is added by later backlog tickets.

## Boundaries

- `transport/http`: request parsing and stable HTTP response mapping.
- `application`: use-case orchestration grouped by capability.
- `domain`: framework-independent business rules and value objects.
- `ports`: narrow contracts owned by application/domain code.
- `adapters`: AWS and external-provider implementations of ports.
- `handlers`: thin Lambda composition roots.
- `config`: startup configuration parsing and validation.

Dependencies point inward: handlers and adapters may depend on application, ports, and domain;
domain code does not depend on AWS, Lambda, transport, or provider libraries.

## Local configuration

Copy `.env.example` only when a local tool needs an environment file. Do not put credentials or
provider keys in committed files. Configuration is validated with Zod through `loadConfig`.

AWS resource names are injected by the SAM stack. No provider secret is part of the template; the AI
worker receives secret access only after the separate AWS-003 configuration ticket is approved.
