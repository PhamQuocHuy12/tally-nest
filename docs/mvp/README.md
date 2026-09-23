# TallyNest MVP documentation

This folder is the working source of truth for planning the first release.

## Documents

- [Phase 1 MVP](phase-1-mvp.md) — confirmed scope, product rules, user journeys, and acceptance
  criteria.
- [Project plan](project-plan.md) — ordered planning and delivery phases, dependencies, validation,
  and decision gates.
- [Open decisions](open-decisions.md) — choices that must be made before they are encoded in the
  technical design.
- [Technical design](technical-design.md) — proposed mobile, API, data, receipt, AI, security, and
  AWS implementation contracts for review.
- [Backend backlog](backlog/README.md) — ordered backend and AWS Console tickets with dependencies
  and acceptance evidence.
- [Two-PC AWS SAM local runbook](sam-two-pc-local-runbook.md) — install, run, test, troubleshoot,
  and safely clean up a LAN-based SAM host.
- [Product engineering progress](../product-engineering-progress.md) — current lifecycle phase and
  evidence.

## Status

Planning and local implementation are underway. The TypeScript backend workspace foundation exists;
no cloud resources, provider configuration, or deployment has been created.

The first-release client is an Android React Native application. iOS and web clients are confirmed
future updates and are not part of the MVP implementation or release gate.

The approved product name is **TallyNest**, with the working tagline **Your spending, clearly
organized.** The MVP is private and useful for one person. Couple or household sharing remains out
of scope until its ownership and privacy rules are explicitly approved.
