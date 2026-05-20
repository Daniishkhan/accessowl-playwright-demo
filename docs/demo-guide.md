# Demo Guide

## Five-Minute Walkthrough

Start with the problem:

> Some SaaS apps do not expose complete SCIM/API access management. This repo demonstrates how I would build a safe, observable browser automation worker for those cases.

Then run:

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
```

Explain:

- Appsmith is the owned local target.
- Playwright persists service-account auth state.
- Login refuses to save state if auth fails.

Next:

```bash
PRACTICE_HEADLESS=true npm run practice:03
PRACTICE_HEADLESS=true npm run practice:06
```

Explain:

- `practice:03` opens or creates a named practice app.
- `practice:06` observes relevant Appsmith network calls and writes redacted JSON.
- Evidence lands under `evidence/practice/`.

Then:

```bash
npm run appsmith:broken-selector-demo
```

Explain:

- The deterministic selector intentionally fails.
- A redacted page snapshot is sent to OpenAI if configured.
- The returned JSON plan is validated with Zod and safety checks.
- Only allowlisted Playwright actions execute.

## What To Open In The Repo

- [scripts/practice/_lib.ts](../scripts/practice/_lib.ts): shared browser/session/evidence helpers.
- [scripts/practice/04-locator-resilience.ts](../scripts/practice/04-locator-resilience.ts): bounded deterministic locator fallback.
- [packages/core/src/openai-planner.ts](../packages/core/src/openai-planner.ts): OpenAI structured-output adapter.
- [packages/core/src/planner.ts](../packages/core/src/planner.ts): action-plan safety validation and execution.
- [packages/core/src/redaction.ts](../packages/core/src/redaction.ts): secret redaction.

## Talk Track

I would frame the project like this:

> This is not “AI clicks around.” It is deterministic Playwright automation with traceable evidence and a constrained model fallback. The model proposes a JSON action plan only after a locator fails; the runner validates that plan and still owns execution.

## If Something Fails During The Demo

- Open the latest `evidence/runs/<run-id>/trace.zip`.
- Open screenshots under `evidence/runs/<run-id>/screenshots/`.
- Check whether auth redirected to `/user/login`.
- Re-run `npm run appsmith:auth-check`.
- If Appsmith changed the UI, show `practice:04` as the deterministic fallback pattern.
