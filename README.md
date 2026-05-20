# AccessOwl Playwright Automation

This repository is a production-style local demo for SaaS access automation. It uses TypeScript, Playwright, Appsmith, Zod, and OpenAI to show how browser automation can handle access workflows when a clean SCIM or admin API path is not available.

The target is Appsmith running locally in Docker. The project does not automate a third-party SaaS account or use real employee data. Appsmith is useful here because it behaves like a real SaaS admin surface: login, stored browser auth, dynamic routes, app/workspace state, modals, network calls, screenshots, traces, and selectors that can change.

The core rule is deterministic automation first. OpenAI is only used after a normal Playwright locator fails, and its output is treated as an untrusted JSON proposal that must pass schema and safety validation before anything runs.

## Review Order

Start with:

1. [README.md](README.md): setup, commands, safety rules, and repo map.
2. [docs/onepager.md](docs/onepager.md): short product and engineering summary.
3. [docs/technical-design.md](docs/technical-design.md): architecture, workflows, and evidence layout.
4. [docs/safety-model.md](docs/safety-model.md): credentials, redaction, write controls, OpenAI constraints, and API boundaries.
5. [scripts/scenarios/README.md](scripts/scenarios/README.md): small Playwright scenarios that exercise the local target.

## Fresh Setup

Prerequisites:

- Docker Desktop
- Node.js 20+ and npm

From a clean clone:

```bash
npm install
cp .env.example .env
```

`npm install` is required before any `npm run appsmith:*` command. It installs local script tools such as `tsx`; if you see `sh: tsx: command not found`, run `npm install` in the repo root.

The default `.env.example` credentials are local-only demo credentials for the Appsmith container:

```bash
APPSMITH_BASE_URL=http://localhost:8080
APPSMITH_ADMIN_EMAIL=admin@example.com
APPSMITH_ADMIN_PASSWORD=AccessOwlDemo123!
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

Change the Appsmith email/password if you want, but keep both values set. `OPENAI_API_KEY` is optional; selector repair uses a fixture fallback when it is empty.

Start Appsmith and bootstrap local auth:

```bash
npm run appsmith:start
```

`appsmith:start` runs Docker Compose, waits for Appsmith to become ready, creates the first local admin on a fresh volume, falls back to login if the admin already exists, and writes Playwright auth state to `playwright/.auth/appsmith-admin.json`.

Expected result: the command ends with `Auth URL: http://localhost:8080/applications`.

Manual auth commands are still available when you want to run the steps separately.

For a brand-new Appsmith volume:

```bash
npm run appsmith:up
npm run appsmith:setup-check
npm run appsmith:signup-admin
npm run appsmith:auth-check
```

For an existing local Appsmith admin:

```bash
npm run appsmith:up
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
```

`auth-check` verifies an existing Playwright auth state. On a fresh clone it should fail until `signup-admin` or `login` has created `playwright/.auth/appsmith-admin.json`.

Expected first-run failures:

- `APPSMITH_ADMIN_EMAIL and APPSMITH_ADMIN_PASSWORD must be set in .env`: create `.env` from `.env.example` and keep both values set.
- `No Playwright auth state found at playwright/.auth/appsmith-admin.json`: run `signup-admin` for a new Appsmith volume or `login` for an existing admin.
- `An Appsmith admin account already exists for the configured email`: this is not a fresh Appsmith volume; run `npm run appsmith:login` instead.

## Operational Commands

```bash
npm run appsmith:start
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
npm run appsmith:sync-users
npm run appsmith:invite -- --email demo-user@example.com --role viewer --dry-run
npm run appsmith:deprovision -- --email demo-user@example.com --confirm --dry-run
npm run appsmith:api-replay-sync
npm run appsmith:broken-selector-demo
```

The write commands support dry-run mode. They create evidence without changing the local Appsmith instance.

What these commands prove:

