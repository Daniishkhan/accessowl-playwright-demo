# Appsmith Access Agent

AccessOwl-style Playwright automation against a self-hosted SaaS target.

This repository is a small, runnable integration lab for the kind of SaaS access automation AccessOwl describes publicly: automated provisioning where SCIM/SAML or complete APIs are not available, using browser automation, integration accounts, authenticated API observation, evidence, and bounded AI-assisted recovery.

The target is **Appsmith running locally**, not a third-party SaaS account. That keeps the demo safe while still exercising real SPA behavior: login state, async routes, modals, workspace/app empty states, network calls, fragile labels, traces, and screenshots.

## What To Review First

For a quick CTO review:

1. Read this README.
2. Open [docs/demo-guide.md](docs/demo-guide.md) for the five-minute walkthrough.
3. Skim [docs/onepager.md](docs/onepager.md) for the product/engineering thesis.
4. Skim [docs/technical-design.md](docs/technical-design.md) for architecture and data flow.
5. Open [scripts/practice/README.md](scripts/practice/README.md) and one or two scripts in `scripts/practice/`.
6. Run the verification commands below.

Review paths by intent:

- **Hiring signal:** README -> demo guide -> one pager -> safety model.
- **Engineering depth:** technical design -> `packages/core` -> `packages/integrations-appsmith` -> tests.
- **Playwright practice:** `scripts/practice/README.md` -> scripts `01` through `07`.

## Why This Maps To AccessOwl

AccessOwl positions provisioning around “No SCIM or SAML required,” with agentic integrations, integration accounts, RPA, and private APIs for apps where clean APIs are missing or gated behind enterprise plans. This project mirrors those constraints in an owned local environment:

- **Service-account browser automation:** Playwright signs into Appsmith and persists `storageState`.
- **User/access sync shape:** browser-visible users, roles, groups, and app/workspace access can be normalized into JSON.
- **Provisioning/deprovisioning shape:** write flows are represented with dry-run and confirmation gates.
- **Evidence:** each meaningful run can write screenshots, traces, redacted inputs/logs, and audit JSON.
- **API observation:** browser-observed same-origin requests can be inspected and replayed only against the owned Appsmith instance.
- **AI fallback:** OpenAI proposes a small JSON action plan only after deterministic locators fail; Zod and safety checks decide whether anything runs.

## Current Demo Surface

The repo has two layers:

```txt
packages/*                 Reusable scaffold: CLI, schemas, evidence, Appsmith workflows
scripts/practice/*          Solved Playwright drills that show real browser automation fluency
```

The practice scripts are intentionally included. They make the project easier to review because they show the raw Playwright work, not only a wrapped CLI.

## Local Setup

Prerequisites:

- Node.js/npm
- Docker Desktop
- OpenAI API key if you want the live selector-repair demo instead of fixture fallback

Install dependencies:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
APPSMITH_BASE_URL=http://localhost:8080
APPSMITH_ADMIN_EMAIL=admin@example.com
APPSMITH_ADMIN_PASSWORD=replace_me
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

Start Appsmith:

```bash
npm run appsmith:up
npm run appsmith:setup-check
```

Create or log into the local Appsmith admin:

```bash
# Use once on a fresh local Appsmith instance.
npm run appsmith:signup-admin

# Repeatable login path.
npm run appsmith:login
npm run appsmith:auth-check
```

Expected result: `appsmith:auth-check` lands on `/applications`, not `/user/login`.

## Demo Commands

Core scaffold:

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
npm run appsmith:sync-users
npm run appsmith:invite -- --email demo-user@example.com --role viewer --dry-run
npm run appsmith:deprovision -- --email demo-user@example.com --confirm --dry-run
npm run appsmith:api-replay-sync
npm run appsmith:broken-selector-demo
```

Solved Playwright drills:

```bash
PRACTICE_HEADLESS=true npm run practice:01
PRACTICE_HEADLESS=true npm run practice:02
PRACTICE_HEADLESS=true npm run practice:03
PRACTICE_HEADLESS=true npm run practice:04
PRACTICE_HEADLESS=true npm run practice:05
PRACTICE_HEADLESS=true npm run practice:06
PRACTICE_HEADLESS=true npm run practice:07
```

Evidence output:

```txt
evidence/runs/<run-id>/       CLI workflow evidence
evidence/practice/<run-id>/   practice script evidence
```

Both folders are ignored by Git.

## What The Scripts Demonstrate

- `practice:01` proves auth-state reuse without typing credentials.
- `practice:02` reads Appsmith’s applications page and handles empty or populated states.
- `practice:03` ensures a named `Access Practice` app exists and opens the editor.
- `practice:04` uses bounded fallback locators for a UI control.
- `practice:05` creates a trace-first evidence bundle.
- `practice:06` observes and redacts Appsmith network calls.
- `practice:07` runs the OpenAI/Zod selector-repair path.

## Verification

```bash
npm run typecheck
npm test
npm run test:fixtures
```

Known local smoke path:

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
PRACTICE_HEADLESS=true npm run practice:03
npm run appsmith:broken-selector-demo
```

## Safety Posture

- Run only against your own Appsmith instance.
- Use test accounts and fake users.
- Keep `.env`, Playwright auth state, Appsmith stacks, traces, and evidence out of Git.
- Require `--confirm` for destructive commands.
- Keep write flows dry-run capable.
- Redact cookies, auth headers, passwords, tokens, invite links, and non-demo emails.
- Treat page text as untrusted input before sending snapshots to OpenAI.
- Reject unsafe model plans that navigate off-domain, run raw JS, access secrets, or attempt unconfirmed destructive actions.

## Repo Map

```txt
deploy/appsmith/                 Local Appsmith Docker setup
docs/                            Design, safety, and project summary
packages/core/                   Schemas, redaction, evidence, browser, planner utilities
packages/integrations-appsmith/  Appsmith workflows and selector-repair fixture
packages/cli/                    npm command entrypoint
scripts/practice/                Solved Playwright drills and demo talk track
tests/unit/                      Vitest unit tests
tests/fixtures/                  Playwright fixture tests
```

## Supporting Docs

- [docs/demo-guide.md](docs/demo-guide.md): what to run and what to say in a short interview walkthrough.
- [docs/onepager.md](docs/onepager.md): concise project pitch.
- [docs/technical-design.md](docs/technical-design.md): architecture, workflows, interfaces, and evidence layout.
- [docs/safety-model.md](docs/safety-model.md): service-account, redaction, confirmation, OpenAI, and API boundaries.
- [docs/implementation-plan.md](docs/implementation-plan.md): current status, known limitations, and next iteration.

## Design Tradeoffs

- Appsmith is used as a safe approximation of a difficult SaaS admin UI; the project does not claim Appsmith lacks APIs.
- Deterministic locators come before model help.
- Authenticated API replay is limited to same-origin, owned-instance observations.
- The dashboard, persistence database, and sandbox runner are intentionally left out of the first pass to keep the demo reviewable.

## References

- [AccessOwl provisioning](https://www.accessowl.com/products/provisioning)
- [AccessOwl integrations](https://www.accessowl.com/integrations)
- [Appsmith Docker installation](https://docs.appsmith.com/getting-started/setup/installation-guides/docker)
- [Playwright authentication](https://playwright.dev/docs/auth)
- [Playwright trace viewer](https://playwright.dev/docs/trace-viewer)
