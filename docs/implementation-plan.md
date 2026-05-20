# Status And Roadmap

This file summarizes what exists today and what would come next, so a reviewer can quickly separate implemented behavior from future hardening.

## Implemented

- Local Appsmith Docker Compose target.
- npm TypeScript workspace.
- CLI for setup, signup, login, auth check, sync, invite, deprovision, API observation, and broken-selector demo.
- Zod schemas for config, normalized users, audit events, evidence bundles, and action plans.
- Evidence writer with run IDs, JSON artifacts, logs, screenshots, and trace paths.
- Secret and email redaction.
- Confirmation guard for destructive actions.
- OpenAI structured-output selector repair with Zod validation.
- Playwright fixture tests for user extraction and selector recovery.
- Playwright scenario scripts for auth, empty/populated app states, app creation, locator resilience, traces, network observation, and selector repair.

## Verification

```bash
npm run typecheck
npm test
npm run test:fixtures
```

Live local smoke path:

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
SCENARIO_HEADLESS=true npm run scenario:ensure-demo-app
SCENARIO_HEADLESS=true npm run scenario:network-observation
npm run appsmith:broken-selector-demo
```

## Known Limitations

- Appsmith CE may not expose all role/group/admin surfaces available in paid editions.
- Provision/deprovision commands are scaffolded conservatively and should be adapted to the exact Appsmith edition and SMTP setup.
- The project does not include a dashboard, database-backed run history, or remote artifact storage.
- The sandbox runner is intentionally not included yet.
- API replay is limited to owned-instance observation and should not be generalized to third-party private APIs.

## Next Iteration

- Add a small local dashboard for evidence review.
- Add a durable run store with SQLite or Postgres.
- Add a Mailpit/MailHog setup for invite-email flows.
- Add sandbox execution for browser workers.
- Add a second self-hosted SaaS target to prove the integration abstraction.
- Add CI that runs unit tests, fixture tests, and lint/typecheck.

## Production Hardening Checklist

- Use per-run isolated browser contexts.
- Rotate service-account credentials.
- Encrypt auth state at rest.
- Store evidence in an access-controlled artifact bucket.
- Add approval queues for destructive workflows.
- Add explicit rate limits and retry policies.
- Add structured OpenTelemetry spans for every automation step.