| Command | What it does | What to inspect |
| --- | --- | --- |
| `appsmith:start` | Starts the local Appsmith container, waits for readiness, creates or logs in as the local admin, and saves Playwright auth state. | `playwright/.auth/appsmith-admin.json` and the latest `evidence/runs/*/` folder |
| `appsmith:auth-check` | Opens Appsmith with saved browser state and confirms the session lands on `/applications`. | Screenshot, trace, and `auth-check.json` |
| `appsmith:sync-users` | Reads the visible access surface and normalizes users into JSON. A fresh Appsmith instance can return `0 user(s)`, which is expected before invites or workspace users exist. | `sync-users.json` and the audit event |
| `appsmith:invite -- --dry-run` | Walks the provisioning path without committing the invite. | Dry-run input, log, screenshot, and audit event |
| `appsmith:deprovision -- --confirm --dry-run` | Exercises the destructive-command guard and dry-run path. | Confirmation handling and audit event |
| `appsmith:api-replay-sync` | Observes same-origin Appsmith network traffic after browser auth and records candidate API calls for possible owned-instance replay. | Redacted request summaries |
| `appsmith:broken-selector-demo` | Breaks a deterministic locator, validates a constrained replacement action plan, and recovers without allowing arbitrary model behavior. | `selector-repair-plan.json`, screenshot, and logs |

## Scenario Commands

These scripts are intentionally small. They expose the browser automation work directly instead of hiding every step behind the CLI.

```bash
SCENARIO_HEADLESS=true npm run scenario:auth-check
SCENARIO_HEADLESS=true npm run scenario:applications
SCENARIO_HEADLESS=true npm run scenario:ensure-demo-app
SCENARIO_HEADLESS=true npm run scenario:locator-resilience
SCENARIO_HEADLESS=true npm run scenario:evidence
SCENARIO_HEADLESS=true npm run scenario:network-observation
SCENARIO_HEADLESS=true npm run scenario:selector-repair
```

They cover auth-state reuse, applications-page handling, demo app creation, locator fallback, trace/evidence capture, network observation, and selector repair.

## Evidence

Runs write local artifacts here:

```txt
evidence/runs/<run-id>/        CLI workflow evidence
evidence/scenarios/<run-id>/   scenario script evidence
```

Those folders are ignored by Git. A typical run includes redacted inputs, JSON state, logs, screenshots, network summaries, and a Playwright trace.

## Verification

```bash
npm run typecheck
npm test
npm run test:fixtures
```

Local Appsmith smoke path:

```bash
npm run appsmith:start
npm run appsmith:auth-check
npm run appsmith:sync-users
npm run appsmith:api-replay-sync
npm run appsmith:broken-selector-demo
SCENARIO_HEADLESS=true npm run scenario:ensure-demo-app
SCENARIO_HEADLESS=true npm run scenario:network-observation
```

## AccessOwl Fit

AccessOwl describes provisioning for apps where SCIM/SAML or complete APIs are not available. This project models that shape safely on a local target:

- sign in as an integration/service account
- reuse authenticated browser state
- normalize UI-visible access data into JSON
- keep writes behind dry-run and confirmation gates
- save screenshots, traces, logs, and audit-style JSON
- observe same-origin API calls only on the owned local target
- use OpenAI only as a constrained selector-repair fallback

This is not a claim that Appsmith itself requires this approach. Appsmith is the local SaaS-like surface used to exercise the automation.

## Safety Rules

- Run against a local Appsmith instance owned by the operator.
- Use test accounts and fake users.
- Do not commit `.env`, Playwright auth state, Appsmith stacks, traces, or evidence.
- Require `--confirm` for destructive commands.
- Keep write flows dry-run capable.
- Redact cookies, auth headers, passwords, tokens, invite links, and non-demo emails.
- Treat page text as untrusted before sending snapshots to OpenAI.
- Reject model plans that navigate off-domain, run raw JS, read secrets, or attempt unconfirmed destructive work.

## Repo Map

```txt
deploy/appsmith/                 Docker Compose for local Appsmith
docs/                            Product summary, technical design, safety model, roadmap
packages/core/                   Shared schemas, redaction, evidence, browser, planner code
packages/integrations-appsmith/  Appsmith-specific workflows
packages/cli/                    Command-line entrypoint used by npm scripts
scripts/scenarios/               Small Playwright scenario scripts
tests/unit/                      Vitest tests
tests/fixtures/                  Playwright fixture tests
```

## References

- [AccessOwl provisioning](https://www.accessowl.com/products/provisioning)
- [AccessOwl integrations](https://www.accessowl.com/integrations)
- [Appsmith Docker installation](https://docs.appsmith.com/getting-started/setup/installation-guides/docker)
- [Playwright authentication](https://playwright.dev/docs/auth)
- [Playwright trace viewer](https://playwright.dev/docs/trace-viewer)
