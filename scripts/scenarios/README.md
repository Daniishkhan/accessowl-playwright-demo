# Scenario Scripts

These scripts exercise the local Appsmith target as a SaaS-like integration surface. They are small on purpose: each one focuses on one browser automation behavior and writes evidence that can be inspected after the run.

Run one script directly:

```bash
npx tsx scripts/scenarios/01-auth-check.ts
```

Run through npm:

```bash
SCENARIO_HEADLESS=true npm run scenario:auth-check
SCENARIO_HEADLESS=true npm run scenario:ensure-demo-app
SCENARIO_HEADLESS=true npm run scenario:network-observation
```

## What Each Scenario Shows

| Script | Command | Purpose |
| --- | --- | --- |
| `01-auth-check.ts` | `npm run scenario:auth-check` | Reuses the saved Playwright auth state and proves the browser can enter Appsmith without typing credentials again. |
| `02-applications-page.ts` | `npm run scenario:applications` | Handles the Appsmith applications page in either empty or populated states. |
| `03-ensure-demo-app.ts` | `npm run scenario:ensure-demo-app` | Creates a small local Appsmith app when needed so later scenarios have something real to inspect. |
| `04-locator-resilience.ts` | `npm run scenario:locator-resilience` | Demonstrates locator strategy: prefer roles/text/test ids, then fall back carefully when the UI shifts. |
| `05-traces-and-evidence.ts` | `npm run scenario:evidence` | Captures screenshot, JSON state, logs, and trace metadata for a browser run. |
| `06-network-observation.ts` | `npm run scenario:network-observation` | Records redacted same-origin network calls after authenticated navigation. |
| `07-selector-repair-openai.ts` | `npm run scenario:selector-repair` | Uses OpenAI only after deterministic locator failure, then runs only schema-valid allowlisted actions. |

Artifacts are written under `evidence/scenarios/`, which is ignored by Git.
