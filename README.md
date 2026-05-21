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

This usually takes 1-2 minutes, depending on your machine. When it finishes, you should see output like this:

```text
Bootstrap mode: signup
Auth URL: http://localhost:8080/applications
Storage state: playwright/.auth/appsmith-admin.json
Evidence: /Users/danish/Desktop/accessowl-playwright-demo/evidence/runs/2026-05-21T001206207Z-pua06y
```

## Run The Appsmith Demo

This is the easiest command to watch before looking through the smaller scripts:

```bash
npm run demo:appsmith
```

It opens Appsmith in a headed Playwright browser, creates or reuses a local app named `Access Review Demo`, drags a Text, Table, Input, and Button widget onto the canvas, deploys the app, opens the deployed URL, and writes evidence under `evidence/scenarios/<run-id>/`.

The demo pauses briefly at the main screens so it is easy to follow without dragging on. The default pause is 3 seconds, with shorter 1-second pauses before the first drag and before exit. For a faster check:

```bash
DEMO_PAUSE_MS=0 npm run demo:appsmith
```

If you want it fully headless for CI-style validation:

```bash
DEMO_PAUSE_MS=0 SCENARIO_HEADLESS=true npm run demo:appsmith
```

Normal Chrome and Playwright do not share auth. If Chrome shows the Appsmith login page, that does not mean Playwright auth is broken; the demo uses `playwright/.auth/appsmith-admin.json`.

Manual auth commands are still available if you want to debug the setup step by step, but they are not needed for the normal demo path. Start with `npm run appsmith:start`, then run `npm run demo:appsmith`.

Expected first-run failures:

- `APPSMITH_ADMIN_EMAIL and APPSMITH_ADMIN_PASSWORD must be set in .env`: create `.env` from `.env.example` and keep both values set.
- `No Playwright auth state found at playwright/.auth/appsmith-admin.json`: run `signup-admin` for a new Appsmith volume or `login` for an existing admin.
- `An Appsmith admin account already exists for the configured email`: this is not a fresh Appsmith volume; run `npm run appsmith:login` instead.

## Smaller Checks

The repo still includes the earlier CLI and scenario scripts for auth reuse, network observation, selector repair, dry-run provisioning, and evidence writing. They are useful for code review, but the main walkthrough is now the Appsmith drag/drop demo above. See [scripts/scenarios/README.md](scripts/scenarios/README.md) or [package.json](package.json) if you want to run those pieces separately.

## Notion Workflow Recorder

`extensions/notion-workflow-recorder/` is a small browser extension spike for the browser-extension part of the AccessOwl role. It is closer to a real use case than a generic page snapshot: an admin clicks through a SaaS workflow once, and the extension records enough safe context to help build a durable Playwright integration.

The recorder captures:

- click, input, change, and submit events
- visible target text, labels, roles, and placeholders
- Playwright-friendly selector candidates
- redacted field values and URLs

It deliberately does not read cookies, browser storage, hidden secrets, or call any backend.

Manual smoke path:

1. Load `extensions/notion-workflow-recorder/` from `chrome://extensions`.
2. Open a Notion workspace you own and use dummy data only.
3. Start the recorder from the extension popup.
4. Click through a simple admin workflow, such as inviting a test member.
5. Stop before sending a real invite unless the address is safe.
6. Export the recording from the popup, then copy or download the JSON.

The extension cannot write into `evidence/runs/` because browser extensions do not have direct access to the repo filesystem. Use the popup output, `Copy JSON`, or `Download JSON` for manual smoke evidence. Do not commit real Notion screenshots, auth state, or exported recordings.

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
DEMO_PAUSE_MS=0 SCENARIO_HEADLESS=true npm run demo:appsmith
```

That path covers the important local flow: auth bootstrap, Appsmith editor automation, real widget drag/drop, deploy, deployed-page verification, and evidence capture. The smaller CLI/scenario scripts are still available for deeper code review.

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
extensions/notion-workflow-recorder/  Manual Notion workflow recorder extension
tests/unit/                      Vitest tests
tests/fixtures/                  Playwright fixture tests
```

## References

- [AccessOwl provisioning](https://www.accessowl.com/products/provisioning)
- [AccessOwl integrations](https://www.accessowl.com/integrations)
- [Appsmith Docker installation](https://docs.appsmith.com/getting-started/setup/installation-guides/docker)
- [Playwright authentication](https://playwright.dev/docs/auth)
- [Playwright trace viewer](https://playwright.dev/docs/trace-viewer)
