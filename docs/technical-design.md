# Technical Design

## Objective

Build a focused browser automation scaffold that resembles a miniature AccessOwl integration worker. Appsmith is the safe target because it is self-hostable, dynamic enough to expose real browser automation problems, and has admin/user-management flows suitable for sync and provisioning demos.

```txt
CLI command
-> Appsmith config
-> Playwright browser session
-> deterministic workflow
-> evidence bundle
-> optional API observation/replay
-> optional LLM selector recovery
```

## Architecture

```txt
packages/cli
  parses commands and flags

packages/integrations-appsmith
  login, setup check, sync, invite, deprovision, API observation, demos

packages/core
  schemas, redaction, evidence writer, browser factory, action-plan validation

deploy/appsmith
  owned local target

evidence/runs/<run-id>
  screenshots, logs, JSON, network summaries, LLM validation
```

## Workflows

**Setup check**

- Reads `APPSMITH_BASE_URL`.
- Requests the base URL and reports reachability.
- Does not require credentials.

**Login**

- Navigates to `/user/login`.
- Fills admin/service-account email and password from `.env`.
- Saves `playwright/.auth/appsmith-admin.json`.
- Refuses to save auth state if the page remains on login/signup.
- Writes login screenshots and redacted evidence.

**Signup admin**

- Navigates to `/user/signup`.
- Fills the first local admin account from `.env`.
- Saves `storageState` after Appsmith accepts the account.
- Exists only for local practice bootstrap.

**Auth check**

- Opens Appsmith with saved `storageState`.
- Fails if the browser is redirected to login/signup.

**User sync**

- Opens the user-management surface.
- Extracts emails, names, roles, groups, and status from tables or visible page text.
- Normalizes results with `NormalizedUserSchema`.
- Writes `users.json` and an audit event.

**Provisioning**

- Supports `--dry-run`.
- Opens the user-management area.
- Clicks invite/add-user controls through role/name locators.
- Fills only approved CLI inputs.
- Captures before/after state where possible.

**Deprovisioning**

- Requires `--confirm` unless `--dry-run` is used.
- Locates a row by email and clicks a bounded remove/deactivate/delete action.
- Captures before/after evidence and records the confirmation state.

**API observation/replay**

- Observes network traffic while loading user management.
- Saves redacted request metadata.
- Replays only same-origin, read-like `GET` requests from the owned Appsmith instance.
- Compares replay output to browser sync when possible.

**Broken selector demo**

- Uses a local Appsmith-like fixture page.
- Intentionally searches for an old selector.
- Captures a redacted page snapshot.
- Uses OpenAI structured output when `OPENAI_API_KEY` is set.
- Applies a fixture plan only when no model key is present, so local tests remain deterministic.
- Validates and executes only allowlisted actions.

## Public Interfaces

Zod-backed schemas:

- `AppsmithConfigSchema`
- `NormalizedUserSchema`
- `AuditEventSchema`
- `EvidenceBundleSchema`
- `ActionPlanSchema`

CLI commands:

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:sync-users
npm run appsmith:invite -- --email demo-user@example.com --role viewer --dry-run
npm run appsmith:deprovision -- --email demo-user@example.com --confirm
npm run appsmith:api-replay-sync
npm run appsmith:broken-selector-demo
```

## Edge Cases

- Session expiry redirects back to login.
- Tables may be virtualized or rendered late.
- Roles/groups may differ by Appsmith edition.
- Invite flows may require SMTP.
- LLM snapshots may include hostile page text.
- Network replay may require headers or CSRF values that should remain redacted.
