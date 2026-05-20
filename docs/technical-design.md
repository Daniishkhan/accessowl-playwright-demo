# Technical Design

## Objective

Build a focused browser automation scaffold that resembles a small AccessOwl integration worker. The system automates a self-hosted Appsmith instance to exercise real SaaS integration problems without touching a third-party target.

```txt
npm command
-> CLI
-> Appsmith config
-> Playwright browser session
-> deterministic workflow
-> evidence bundle
-> optional network observation
-> optional OpenAI selector repair
```

## Architecture

```txt
packages/cli
  command parsing and user-facing scripts

packages/integrations-appsmith
  bootstrap, setup check, signup, login, auth check, sync, invite, deprovision,
  API observation, broken-selector demo

packages/core
  Zod schemas, evidence writer, redaction, browser session factory,
  action-plan validation, OpenAI planner adapter

scripts/scenarios
  small Playwright scripts that exercise individual browser automation behaviors

deploy/appsmith
  local owned SaaS target
```

## Core Workflows

**Bootstrap**

- Runs after Docker Compose has started the Appsmith container.
- Waits for Appsmith readiness.
- Reuses valid Playwright auth state when present.
- Creates the first local admin on a fresh volume.
- Falls back to login when an admin already exists.
- Verifies the browser lands on `/applications`.

**Setup check**

- Reads `APPSMITH_BASE_URL`.
- Waits for the local Appsmith HTTP target to become ready.
- Writes a small evidence record.

**Signup admin**

- Bootstraps the first local Appsmith account from `.env`.
- Exists for local development only.
- Handles Appsmith's first-admin onboarding screens.
- Saves `storageState` only after Appsmith reaches the authenticated application surface.

**Login and auth check**

- Navigates to `/user/login`.
- Uses robust field targeting: label, placeholder, textbox role, then input type fallback.
- Saves `playwright/.auth/appsmith-admin.json`.
- Refuses false-positive auth if the browser remains on `/user/login`.

**User/access sync shape**

- Navigates to likely admin/user areas or applications home.
- Extracts visible emails, statuses, roles, and groups when present.
- Normalizes with `NormalizedUserSchema`.
- Produces evidence even when the local instance has no users/apps to sync.

**Guarded write flows**

- Invite and deprovision support `--dry-run`.
- Deprovision requires `--confirm` for non-dry-run execution.
- Inputs come from CLI flags, not from model output.

**Network observation**

- Records relevant Appsmith request metadata from Playwright.
- Redacts headers before writing JSON.
- Limits replay/observation to same-origin owned Appsmith traffic.

**Broken selector demo**

- Uses an Appsmith-like fixture page.
- Intentionally tries an outdated selector.
- Captures a redacted snapshot.
- Calls OpenAI structured output if `OPENAI_API_KEY` exists.
- Falls back to a deterministic fixture plan when no key is configured.
- Validates every action with Zod and safety rules before execution.

## Public Interfaces

Root commands:

```bash
npm run appsmith:start
npm run appsmith:bootstrap
npm run appsmith:setup-check
npm run appsmith:signup-admin
npm run appsmith:login
npm run appsmith:auth-check
npm run appsmith:sync-users
npm run appsmith:invite -- --email demo-user@example.com --role viewer --dry-run
npm run appsmith:deprovision -- --email demo-user@example.com --confirm --dry-run
npm run appsmith:api-replay-sync
npm run appsmith:broken-selector-demo
```

Scenario scripts:

```bash
SCENARIO_HEADLESS=true npm run scenario:auth-check
SCENARIO_HEADLESS=true npm run scenario:applications
SCENARIO_HEADLESS=true npm run scenario:ensure-demo-app
SCENARIO_HEADLESS=true npm run scenario:locator-resilience
SCENARIO_HEADLESS=true npm run scenario:evidence
SCENARIO_HEADLESS=true npm run scenario:network-observation
SCENARIO_HEADLESS=true npm run scenario:selector-repair
```

Zod-backed types:

- `AppsmithConfig`
- `NormalizedUser`
- `AuditEvent`
- `EvidenceBundle`
- `ActionPlan`

## Evidence Layout

```txt
evidence/runs/<run-id>/
  run.json
  audit-event.json
  inputs.redacted.json
  trace.zip
  screenshots/
  network/
  llm/

evidence/scenarios/<run-id>/
  run.json
  trace.zip
  screenshots/
  network-observed.json
```

Evidence is intentionally ignored by Git.

## Edge Cases

- Appsmith CE editions can expose different user/role surfaces.
- A fresh Appsmith instance may have no apps; scenario scripts handle empty and populated states.
- Session expiry redirects to login and should fail clearly.
- SPA routes may render before network data is complete.
- Modals and overlays can intercept clicks.
- LLM outputs may use non-JavaScript regex syntax; the executor normalizes safe cases and rejects unsafe plans.
