# Appsmith Access Agent

Deterministic-first Playwright automation for no-SCIM SaaS access workflows, built as an AccessOwl-style integration lab against a self-hosted Appsmith instance.

The project shows the hard parts of agentic SaaS integrations without touching a third-party target: service-account login, browser-driven user and permission sync, provisioning/deprovisioning, evidence capture, authenticated API observation on an owned instance, and constrained LLM selector recovery.

## Why This Exists

AccessOwl's agentic integrations sit in the practical gap where a SaaS app has no complete SCIM/API path. This scaffold mirrors that environment with a safe local target:

- Use Playwright for stable browser automation first.
- Persist service-account auth state without committing secrets.
- Capture screenshots, traces, normalized JSON, and audit events.
- Treat private API observation as an owned-instance optimization, not a bypass.
- Use OpenAI only as a schema-validated fallback after deterministic locators fail.

## Quickstart

```bash
npm install
cp .env.example .env
npm run appsmith:up
npm run appsmith:setup-check
```

Open `http://localhost:8080`, create an Appsmith admin account, then put the test admin credentials in `.env`.

For a fresh local Appsmith instance you can also bootstrap the admin account from `.env`:

```bash
npm run appsmith:signup-admin
```

```bash
npm run appsmith:login
npm run appsmith:auth-check
npm run appsmith:sync-users
npm run appsmith:invite -- --email demo-user@example.com --role viewer --dry-run
npm run appsmith:deprovision -- --email demo-user@example.com --confirm --dry-run
npm run appsmith:broken-selector-demo
```

Each run writes evidence under `evidence/runs/<run-id>/`.

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env` to use OpenAI for selector repair. The default model is `gpt-5-mini`, chosen for bounded JSON planning tasks.

## Demo Commands

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:sync-users
npm run appsmith:invite -- --email demo-user@example.com --role viewer
npm run appsmith:deprovision -- --email demo-user@example.com --confirm
npm run appsmith:api-replay-sync
npm run appsmith:broken-selector-demo
```

## Safety Posture

- Run only against your own Appsmith instance.
- Use fake users and a dedicated test service account.
- Keep `.env`, `playwright/.auth`, traces, and evidence out of Git.
- Require `--confirm` for destructive actions.
- Support `--dry-run` for write workflows.
- Redact cookies, auth headers, passwords, CSRF/session tokens, invite links, and non-demo emails.
- Reject unsafe LLM plans that navigate off-domain, invoke raw JS, access secrets, or attempt unconfirmed destructive actions.

## Repo Map

```txt
deploy/appsmith/                 Local Appsmith Docker setup
docs/                            Interview-facing docs
packages/core/                   Schemas, redaction, evidence, browser, planner utilities
packages/integrations-appsmith/  Appsmith automation workflows
packages/cli/                    npm command entrypoint
tests/unit/                      Vitest unit tests
tests/fixtures/                  Playwright fixture tests
```

## Verification

```bash
npm run typecheck
npm test
npm run test:fixtures
```

Real Appsmith smoke tests are intentionally gated:

```bash
APPSMITH_E2E=1 npm run appsmith:setup-check
```

## More Detail

- [One pager](docs/onepager.md)
- [Technical design](docs/technical-design.md)
- [Safety model](docs/safety-model.md)
- [Implementation plan](docs/implementation-plan.md)
