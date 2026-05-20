# One Pager

## Summary

AccessOwl Playwright Automation is a local TypeScript/Playwright integration demo for SaaS access workflows where SCIM or complete admin APIs are unavailable. It uses a self-hosted Appsmith instance as the owned target and keeps the automation observable, reversible, and bounded.

## What It Demonstrates

- service-account style login with saved Playwright auth state
- user/access sync shape from browser-visible state
- dry-run invite and deprovision commands
- screenshots, traces, logs, and audit-style JSON
- same-origin network observation on the owned target
- OpenAI-assisted selector repair with Zod validation

## Why Appsmith

Appsmith gives the project a real SaaS-like UI without touching a third-party system. It has login, workspaces, applications, dynamic routes, modals, and API calls. That makes it a useful local target for testing browser automation behavior safely.

## AccessOwl Relevance

AccessOwl describes provisioning for apps where SCIM/SAML or complete APIs are not available. This project models the same engineering shape:

- authenticate as an integration account
- reuse browser state safely
- normalize what the UI exposes
- guard writes with dry-run and confirmation
- capture evidence for audit/debugging
- observe browser network calls only on the owned target
- use OpenAI only after deterministic locators fail

## Main Smoke Path

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
npm run appsmith:sync-users
npm run appsmith:api-replay-sync
npm run appsmith:broken-selector-demo
```

## Engineering Choices

- Prefer role/text/test-id locators before brittle CSS.
- Store auth state locally and keep it out of Git.
- Treat page text as untrusted input.
- Treat OpenAI output as a proposal, not executable authority.
- Save traces/screenshots because browser automation failures are often visual.
- Limit API observation/replay to the owned local Appsmith instance.
